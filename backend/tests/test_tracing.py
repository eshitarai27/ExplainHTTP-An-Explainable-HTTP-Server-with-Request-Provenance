"""Unit tests for the execution trace engine: Trace, TraceRecorder, TraceStore,
and the graph builder that turns a Trace into an execution graph."""
from __future__ import annotations

import pytest

from graph.graph_builder import build_graph
from tracing.trace import Trace, TraceRecorder, new_trace_id
from tracing.trace_store import TraceStore


def test_new_trace_id_is_unique():
    assert new_trace_id() != new_trace_id()


def test_trace_recorder_appends_event_with_duration_and_status():
    trace = Trace(trace_id="t1")
    with TraceRecorder(trace, "Parser", "parse_request", foo="bar"):
        pass

    assert len(trace.events) == 1
    event = trace.events[0]
    assert event.component == "Parser"
    assert event.action == "parse_request"
    assert event.status == "ok"
    assert event.duration_ms >= 0
    assert event.metadata == {"foo": "bar"}


def test_trace_recorder_marks_error_status_without_raising():
    trace = Trace(trace_id="t2")
    with TraceRecorder(trace, "Router", "match_route") as rec:
        rec.fail("not_found")

    assert trace.events[0].status == "error"
    assert trace.events[0].metadata["error"] == "not_found"


def test_trace_recorder_records_error_on_exception_and_reraises():
    trace = Trace(trace_id="t3")
    with pytest.raises(ValueError):
        with TraceRecorder(trace, "Handler", "execute_handler"):
            raise ValueError("boom")

    assert trace.events[0].status == "error"
    assert "boom" in trace.events[0].metadata["error"]


def test_trace_performance_breakdown_by_component():
    trace = Trace(trace_id="t4")
    with TraceRecorder(trace, "Parser", "parse_request"):
        pass
    with TraceRecorder(trace, "Parser", "parse_body"):
        pass
    with TraceRecorder(trace, "Router", "match_route"):
        pass

    perf = trace.performance()
    assert set(perf["by_component_ms"].keys()) == {"Parser", "Router"}


def test_trace_store_evicts_oldest_beyond_capacity():
    store = TraceStore(max_traces=2)
    for i in range(3):
        store.add(Trace(trace_id=f"trace-{i}"))

    assert len(store) == 2
    assert store.get("trace-0") is None
    assert store.get("trace-1") is not None
    assert store.get("trace-2") is not None


def test_trace_store_list_recent_returns_newest_first():
    store = TraceStore(max_traces=10)
    for i in range(3):
        store.add(Trace(trace_id=f"trace-{i}"))

    recent = store.list_recent(limit=10)
    assert [t.trace_id for t in recent] == ["trace-2", "trace-1", "trace-0"]


def test_build_graph_produces_request_node_plus_one_node_per_event():
    trace = Trace(trace_id="t5")
    with TraceRecorder(trace, "Connection", "accept_request"):
        pass
    with TraceRecorder(trace, "Parser", "parse_request"):
        pass

    graph = build_graph(trace)
    assert len(graph.nodes) == 3  # Request + Connection + Parser
    assert graph.nodes[0].type == "Request"
    assert len(graph.edges) == 2
    assert graph.edges[0].relationship == "ACCEPTED_BY"
    assert graph.edges[1].relationship == "PARSED_BY"


def test_build_graph_labels_middleware_nodes_with_their_name():
    trace = Trace(trace_id="t6")
    with TraceRecorder(trace, "Middleware:cors_middleware", "execute_middleware"):
        pass

    graph = build_graph(trace)
    middleware_node = graph.nodes[1]
    assert middleware_node.type == "Middleware"
    assert middleware_node.label == "Middleware:cors_middleware"
