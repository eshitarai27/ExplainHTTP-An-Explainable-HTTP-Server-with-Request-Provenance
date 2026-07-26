"""Per-connection socket I/O.

This is the only module that touches a live client socket. It reads raw
bytes off the wire, frames them into an HTTP/1.1 request (handling
Content-Length and chunked bodies, plus keep-alive for multiple requests per
connection), hands the parsed request to the application pipeline, and
writes the resulting response back as raw bytes.

Every stage records a :class:`~tracing.trace.TraceEvent`: ``Connection
Accepted`` -> ``HTTP Parsed`` -> (application pipeline stages) -> ``Socket
Sent``.
"""
from __future__ import annotations

import socket
from typing import Optional, Tuple

from .parser import HTTPParseError, decode_chunked, parse_request_head, split_target
from .request import Request
from .response import Response
from tracing.trace import Trace, TraceRecorder, new_trace_id

MAX_HEADER_BYTES = 64 * 1024
RECV_CHUNK = 65536
CHUNKED_TERMINATOR = b"0\r\n\r\n"


class Connection:
    """Handles the full lifecycle of one accepted TCP connection, including
    HTTP/1.1 keep-alive (multiple requests per connection)."""

    def __init__(self, sock: socket.socket, addr: Tuple[str, int], app, timeout: float = 30.0) -> None:
        self.sock = sock
        self.addr = addr
        self.app = app
        self._buffer = b""
        sock.settimeout(timeout)

    def serve(self) -> None:
        """Read and dispatch requests until the connection closes."""
        self.app.metrics.connection_opened()
        try:
            while True:
                # On a keep-alive connection the client may sit idle between
                # requests for an arbitrary amount of time (e.g. a dashboard
                # polling every few seconds). That wait is untimed and
                # attributed to no trace -- it belongs to the client, not to
                # request handling -- so a trace is only created once the
                # next request has actually started arriving.
                if not self._await_next_request():
                    break

                trace = Trace(trace_id=new_trace_id())
                try:
                    request = self._read_request(trace)
                except HTTPParseError as exc:
                    response = Response.json({"error": f"Bad Request: {exc}", "status": 400}, 400)
                    self._send_response(response, "HTTP/1.1", trace)
                    trace.finish()
                    self.app.trace_store.add(trace)
                    break

                if request is None:
                    break

                response = self.app.handle_request(request, trace)
                self._send_response(response, request.http_version, trace)
                trace.finish()
                self.app.trace_store.add(trace)

                if not request.keep_alive():
                    break
        except (ConnectionResetError, ConnectionAbortedError, socket.timeout, OSError):
            pass
        finally:
            self.app.metrics.connection_closed()
            self.sock.close()

    # -- wire framing ----------------------------------------------------------
    def _await_next_request(self) -> bool:
        """Block, untimed, until either pipelined bytes are already buffered
        or the client sends more data. Returns False once the client has
        closed the connection."""
        if self._buffer:
            return True
        chunk = self.sock.recv(RECV_CHUNK)
        if not chunk:
            return False
        self._buffer += chunk
        return True

    def _recv_until(self, marker: bytes) -> Optional[bytes]:
        while marker not in self._buffer:
            chunk = self.sock.recv(RECV_CHUNK)
            if not chunk:
                return None
            self._buffer += chunk
            if len(self._buffer) > MAX_HEADER_BYTES:
                raise HTTPParseError("Request header too large")
        head, _, rest = self._buffer.partition(marker)
        self._buffer = rest
        return head

    def _read_body(self, headers: dict) -> bytes:
        transfer_encoding = headers.get("transfer-encoding", "").lower()
        if transfer_encoding == "chunked":
            while CHUNKED_TERMINATOR not in self._buffer:
                chunk = self.sock.recv(RECV_CHUNK)
                if not chunk:
                    break
                self._buffer += chunk
            end = self._buffer.find(CHUNKED_TERMINATOR)
            if end == -1:
                raise HTTPParseError("Truncated chunked body")
            end += len(CHUNKED_TERMINATOR)
            raw_chunked, self._buffer = self._buffer[:end], self._buffer[end:]
            return decode_chunked(raw_chunked)

        content_length = int(headers.get("content-length", "0") or 0)
        while len(self._buffer) < content_length:
            chunk = self.sock.recv(RECV_CHUNK)
            if not chunk:
                break
            self._buffer += chunk
        body, self._buffer = self._buffer[:content_length], self._buffer[content_length:]
        return body

    def _read_request(self, trace: Trace) -> Optional[Request]:
        client = f"{self.addr[0]}:{self.addr[1]}"

        with TraceRecorder(trace, "Connection", "accept_request", client=client) as rec:
            head = self._recv_until(b"\r\n\r\n")
            if head is None:
                rec.metadata["closed"] = True
                return None

        with TraceRecorder(trace, "Parser", "parse_request") as rec:
            method, target, version, headers = parse_request_head(head)
            path, query = split_target(target)
            rec.metadata["method"] = method
            rec.metadata["path"] = path

        body = self._read_body(headers)

        request = Request(
            method=method,
            path=path,
            http_version=version,
            headers=headers,
            body=body,
            query_params=query,
            client_addr=client,
            trace_id=trace.trace_id,
        )
        trace.request_summary = request.summary()
        return request

    def _send_response(self, response: Response, http_version: str, trace: Trace) -> None:
        response.headers["X-Trace-ID"] = trace.trace_id
        with TraceRecorder(trace, "Socket", "send_response") as rec:
            data = response.to_bytes(http_version)
            self.sock.sendall(data)
            rec.metadata["bytes_sent"] = len(data)
        trace.response_summary = {
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "body_size": len(response.body),
        }
