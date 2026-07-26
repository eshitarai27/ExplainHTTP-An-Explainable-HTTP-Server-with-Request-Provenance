"""HTTP/1.1 response model and wire-format builder."""
from __future__ import annotations

import gzip
import json as json_module
from datetime import datetime, timezone
from typing import Any, Dict, Optional

STATUS_REASONS: Dict[int, str] = {
    200: "OK",
    201: "Created",
    204: "No Content",
    301: "Moved Permanently",
    302: "Found",
    304: "Not Modified",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    408: "Request Timeout",
    413: "Payload Too Large",
    415: "Unsupported Media Type",
    500: "Internal Server Error",
    501: "Not Implemented",
    503: "Service Unavailable",
}

SERVER_NAME = "ExplainHTTP/1.0"
# Body sizes below this are not worth the CPU cost of gzip compression.
GZIP_MIN_BYTES = 512


class Response:
    """A mutable HTTP response, built up by handlers/middleware and finally
    serialized to raw bytes by the connection layer."""

    def __init__(
        self,
        status_code: int = 200,
        headers: Optional[Dict[str, str]] = None,
        body: bytes = b"",
    ) -> None:
        self.status_code = status_code
        self.headers: Dict[str, str] = headers or {}
        self.body = body

    # -- construction helpers -------------------------------------------------
    @classmethod
    def text(cls, text: str, status_code: int = 200, content_type: str = "text/plain") -> "Response":
        return cls(status_code, {"Content-Type": f"{content_type}; charset=utf-8"}, text.encode("utf-8"))

    @classmethod
    def html(cls, html: str, status_code: int = 200) -> "Response":
        return cls.text(html, status_code, content_type="text/html")

    @classmethod
    def json(cls, data: Any, status_code: int = 200) -> "Response":
        body = json_module.dumps(data, default=str).encode("utf-8")
        return cls(status_code, {"Content-Type": "application/json"}, body)

    @classmethod
    def bytes(cls, data: bytes, status_code: int = 200, content_type: str = "application/octet-stream") -> "Response":
        return cls(status_code, {"Content-Type": content_type}, data)

    @classmethod
    def not_found(cls, message: str = "Not Found") -> "Response":
        return cls.json({"error": message, "status": 404}, 404)

    @classmethod
    def method_not_allowed(cls, allowed: list) -> "Response":
        resp = cls.json({"error": "Method Not Allowed", "status": 405}, 405)
        resp.headers["Allow"] = ", ".join(allowed)
        return resp

    @classmethod
    def server_error(cls, message: str = "Internal Server Error") -> "Response":
        return cls.json({"error": message, "status": 500}, 500)

    # -- serialization ---------------------------------------------------------
    def maybe_compress(self, accept_encoding: str) -> None:
        """Gzip the body in place if the client supports it and it's worth it."""
        if "gzip" not in (accept_encoding or ""):
            return
        if len(self.body) < GZIP_MIN_BYTES or "Content-Encoding" in self.headers:
            return
        self.body = gzip.compress(self.body)
        self.headers["Content-Encoding"] = "gzip"

    def to_bytes(self, http_version: str = "HTTP/1.1") -> bytes:
        """Serialize this response into a full HTTP/1.1 wire message."""
        reason = STATUS_REASONS.get(self.status_code, "")
        status_line = f"{http_version} {self.status_code} {reason}".rstrip()

        headers = dict(self.headers)
        headers.setdefault("Content-Length", str(len(self.body)))
        headers.setdefault("Server", SERVER_NAME)
        headers.setdefault("Date", datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT"))

        header_lines = "\r\n".join(f"{k}: {v}" for k, v in headers.items())
        head = f"{status_line}\r\n{header_lines}\r\n\r\n".encode("iso-8859-1")
        return head + self.body
