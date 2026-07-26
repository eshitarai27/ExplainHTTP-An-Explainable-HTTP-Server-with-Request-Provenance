"""The middleware pipeline: an ordered chain-of-responsibility around the
route handler.

Middleware differs from the :mod:`core.hooks` extension points: middleware is
user-facing, application-level behavior (logging, CORS, auth, compression),
declared explicitly by the app author and executed in a fixed order for
every request. Hooks are lower-level lifecycle taps intended for
infrastructure-style extensions.
"""
from __future__ import annotations

from typing import Callable, List

from .request import Request
from .response import Response

Handler = Callable[[Request], Response]
NextFn = Callable[[Request], Response]
Middleware = Callable[[Request, NextFn], Response]


class MiddlewareChain:
    """Composes an ordered list of middleware around a terminal handler."""

    def __init__(self) -> None:
        self._middlewares: List[Middleware] = []

    def use(self, middleware: Middleware) -> None:
        """Register a middleware. Middlewares run in registration order,
        each wrapping the next, with the route handler as the innermost call."""
        self._middlewares.append(middleware)

    def build(self, handler: Handler) -> NextFn:
        """Wrap ``handler`` with every registered middleware, outermost first."""
        chain: NextFn = handler
        for middleware in reversed(self._middlewares):
            chain = _bind(middleware, chain)
        return chain

    @property
    def middlewares(self) -> List[Middleware]:
        return list(self._middlewares)


def _bind(middleware: Middleware, next_fn: NextFn) -> NextFn:
    def wrapped(request: Request) -> Response:
        return middleware(request, next_fn)

    return wrapped


# -- built-in middleware -------------------------------------------------------

def cors_middleware(origin: str = "*") -> Middleware:
    """Adds permissive CORS headers so the dashboard frontend can call the API
    from a different origin during local development."""

    def middleware(request: Request, call_next: NextFn) -> Response:
        response = call_next(request)
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response

    middleware.__name__ = "cors_middleware"
    return middleware


def compression_middleware() -> Middleware:
    """Gzip-encodes the response body when the client advertises support."""

    def middleware(request: Request, call_next: NextFn) -> Response:
        response = call_next(request)
        response.maybe_compress(request.header("accept-encoding", ""))
        return response

    middleware.__name__ = "compression_middleware"
    return middleware
