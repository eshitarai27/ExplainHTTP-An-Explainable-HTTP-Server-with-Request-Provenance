"""Static file serving with path-traversal protection and MIME type
detection via the standard library ``mimetypes`` module."""
from __future__ import annotations

import mimetypes
from pathlib import Path

from core.request import Request
from core.response import Response


def make_static_handler(static_dir: Path):
    """Build a handler for ``GET /static/<path>`` that serves files rooted
    at ``static_dir``, resolving symlinks/`..` and refusing to escape it."""
    root = static_dir.resolve()

    def handler(request: Request) -> Response:
        rel_path = request.path_params.get("path", "")
        candidate = (root / rel_path).resolve()

        if root not in candidate.parents and candidate != root:
            return Response.not_found("File not found")

        if not candidate.is_file():
            return Response.not_found("File not found")

        content_type, _ = mimetypes.guess_type(str(candidate))
        data = candidate.read_bytes()
        return Response.bytes(data, content_type=content_type or "application/octet-stream")

    return handler
