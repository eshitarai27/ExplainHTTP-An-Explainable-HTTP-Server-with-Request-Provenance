import { useEffect, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";
import type { MetricsSnapshot } from "../lib/types";
import StatTile from "../components/StatTile";
import { colorForStatusCode } from "../lib/colors";

const SERIES_BLUE = "#2a78d6";

function statusBucket(code: string): string {
  const n = Number(code);
  if (n >= 500) return "5xx";
  if (n >= 400) return "4xx";
  if (n >= 300) return "3xx";
  return "2xx";
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark p-5">
      <div className="mb-4 text-sm font-medium text-ink-muted dark:text-ink-muted-dark">
        {title}
      </div>
      <div style={{ width: "100%", height: 260 }}>{children}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-ink-faint">
      No data yet
    </div>
  );
}

export default function Metrics() {
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api
        .getMetrics()
        .then((m) => !cancelled && setMetrics(m))
        .catch(() => !cancelled && setError("Could not reach the ExplainHTTP server."));
    };
    load();
    const interval = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-md border border-status-critical/30 bg-status-critical/10 px-4 py-3 text-sm text-status-critical">
        {error}
      </div>
    );
  }

  const routeEntries = metrics ? Object.entries(metrics.routes) : [];
  const routeData = routeEntries.map(([route, m]) => ({ route, count: m.count }));
  const latencyData = routeEntries.map(([route, m]) => ({ route, avg_latency_ms: m.avg_latency_ms }));

  const buckets: Record<string, number> = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 };
  if (metrics) {
    for (const [code, count] of Object.entries(metrics.status_counts)) {
      buckets[statusBucket(code)] += count;
    }
  }
  const statusData = Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Metrics</h1>
        <p className="mt-1 text-sm text-ink-muted dark:text-ink-muted-dark">
          Runtime numbers gathered directly from the server's own request pipeline.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatTile label="Total requests" value={metrics ? String(metrics.total_requests) : "—"} />
        <StatTile
          label="Active connections"
          value={metrics ? String(metrics.active_connections) : "—"}
        />
        <StatTile
          label="Avg latency"
          value={metrics ? `${metrics.avg_latency_ms.toFixed(2)} ms` : "—"}
        />
        <StatTile label="Errors" value={metrics ? String(metrics.errors) : "—"} />
        <StatTile
          label="Uptime"
          value={metrics ? `${metrics.uptime_seconds.toFixed(0)}s` : "—"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Requests per route">
          {routeData.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer>
              <BarChart data={routeData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
                <XAxis dataKey="route" tick={{ fontSize: 11, fill: "#898781" }} />
                <YAxis tick={{ fontSize: 11, fill: "#898781" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e1e0d9" }}
                />
                <Bar dataKey="count" fill={SERIES_BLUE} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Average latency per route (ms)">
          {latencyData.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer>
              <BarChart data={latencyData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
                <XAxis dataKey="route" tick={{ fontSize: 11, fill: "#898781" }} />
                <YAxis tick={{ fontSize: 11, fill: "#898781" }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e1e0d9" }}
                  formatter={(value: number) => `${value.toFixed(3)} ms`}
                />
                <Bar dataKey="avg_latency_ms" fill={SERIES_BLUE} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Response status distribution">
          <ResponsiveContainer>
            <BarChart data={statusData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
              <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#898781" }} />
              <YAxis tick={{ fontSize: 11, fill: "#898781" }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e1e0d9" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {statusData.map((entry) => (
                  <Cell
                    key={entry.bucket}
                    fill={colorForStatusCode(entry.bucket === "2xx" ? 200 : entry.bucket === "3xx" ? 300 : entry.bucket === "4xx" ? 400 : 500)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
