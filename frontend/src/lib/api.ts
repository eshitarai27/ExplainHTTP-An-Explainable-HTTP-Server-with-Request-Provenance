import type {
  LogsResponse,
  MetricsSnapshot,
  TraceDetail,
  TraceListResponse,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

async function getJSON<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`${path} responded with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  baseUrl: BASE_URL,
  getMetrics: () => getJSON<MetricsSnapshot>("/metrics"),
  listTraces: (limit = 50) => getJSON<TraceListResponse>(`/traces?limit=${limit}`),
  getTrace: (traceId: string) => getJSON<TraceDetail>(`/trace/${traceId}`),
  getLogs: (limit = 200) => getJSON<LogsResponse>(`/logs?limit=${limit}`),
  graphExportUrl: (traceId: string, format: "json" | "dot" | "cypher") =>
    `${BASE_URL}/graph/${traceId}.${format}`,
};
