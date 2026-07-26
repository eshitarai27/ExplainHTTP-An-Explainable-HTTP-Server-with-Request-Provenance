import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { api } from "../lib/api";
import type { TraceDetail } from "../lib/types";
import { colorForStage } from "../lib/colors";

const X_SPACING = 220;
const Y_STAGGER = 70;

function buildNodes(trace: TraceDetail, activeUpTo: number): Node[] {
  return trace.execution_graph.nodes.map((n, i) => {
    const color = colorForStage(n.label);
    const isActive = activeUpTo < 0 || i <= activeUpTo;
    return {
      id: n.id,
      position: { x: i * X_SPACING, y: i % 2 === 0 ? 0 : Y_STAGGER },
      data: {
        label: (
          <div className="flex flex-col items-center gap-0.5 px-1 py-0.5 text-xs">
            <span className="font-semibold">{n.label}</span>
            <span className="tabular opacity-80">{n.duration_ms.toFixed(3)} ms</span>
          </div>
        ),
      },
      style: {
        background: isActive ? color : "#89878122",
        color: isActive ? "white" : "#898781",
        border: n.status === "error" ? "2px solid #d03b3b" : "1px solid rgba(0,0,0,0.1)",
        borderRadius: 10,
        width: 150,
        transition: "background 0.3s ease, color 0.3s ease",
      },
    };
  });
}

function buildEdges(trace: TraceDetail, activeUpTo: number): Edge[] {
  return trace.execution_graph.edges.map((e, i) => {
    const active = activeUpTo < 0 || i < activeUpTo;
    return {
      id: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      label: e.relationship,
      animated: active,
      style: { stroke: active ? "#2a78d6" : "#89878155" },
      labelStyle: { fontSize: 10, fill: "#898781" },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#2a78d6" },
    };
  });
}

export default function GraphViewer() {
  const { traceId } = useParams<{ traceId: string }>();
  const [trace, setTrace] = useState<TraceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replayStep, setReplayStep] = useState(-1);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!traceId) return;
    api
      .getTrace(traceId)
      .then(setTrace)
      .catch(() => setError(`No trace found for ${traceId}`));
  }, [traceId]);

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, []);

  const nodes = useMemo(() => (trace ? buildNodes(trace, replayStep) : []), [trace, replayStep]);
  const edges = useMemo(() => (trace ? buildEdges(trace, replayStep) : []), [trace, replayStep]);

  const replay = () => {
    if (!trace) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    let step = 0;
    setReplayStep(0);
    timerRef.current = window.setInterval(() => {
      step += 1;
      setReplayStep(step);
      if (step >= trace.execution_graph.nodes.length) {
        if (timerRef.current) window.clearInterval(timerRef.current);
      }
    }, 500);
  };

  if (error) {
    return (
      <div className="rounded-md border border-status-critical/30 bg-status-critical/10 px-4 py-3 text-sm text-status-critical">
        {error}
      </div>
    );
  }

  if (!trace) {
    return <div className="text-sm text-ink-muted dark:text-ink-muted-dark">Loading trace…</div>;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Graph Viewer</h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-ink-muted-dark tabular">
            {trace.trace_id}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={replay}
            className="rounded-md bg-series-1 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            ▶ Replay request
          </button>
          <a
            href={api.graphExportUrl(trace.trace_id, "json")}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-series-1 hover:underline"
          >
            graph.json
          </a>
          <a
            href={api.graphExportUrl(trace.trace_id, "dot")}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-series-1 hover:underline"
          >
            graph.dot
          </a>
          <a
            href={api.graphExportUrl(trace.trace_id, "cypher")}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-series-1 hover:underline"
          >
            graph.cypher
          </a>
          <Link to={`/traces/${trace.trace_id}/timeline`} className="text-xs text-series-1 hover:underline">
            View timeline →
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark">
        <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
          <Background gap={24} color="#89878133" />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable style={{ background: "transparent" }} />
        </ReactFlow>
      </div>
    </div>
  );
}
