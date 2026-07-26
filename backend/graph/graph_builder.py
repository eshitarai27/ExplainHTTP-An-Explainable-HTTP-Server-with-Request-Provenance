"""Builds a node/edge execution graph from a request's Trace.

The graph always starts with a synthetic ``Request`` node (representing the
inbound HTTP request itself) followed by one node per recorded trace event,
in the order the pipeline executed them. Edges are labeled with a
relationship name describing the transition between two pipeline stages,
e.g. ``PARSED_BY``, ``ROUTED_TO``, ``EXECUTED``, ``RETURNED``.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Tuple

from tracing.trace import Trace

# (from_type, to_type) -> relationship label. Falls back to "NEXT_STAGE".
_RELATIONSHIPS: Dict[Tuple[str, str], str] = {
    ("Request", "Connection"): "ACCEPTED_BY",
    ("Request", "Parser"): "PARSED_BY",
    ("Connection", "Parser"): "PARSED_BY",
    ("Parser", "Router"): "ROUTED_TO",
    ("Router", "Middleware"): "PASSED_THROUGH",
    ("Middleware", "Middleware"): "CHAINED_TO",
    ("Middleware", "Handler"): "EXECUTED",
    ("Router", "Handler"): "EXECUTED",
    ("Handler", "Response"): "RETURNED",
    ("Response", "Socket"): "SENT_BY",
}


@dataclass
class GraphNode:
    id: str
    label: str
    type: str
    status: str
    duration_ms: float
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "type": self.type,
            "status": self.status,
            "duration_ms": round(self.duration_ms, 4),
            "metadata": self.metadata,
        }


@dataclass
class GraphEdge:
    source: str
    target: str
    relationship: str

    def to_dict(self) -> Dict[str, Any]:
        return {"source": self.source, "target": self.target, "relationship": self.relationship}


@dataclass
class ExecutionGraph:
    trace_id: str
    nodes: List[GraphNode]
    edges: List[GraphEdge]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "trace_id": self.trace_id,
            "nodes": [n.to_dict() for n in self.nodes],
            "edges": [e.to_dict() for e in self.edges],
        }


def _node_type(component: str) -> str:
    return component.split(":", 1)[0]


def _relationship(from_type: str, to_type: str) -> str:
    return _RELATIONSHIPS.get((from_type, to_type), "NEXT_STAGE")


def build_graph(trace: Trace) -> ExecutionGraph:
    """Convert a completed Trace into an ExecutionGraph."""
    nodes: List[GraphNode] = [
        GraphNode(
            id="n0",
            label="Request",
            type="Request",
            status="ok",
            duration_ms=0.0,
            metadata={"trace_id": trace.trace_id, **trace.request_summary},
        )
    ]
    edges: List[GraphEdge] = []

    for idx, event in enumerate(trace.events, start=1):
        node = GraphNode(
            id=f"n{idx}",
            label=event.component,
            type=_node_type(event.component),
            status=event.status,
            duration_ms=event.duration_ms,
            metadata={"action": event.action, **event.metadata},
        )
        nodes.append(node)
        prev = nodes[idx - 1]
        edges.append(
            GraphEdge(
                source=prev.id,
                target=node.id,
                relationship=_relationship(prev.type, node.type),
            )
        )

    return ExecutionGraph(trace_id=trace.trace_id, nodes=nodes, edges=edges)
