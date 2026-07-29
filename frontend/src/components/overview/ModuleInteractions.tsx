import { useMemo } from "react";
import ReactFlow, { Background, MarkerType, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { getChartTheme } from "../../lib/chartTheme";
import { useTheme } from "../../lib/theme";

function baseNode(
  id: string,
  x: number,
  y: number,
  label: string,
  sub: string,
  accent: boolean,
  ct: ReturnType<typeof getChartTheme>
): Node {
  return {
    id,
    position: { x, y },
    data: {
      label: (
        <div className="px-1 py-0.5 text-center">
          <div className="text-xs font-semibold">{label}</div>
          <div className="mono text-[10px] opacity-70">{sub}</div>
        </div>
      ),
    },
    style: {
      background: accent ? ct.accent : ct.surface,
      color: accent ? "white" : ct.ink,
      border: `1px solid ${accent ? ct.accent : ct.hairline}`,
      borderRadius: 8,
      width: 168,
      padding: 4,
    },
  };
}

export default function ModuleInteractions() {
  const { theme } = useTheme();
  const ct = getChartTheme(theme);

  const nodes = useMemo<Node[]>(
    () => [
      baseNode("routes", 190, 0, "routes.py", "build_app() — startup", false, ct),
      baseNode("connection", 0, 110, "Connection", "core/connection.py", false, ct),
      baseNode("app", 190, 110, "Application", "app.py — handle_request()", true, ct),
      baseNode("router", 380, 60, "Router", "match(method, path)", false, ct),
      baseNode("middleware", 380, 160, "MiddlewareChain", "cors → gzip → handler", false, ct),
      baseNode("hooks", 190, 220, "HookManager", "6 lifecycle hooks, no-ops by default", false, ct),
      baseNode("tracestore", 0, 220, "TraceStore", "bounded, thread-safe", false, ct),
      baseNode("metrics", 0, 300, "Metrics", "latency, status, route counts", false, ct),
      baseNode("logger", 190, 300, "Logger", "structured JSON + ring buffer", false, ct),
    ],
    [ct]
  );

  const solid = (id: string, source: string, target: string, label?: string): Edge => ({
    id,
    source,
    target,
    label,
    labelStyle: { fontSize: 9, fill: ct.inkFaint },
    style: { stroke: ct.accent, strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: ct.accent, width: 14, height: 14 },
  });

  const dashed = (id: string, source: string, target: string, label?: string): Edge => ({
    id,
    source,
    target,
    label,
    labelStyle: { fontSize: 9, fill: ct.inkFaint },
    style: { stroke: ct.inkFaint, strokeWidth: 1.25, strokeDasharray: "4 3" },
    markerEnd: { type: MarkerType.ArrowClosed, color: ct.inkFaint, width: 12, height: 12 },
  });

  const edges = useMemo<Edge[]>(
    () => [
      dashed("e-routes", "routes", "app", "registers"),
      solid("e-conn", "connection", "app", "calls"),
      solid("e-router", "app", "router", "uses"),
      solid("e-mw", "app", "middleware", "wraps handler in"),
      dashed("e-hooks", "app", "hooks", "fires 6 named hooks"),
      dashed("e-trace", "app", "tracestore", "records trace"),
      dashed("e-metrics", "app", "metrics", "records timing"),
      dashed("e-logger", "app", "logger", "logs outcome"),
    ],
    [ct]
  );

  return (
    <div className="h-[340px] overflow-hidden rounded-lg border border-hairline dark:border-hairline-dark">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        zoomOnScroll={false}
        panOnDrag={true}
      >
        <Background gap={22} color={`${ct.inkFaint}33`} />
      </ReactFlow>
    </div>
  );
}
