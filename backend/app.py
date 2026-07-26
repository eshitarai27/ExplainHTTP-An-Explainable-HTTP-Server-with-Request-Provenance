"""Wires the router, middleware chain, hooks, tracing, metrics, and logging
into a single request-handling pipeline.

:class:`Application` is the one object every route handler, middleware, and
hook is registered against, and the object the socket layer dispatches
parsed requests into. Splitting this out from ``core.connection`` keeps
socket I/O and pipeline orchestration independently testable.
"""
from __future__ import annotations

from typing import List, Optional

from core.hooks import HookManager
from core.middleware import Middleware, MiddlewareChain
from core.request import Request
from core.response import Response
from core.router import Router
from logger.logger import get_logger, log_event
from metrics.metrics import Metrics
from tracing.trace import Trace, TraceRecorder
from tracing.trace_store import TraceStore


class Application:
    def __init__(self, max_traces: int = 500, log_level: str = "INFO") -> None:
        self.router = Router()
        self.middleware_chain = MiddlewareChain()
        self.hooks = HookManager()
        self.trace_store = TraceStore(max_traces=max_traces)
        self.metrics = Metrics()
        self.logger = get_logger("explainhttp", log_level)

    # -- registration convenience, delegating to the router/middleware chain --
    def get(self, path: str, name: Optional[str] = None):
        return self.router.get(path, name)

    def post(self, path: str, name: Optional[str] = None):
        return self.router.post(path, name)

    def route(self, path: str, methods: List[str], name: Optional[str] = None):
        return self.router.route(path, methods, name)

    def use(self, middleware: Middleware) -> None:
        self.middleware_chain.use(middleware)

    # -- the pipeline ------------------------------------------------------------
    def handle_request(self, request: Request, trace: Trace) -> Response:
        """Run a parsed request through routing, middleware, and the matched
        handler, recording a trace event at every stage."""
        self.hooks.fire("before_request", request=request, trace=trace)

        route = None
        with TraceRecorder(trace, "Router", "match_route", path=request.path, method=request.method) as rec:
            route, path_params, path_matches_other_method = self.router.match(request.method, request.path)
            if route is None:
                if path_matches_other_method:
                    rec.fail("method_not_allowed")
                    response = Response.method_not_allowed(self.router.allowed_methods(request.path))
                else:
                    rec.fail("not_found")
                    response = Response.not_found(f"No route matches {request.path}")
            else:
                rec.metadata["route"] = route.name or route.path
                request.path_params = path_params

        if route is not None:
            try:
                response = self._run_pipeline(route, request, trace)
            except Exception as exc:  # noqa: BLE001 - never let a handler crash the connection
                self.logger.error(
                    "Unhandled exception in handler",
                    extra={"trace_id": trace.trace_id, "fields": {"error": str(exc)}},
                )
                response = Response.server_error(str(exc))

        with TraceRecorder(trace, "Response", "build_response", status_code=response.status_code):
            pass  # marks the pipeline stage boundary; the response was assembled above

        self.hooks.fire("before_response", request=request, response=response, trace=trace)
        self.hooks.fire("after_request", request=request, response=response, trace=trace)

        route_label = (route.name or route.path) if route is not None else request.path
        self.metrics.record_request(
            route=route_label,
            status_code=response.status_code,
            duration_ms=trace.total_duration_ms,
        )
        log_event(
            self.logger,
            f"{request.method} {request.path} -> {response.status_code}",
            trace_id=trace.trace_id,
            method=request.method,
            path=request.path,
            status=response.status_code,
        )
        return response

    def _run_pipeline(self, route, request: Request, trace: Trace) -> Response:
        def terminal(req: Request) -> Response:
            self.hooks.fire("before_handler", request=req, trace=trace)
            with TraceRecorder(trace, "Handler", "execute_handler", route=route.name or route.path) as rec:
                try:
                    result = route.handler(req)
                except Exception as exc:
                    rec.fail(str(exc))
                    self.hooks.fire("after_handler", request=req, trace=trace, error=exc)
                    raise
            self.hooks.fire("after_handler", request=req, trace=trace, response=result)
            return result

        chain = terminal
        for middleware in reversed(self.middleware_chain.middlewares):
            chain = self._wrap_middleware(middleware, chain, trace)

        return chain(request)

    def _wrap_middleware(self, middleware: Middleware, next_fn, trace: Trace):
        name = getattr(middleware, "__name__", "middleware")

        def wrapped(request: Request) -> Response:
            with TraceRecorder(trace, f"Middleware:{name}", "execute_middleware") as rec:
                try:
                    return middleware(request, next_fn)
                except Exception as exc:
                    rec.fail(str(exc))
                    raise

        return wrapped
