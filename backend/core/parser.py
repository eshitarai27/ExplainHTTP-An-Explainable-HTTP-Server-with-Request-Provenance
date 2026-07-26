"""HTTP/1.1 request parsing.

This module is intentionally decoupled from socket I/O: it only knows how to
turn already-read bytes into structured data. Reading bytes off the wire
(including framing decisions like "how many more bytes do I need") lives in
``core.connection``, which is the only place that touches a live socket.
"""
from __future__ import annotations

from typing import Dict, List, Tuple
from urllib.parse import parse_qs, urlsplit

SUPPORTED_VERSIONS = ("HTTP/1.0", "HTTP/1.1")


class HTTPParseError(Exception):
    """Raised when the raw bytes do not form a well-formed HTTP/1.1 message."""


def parse_request_head(head: bytes) -> Tuple[str, str, str, Dict[str, str]]:
    """Parse the request-line and headers block (the bytes before ``\\r\\n\\r\\n``).

    Returns ``(method, target, http_version, headers)`` where ``headers`` keys
    are lower-cased for case-insensitive lookup.
    """
    try:
        text = head.decode("iso-8859-1")
    except UnicodeDecodeError as exc:
        raise HTTPParseError("Request head contains invalid encoding") from exc

    lines = text.split("\r\n")
    if not lines or not lines[0]:
        raise HTTPParseError("Empty request line")

    request_line = lines[0]
    parts = request_line.split(" ")
    if len(parts) != 3:
        raise HTTPParseError(f"Malformed request line: {request_line!r}")

    method, target, http_version = parts
    if http_version not in SUPPORTED_VERSIONS:
        raise HTTPParseError(f"Unsupported HTTP version: {http_version!r}")
    if not method.isalpha():
        raise HTTPParseError(f"Malformed method: {method!r}")

    headers: Dict[str, str] = {}
    for line in lines[1:]:
        if not line:
            continue
        if ":" not in line:
            raise HTTPParseError(f"Malformed header line: {line!r}")
        key, _, value = line.partition(":")
        key = key.strip()
        if not key:
            raise HTTPParseError(f"Malformed header line: {line!r}")
        headers[key.lower()] = value.strip()

    return method.upper(), target, http_version, headers


def split_target(target: str) -> Tuple[str, Dict[str, List[str]]]:
    """Split a request target into its path and parsed query-string parameters."""
    split = urlsplit(target)
    path = split.path or "/"
    query = parse_qs(split.query, keep_blank_values=True)
    return path, query


def decode_chunked(data: bytes) -> bytes:
    """Decode an HTTP/1.1 ``Transfer-Encoding: chunked`` body.

    ``data`` must contain the complete chunked stream, terminated by the
    zero-length final chunk (``0\\r\\n\\r\\n``).
    """
    body = bytearray()
    idx = 0
    while True:
        line_end = data.index(b"\r\n", idx)
        size_str = data[idx:line_end].split(b";")[0].strip()
        try:
            size = int(size_str, 16)
        except ValueError as exc:
            raise HTTPParseError(f"Invalid chunk size: {size_str!r}") from exc
        idx = line_end + 2
        if size == 0:
            break
        body += data[idx : idx + size]
        idx += size + 2
    return bytes(body)
