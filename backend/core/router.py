"""Route registration and matching, including dynamic path segments.

Routes are declared with ``<name>`` placeholders, e.g. ``/trace/<trace_id>``
or ``/users/<id>``. Each placeholder matches a single non-empty path segment
(no slashes) and is exposed to the handler via ``Request.path_params``.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Tuple

from .request import Request
from .response import Response

Handler = Callable[[Request], Response]

_PARAM_RE = re.compile(r"<([a-zA-Z_][a-zA-Z0-9_]*)>")


def _compile_path(path: str) -> re.Pattern:
    """Turn a route pattern like ``/users/<id>`` into a matching regex."""
    pattern_parts = []
    last = 0
    for match in _PARAM_RE.finditer(path):
        pattern_parts.append(re.escape(path[last : match.start()]))
        pattern_parts.append(f"(?P<{match.group(1)}>[^/]+)")
        last = match.end()
    pattern_parts.append(re.escape(path[last:]))
    return re.compile("^" + "".join(pattern_parts) + "$")


@dataclass
class Route:
    method: str
    path: str
    handler: Handler
    name: Optional[str] = None
    pattern: re.Pattern = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.pattern is None:
            self.pattern = _compile_path(self.path)


class Router:
    """Registers routes and resolves incoming (method, path) pairs to handlers."""

    def __init__(self) -> None:
        self._routes: List[Route] = []

    def add_route(self, method: str, path: str, handler: Handler, name: Optional[str] = None) -> None:
        self._routes.append(Route(method.upper(), path, handler, name))

    def get(self, path: str, name: Optional[str] = None):
        def decorator(handler: Handler) -> Handler:
            self.add_route("GET", path, handler, name)
            return handler

        return decorator

    def post(self, path: str, name: Optional[str] = None):
        def decorator(handler: Handler) -> Handler:
            self.add_route("POST", path, handler, name)
            return handler

        return decorator

    def route(self, path: str, methods: List[str], name: Optional[str] = None):
        def decorator(handler: Handler) -> Handler:
            for method in methods:
                self.add_route(method, path, handler, name)
            return handler

        return decorator

    def match(self, method: str, path: str) -> Tuple[Optional[Route], Dict[str, str], bool]:
        """Resolve a route.

        Returns ``(route, path_params, path_matched_other_method)``. If no
        route matches the path at all, ``route`` is ``None`` and the third
        element is ``False`` (a 404). If the path matches but not for this
        method, ``route`` is ``None`` and the third element is ``True`` (a 405).
        """
        path_matched = False
        for candidate in self._routes:
            m = candidate.pattern.match(path)
            if not m:
                continue
            path_matched = True
            if candidate.method == method.upper():
                return candidate, m.groupdict(), False
        return None, {}, path_matched

    def allowed_methods(self, path: str) -> List[str]:
        return sorted({r.method for r in self._routes if r.pattern.match(path)})

    @property
    def routes(self) -> List[Route]:
        return list(self._routes)
