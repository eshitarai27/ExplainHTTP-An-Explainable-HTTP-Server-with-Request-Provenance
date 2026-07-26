"""Core data structures for the execution trace engine.

Every request handled by ExplainHTTP is assigned a trace ID. As the request
moves through the pipeline (connection accept, parsing, routing, middleware,
handler execution, response building, socket send) each stage records a
:class:`TraceEvent` onto the request's :class:`Trace`. The full trace is kept
in memory and exposed over the Trace API for inspection and visualization.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


def new_trace_id() -> str:
    """Generate a new unique trace identifier."""
    return uuid.uuid4().hex


@dataclass
class TraceEvent:
    """A single timestamped step in a request's execution timeline."""

    component: str
    action: str
    timestamp: float
    duration_ms: float
    status: str = "ok"
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "component": self.component,
            "action": self.action,
            "timestamp": self.timestamp,
            "duration_ms": round(self.duration_ms, 4),
            "status": self.status,
            "metadata": self.metadata,
        }


@dataclass
class Trace:
    """The full execution trace for a single HTTP request."""

    trace_id: str
    started_at: float = field(default_factory=time.time)
    ended_at: Optional[float] = None
    events: List[TraceEvent] = field(default_factory=list)
    request_summary: Dict[str, Any] = field(default_factory=dict)
    response_summary: Dict[str, Any] = field(default_factory=dict)

    def add_event(self, event: TraceEvent) -> None:
        self.events.append(event)

    def finish(self) -> None:
        self.ended_at = time.time()

    @property
    def total_duration_ms(self) -> float:
        if self.ended_at is None:
            return sum(e.duration_ms for e in self.events)
        return (self.ended_at - self.started_at) * 1000

    def to_dict(self) -> Dict[str, Any]:
        return {
            "trace_id": self.trace_id,
            "started_at": self.started_at,
            "ended_at": self.ended_at,
            "total_duration_ms": round(self.total_duration_ms, 4),
            "request": self.request_summary,
            "response": self.response_summary,
            "events": [e.to_dict() for e in self.events],
        }

    def timeline(self) -> List[Dict[str, Any]]:
        """Events ordered by occurrence, suitable for a UI timeline view."""
        return [e.to_dict() for e in sorted(self.events, key=lambda e: e.timestamp)]

    def performance(self) -> Dict[str, Any]:
        """Per-component duration breakdown, useful for latency analysis."""
        by_component: Dict[str, float] = {}
        for e in self.events:
            by_component[e.component] = by_component.get(e.component, 0.0) + e.duration_ms
        return {
            "total_duration_ms": round(self.total_duration_ms, 4),
            "by_component_ms": {k: round(v, 4) for k, v in by_component.items()},
        }


class TraceRecorder:
    """Context manager that times a pipeline stage and records it onto a Trace.

    Usage::

        with TraceRecorder(trace, "Parser", "parse_headers") as rec:
            ...
            rec.metadata["header_count"] = len(headers)

    If the block raises, the event is still recorded with status="error" and
    the exception propagates normally (it is never suppressed).
    """

    def __init__(self, trace: Trace, component: str, action: str, **metadata: Any) -> None:
        self.trace = trace
        self.component = component
        self.action = action
        self.metadata: Dict[str, Any] = dict(metadata)
        self.status = "ok"
        self._start = 0.0

    def __enter__(self) -> "TraceRecorder":
        self._start = time.perf_counter()
        return self

    def fail(self, reason: str) -> None:
        """Mark this step as failed without raising an exception."""
        self.status = "error"
        self.metadata["error"] = reason

    def __exit__(self, exc_type, exc, tb) -> bool:
        duration_ms = (time.perf_counter() - self._start) * 1000
        status = "error" if exc_type else self.status
        if exc_type and "error" not in self.metadata:
            self.metadata["error"] = str(exc)
        self.trace.add_event(
            TraceEvent(
                component=self.component,
                action=self.action,
                timestamp=time.time(),
                duration_ms=duration_ms,
                status=status,
                metadata=self.metadata,
            )
        )
        return False
