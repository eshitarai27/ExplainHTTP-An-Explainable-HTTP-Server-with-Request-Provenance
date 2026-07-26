"""API endpoints for exploring execution traces, execution graphs, runtime
metrics, and structured logs -- the "explainability" surface of the server."""
from __future__ import annotations

from core.request import Request
from core.response import Response
from graph.exporters import to_cypher, to_dot, to_json
from graph.graph_builder import build_graph
from logger.log_store import get_recent_logs


def make_get_trace_handler(app):
    def handler(request: Request) -> Response:
        trace_id = request.path_params.get("trace_id", "")
        trace = app.trace_store.get(trace_id)
        if trace is None:
            return Response.not_found(f"No trace found for id {trace_id}")
        graph = build_graph(trace)
        return Response.json(
            {
                "trace_id": trace.trace_id,
                "timeline": trace.timeline(),
                "performance": trace.performance(),
                "execution_graph": graph.to_dict(),
                "events": [e.to_dict() for e in trace.events],
                "request": trace.request_summary,
                "response": trace.response_summary,
            }
        )

    return handler


def make_list_traces_handler(app):
    def handler(request: Request) -> Response:
        limit = int(request.query("limit", "50"))
        traces = app.trace_store.list_recent(limit=limit)
        return Response.json(
            {
                "count": len(traces),
                "traces": [
                    {
                        "trace_id": t.trace_id,
                        "started_at": t.started_at,
                        "total_duration_ms": round(t.total_duration_ms, 4),
                        "request": t.request_summary,
                        "response": t.response_summary,
                    }
                    for t in traces
                ],
            }
        )

    return handler


def make_graph_export_handler(app, fmt: str):
    content_types = {"json": None, "dot": "text/vnd.graphviz", "cypher": "text/plain"}

    def handler(request: Request) -> Response:
        trace_id = request.path_params.get("trace_id", "")
        trace = app.trace_store.get(trace_id)
        if trace is None:
            return Response.not_found(f"No trace found for id {trace_id}")
        graph = build_graph(trace)
        if fmt == "json":
            return Response.json(to_json(graph))
        if fmt == "dot":
            return Response.text(to_dot(graph), content_type=content_types["dot"])
        if fmt == "cypher":
            return Response.text(to_cypher(graph), content_type=content_types["cypher"])
        return Response.not_found("Unknown export format")

    return handler


def make_metrics_handler(app):
    def handler(request: Request) -> Response:
        return Response.json(app.metrics.snapshot())

    return handler


def make_logs_handler(app):
    def handler(request: Request) -> Response:
        limit = int(request.query("limit", "200"))
        return Response.json({"logs": get_recent_logs(limit)})

    return handler
