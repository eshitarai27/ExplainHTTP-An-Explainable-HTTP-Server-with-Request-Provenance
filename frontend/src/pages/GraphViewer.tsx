import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { Braces, ChevronLeft, ChevronRight, Download, FileCode, Pause, Play, Waypoints } from "lucide-react";
import { api } from "../lib/api";
import type { TraceDetail } from "../lib/types";
import { colorForStage, STAGE_COLORS } from "../lib/colors";
import { getChartTheme } from "../lib/chartTheme";
import { useTheme } from "../lib/theme";
import { useStepReplay } from "../lib/useStepReplay";
import PageHeader from "../components/PageHeader";
import Panel from "../components/Panel";
import EmptyState from "../components/EmptyState";

const X_SPACING = 210;

function buildNodes(
  trace: TraceDetail,
  activeUpTo: number,
  focusId: string | null,
  ct: ReturnType<typeof getChartTheme>
): Node[] {
  return trace.execution_graph.nodes.map((n, i) => {
    const color = colorForStage(n.label);
    const isActive = activeUpTo < 0 || i <= activeUpTo;
    const isFocused = focusId === n.id;
    return {
      id: n.id,
      position: { x: i * X_SPACING, y: 0 },
      data: {
        label: (
          <div className="flex flex-col items-center gap-0.5 px-1 py-0.5 text-xs">
            <span className="font-semibold">{n.label}</span>
            <span className="tabular opacity-80">{n.duration_ms.toFixed(3)} ms</span>
          </div>
        ),
      },
      style: {
        background: isActive ? color : `${ct.inkFaint}22`,
        color: isActive ? "white" : ct.inkFaint,
        border: n.status === "error" ? "2px solid #d03b3b" : isFocused ? `2px solid ${ct.ink}` : "1px solid rgba(0,0,0,0.1)",
        boxShadow: isFocused ? `0 0 0 4px ${color}33` : undefined,
        borderRadius: 10,
        width: 150,
        transition: "background 0.3s ease, color 0.3s ease, box-shadow 0.3s ease",
      },
    };
  });
}

function buildEdges(
  trace: TraceDetail,
  activeUpTo: number,
  hovered: string | null,
  ct: ReturnType<typeof getChartTheme>
): Edge[] {
  return trace.execution_graph.edges.map((e, i) => {
    const active = activeUpTo < 0 || i < activeUpTo;
    const id = `${e.source}-${e.target}`;
    return {
      id,
      source: e.source,
      target: e.target,
      label: hovered === id ? e.relationship : undefined,
      animated: active,
      style: { stroke: active ? ct.accent : `${ct.inkFaint}55` },
      labelStyle: { fontSize: 10, fill: ct.inkFaint },
      labelBgStyle: { fill: ct.surface },
      markerEnd: { type: MarkerType.ArrowClosed, color: ct.accent },
    };
  });
}

export default function GraphViewer() {
  const { traceId } = useParams<{ traceId: string }>();
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  const [trace, setTrace] = useState<TraceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const { theme } = useTheme();
  const ct = getChartTheme(theme);

  useEffect(() => {
    if (!traceId) return;
    api
      .getTrace(traceId)
      .then(setTrace)
      .catch(() => setError(`No trace found for ${traceId}`));
  }, [traceId]);

  const nodeCount = trace?.execution_graph.nodes.length ?? 0;
  const { step, playing, play, pause, next, prev } = useStepReplay(nodeCount);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!trace) return;
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key.toLowerCase() === "r") play();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [trace, next, prev, play]);

  const nodes = useMemo(
    () => (trace ? buildNodes(trace, step, focusId, ct) : []),
    [trace, step, focusId, ct]
  );
  const edges = useMemo(
    () => (trace ? buildEdges(trace, step, hoveredEdge, ct) : []),
    [trace, step, hoveredEdge, ct]
  );
  const usedStages = useMemo(
    () => Array.from(new Set(trace?.execution_graph.nodes.map((n) => n.type) ?? [])),
    [trace]
  );

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
      <PageHeader
        title="Graph Viewer"
        description={<span className="mono">{trace.trace_id}</span>}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-md border border-hairline p-0.5 dark:border-hairline-dark">
              <button
                onClick={prev}
                disabled={step <= -1}
                className="rounded p-1 text-ink-muted hover:bg-plane disabled:opacity-30 dark:text-ink-muted-dark dark:hover:bg-plane-dark"
                aria-label="Previous stage"
              >
                <ChevronLeft size={14} strokeWidth={1.75} />
              </button>
              <button
                onClick={playing ? pause : play}
                className="flex items-center gap-1 rounded bg-series-1 px-2 py-1 text-xs font-medium text-white hover:opacity-90"
              >
                {playing ? <Pause size={12} strokeWidth={2} /> : <Play size={12} strokeWidth={2} />}
                Replay
              </button>
              <button
                onClick={next}
                disabled={step >= nodeCount - 1}
                className="rounded p-1 text-ink-muted hover:bg-plane disabled:opacity-30 dark:text-ink-muted-dark dark:hover:bg-plane-dark"
                aria-label="Next stage"
              >
                <ChevronRight size={14} strokeWidth={1.75} />
              </button>
            </div>
            <div className="flex items-center gap-1 text-ink-faint">
              <a
                href={api.graphExportUrl(trace.trace_id, "json")}
                target="_blank"
                rel="noreferrer"
                title="Download graph.json"
                className="rounded p-1.5 hover:bg-plane hover:text-ink-muted dark:hover:bg-plane-dark"
              >
                <Braces size={14} strokeWidth={1.75} />
              </a>
              <a
                href={api.graphExportUrl(trace.trace_id, "dot")}
                target="_blank"
                rel="noreferrer"
                title="Download graph.dot"
                className="rounded p-1.5 hover:bg-plane hover:text-ink-muted dark:hover:bg-plane-dark"
              >
                <Waypoints size={14} strokeWidth={1.75} />
              </a>
              <a
                href={api.graphExportUrl(trace.trace_id, "cypher")}
                target="_blank"
                rel="noreferrer"
                title="Download graph.cypher"
                className="rounded p-1.5 hover:bg-plane hover:text-ink-muted dark:hover:bg-plane-dark"
              >
                <FileCode size={14} strokeWidth={1.75} />
              </a>
            </div>
            <Link to={`/traces/${trace.trace_id}/timeline`} className="text-xs text-series-1 hover:underline">
              View timeline →
            </Link>
          </div>
        }
      />

      {nodes.length === 0 ? (
        <Panel className="flex-1">
          <EmptyState icon={Download} title="This trace has no execution graph." />
        </Panel>
      ) : (
        <Panel className="flex-1 overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            proOptions={{ hideAttribution: true }}
            onEdgeMouseEnter={(_, edge) => setHoveredEdge(edge.id)}
            onEdgeMouseLeave={() => setHoveredEdge(null)}
            nodesDraggable={false}
          >
            <Background gap={24} color={`${ct.inkFaint}33`} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable style={{ background: "transparent" }} />
          </ReactFlow>
        </Panel>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-faint">
        <span className="font-medium text-ink-muted dark:text-ink-muted-dark">Pipeline stages</span>
        {usedStages.map((stage) => (
          <span key={stage} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[stage] ?? "#898781" }} />
            {stage}
          </span>
        ))}
        <span className="ml-auto">←→ to step · R to replay</span>
      </div>
    </div>
  );
}
