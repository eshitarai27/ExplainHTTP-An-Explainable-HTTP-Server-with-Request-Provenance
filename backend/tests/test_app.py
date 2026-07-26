"""Integration tests for Application.handle_request: the full pipeline
(routing, middleware, handler execution, hooks, tracing) without any socket
I/O involved."""
from __future__ import annotations

from app import Application
from core.request import Request
from core.response import Response
from tracing.trace import Trace


def make_request(method="GET", path="/", path_params=None) -> Request:
    return Request(
        method=method,
        path=path,
        http_version="HTTP/1.1",
        headers={},
        body=b"",
        query_params={},
        client_addr="127.0.0.1:0",
        path_params=path_params or {},
    )


def test_handle_request_returns_200_and_records_full_pipeline_trace():
    app = Application()
    app.get("/ping")(lambda request: Response.text("pong"))

    trace = Trace(trace_id="test-trace")
    response = app.handle_request(make_request(path="/ping"), trace)

    assert response.status_code == 200
    assert response.body == b"pong"
    components = [e.component for e in trace.events]
    assert "Router" in components
    assert "Handler" in components
    assert "Response" in components


def test_handle_request_returns_404_for_unknown_route():
    app = Application()
    trace = Trace(trace_id="test-trace-404")
    response = app.handle_request(make_request(path="/unknown"), trace)
    assert response.status_code == 404


def test_handle_request_returns_405_for_wrong_method():
    app = Application()
    app.post("/echo")(lambda request: Response.text("ok"))
    trace = Trace(trace_id="test-trace-405")
    response = app.handle_request(make_request(method="GET", path="/echo"), trace)
    assert response.status_code == 405
    assert "POST" in response.headers["Allow"]


def test_handle_request_converts_handler_exception_to_500():
    app = Application()

    def boom(request):
        raise RuntimeError("kaboom")

    app.get("/boom")(boom)
    trace = Trace(trace_id="test-trace-error")
    response = app.handle_request(make_request(path="/boom"), trace)
    assert response.status_code == 500
    error_events = [e for e in trace.events if e.status == "error"]
    assert len(error_events) >= 1


def test_hooks_fire_in_order_around_handler_execution():
    app = Application()
    app.get("/ping")(lambda request: Response.text("pong"))

    fired = []
    for hook_name in ("before_request", "before_handler", "after_handler", "before_response", "after_request"):
        app.hooks.register(hook_name, lambda hook_name=hook_name, **kwargs: fired.append(hook_name))

    trace = Trace(trace_id="test-trace-hooks")
    app.handle_request(make_request(path="/ping"), trace)

    assert fired == ["before_request", "before_handler", "after_handler", "before_response", "after_request"]


def test_metrics_are_recorded_after_handling_a_request():
    app = Application()
    app.get("/ping")(lambda request: Response.text("pong"))
    app.handle_request(make_request(path="/ping"), Trace(trace_id="m1"))

    snapshot = app.metrics.snapshot()
    assert snapshot["total_requests"] == 1
    assert snapshot["status_counts"][200] == 1
