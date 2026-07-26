"""Exports an ExecutionGraph as graph.json, graph.dot, or graph.cypher."""
from __future__ import annotations

import json
from typing import Any, Dict

from .graph_builder import ExecutionGraph


def to_json(graph: ExecutionGraph) -> Dict[str, Any]:
    return graph.to_dict()


def _escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ")


def to_dot(graph: ExecutionGraph) -> str:
    """Render as Graphviz DOT, suitable for `dot -Tsvg graph.dot -o graph.svg`."""
    lines = [f'digraph Trace_{graph.trace_id} {{', "  rankdir=LR;", "  node [shape=box, style=\"rounded,filled\", fontname=\"Helvetica\"];"]

    for node in graph.nodes:
        color = "#fca5a5" if node.status == "error" else "#93c5fd"
        label = f"{_escape(node.label)}\\n{node.duration_ms:.2f}ms"
        lines.append(f'  "{node.id}" [label="{label}", fillcolor="{color}"];')

    for edge in graph.edges:
        lines.append(f'  "{edge.source}" -> "{edge.target}" [label="{_escape(edge.relationship)}"];')

    lines.append("}")
    return "\n".join(lines)


def to_cypher(graph: ExecutionGraph) -> str:
    """Render as a Neo4j Cypher script, directly importable via `cypher-shell`
    or the Neo4j Browser. All CREATE clauses share one query so node
    variables stay in scope for the relationship CREATE clauses that follow."""
    lines = []
    var_by_id = {node.id: f"v{i}" for i, node in enumerate(graph.nodes)}

    for node in graph.nodes:
        var = var_by_id[node.id]
        metadata_json = _escape(json.dumps(node.metadata, default=str))
        props = (
            f'id: "{graph.trace_id}_{node.id}", '
            f'trace_id: "{graph.trace_id}", '
            f'label: "{_escape(node.label)}", '
            f'status: "{node.status}", '
            f'duration_ms: {node.duration_ms:.4f}, '
            f'metadata: "{metadata_json}"'
        )
        lines.append(f"CREATE ({var}:{node.type} {{{props}}})")

    lines.append("")

    for edge in graph.edges:
        source_var = var_by_id[edge.source]
        target_var = var_by_id[edge.target]
        lines.append(f"CREATE ({source_var})-[:{edge.relationship}]->({target_var})")

    return "\n".join(lines) + "\n"
