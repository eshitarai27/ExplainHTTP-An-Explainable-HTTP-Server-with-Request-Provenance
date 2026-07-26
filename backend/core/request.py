"""The parsed HTTP request model passed through the pipeline."""
from __future__ import annotations

import json as json_module
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class Request:
    """A fully parsed HTTP/1.1 request."""

    method: str
    path: str
    http_version: str
    headers: Dict[str, str]
    body: bytes
    query_params: Dict[str, List[str]]
    client_addr: str
    trace_id: str = ""
    path_params: Dict[str, str] = field(default_factory=dict)

    def header(self, name: str, default: Optional[str] = None) -> Optional[str]:
        """Case-insensitive header lookup."""
        return self.headers.get(name.lower(), default)

    def query(self, name: str, default: Optional[str] = None) -> Optional[str]:
        """First value of a query-string parameter, or ``default``."""
        values = self.query_params.get(name)
        return values[0] if values else default

    def json(self) -> Any:
        """Parse the request body as JSON. Returns ``None`` for an empty body."""
        if not self.body:
            return None
        return json_module.loads(self.body.decode("utf-8"))

    def text(self) -> str:
        return self.body.decode("utf-8", errors="replace")

    @property
    def content_length(self) -> int:
        return int(self.headers.get("content-length", "0") or 0)

    @property
    def content_type(self) -> Optional[str]:
        return self.headers.get("content-type")

    def keep_alive(self) -> bool:
        """Whether the connection should remain open per HTTP/1.1 semantics."""
        connection = (self.header("connection") or "").lower()
        if self.http_version == "HTTP/1.1":
            return connection != "close"
        return connection == "keep-alive"

    def summary(self) -> Dict[str, Any]:
        """A compact, JSON-serializable summary used in trace records."""
        return {
            "method": self.method,
            "path": self.path,
            "http_version": self.http_version,
            "query_params": self.query_params,
            "client_addr": self.client_addr,
            "content_length": self.content_length,
            "headers": self.headers,
        }
