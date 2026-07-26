export interface TraceEvent {
  component: string;
  action: string;
  timestamp: number;
  duration_ms: number;
  status: "ok" | "error";
  metadata: Record<string, unknown>;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  status: "ok" | "error";
  duration_ms: number;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
}

export interface ExecutionGraph {
  trace_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface TraceDetail {
  trace_id: string;
  timeline: TraceEvent[];
  performance: {
    total_duration_ms: number;
    by_component_ms: Record<string, number>;
  };
  execution_graph: ExecutionGraph;
  events: TraceEvent[];
  request: Record<string, unknown>;
  response: Record<string, unknown>;
}

export interface TraceSummary {
  trace_id: string;
  started_at: number;
  total_duration_ms: number;
  request: {
    method?: string;
    path?: string;
    client_addr?: string;
    [key: string]: unknown;
  };
  response: {
    status_code?: number;
    body_size?: number;
    [key: string]: unknown;
  };
}

export interface TraceListResponse {
  count: number;
  traces: TraceSummary[];
}

export interface RouteMetric {
  count: number;
  avg_latency_ms: number;
}

export interface MetricsSnapshot {
  uptime_seconds: number;
  total_requests: number;
  active_connections: number;
  errors: number;
  avg_latency_ms: number;
  status_counts: Record<string, number>;
  routes: Record<string, RouteMetric>;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  logger: string;
  message: string;
  trace_id?: string;
  method?: string;
  path?: string;
  status?: number;
  [key: string]: unknown;
}

export interface LogsResponse {
  logs: LogEntry[];
}
