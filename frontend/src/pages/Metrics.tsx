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
import { Activity, AlertTriangle, BarChart3, Clock, Radio, Timer } from "lucide-react";
import { api } from "../lib/api";
import type { MetricsSnapshot } from "../lib/types";
import StatTile from "../components/StatTile";
import PageHeader from "../components/PageHeader";
import Panel from "../components/Panel";
import EmptyState from "../components/EmptyState";
import { colorForStatusCode } from "../lib/colors";
import { getChartTheme } from "../lib/chartTheme";
import { useTheme } from "../lib/theme";

function statusBucket(code: string): string {
  const n = Number(code);
  if (n >= 500) return "5xx";
  if (n >= 400) return "4xx";
  if (n >= 300) return "3xx";
  return "2xx";
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Panel className="p-5">
      <div className="mb-4 text-sm font-medium text-ink-muted dark:text-ink-muted-dark">{title}</div>
      <div style={{ width: "100%", height: 240 }}>{children}</div>
    </Panel>
  );
}

export default function Metrics() {
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const ct = getChartTheme(theme);

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
  const tooltipStyle = {
    fontSize: 12,
    borderRadius: 8,
    border: `1px solid ${ct.hairline}`,
    background: ct.surface,
    color: ct.ink,
  };
  const axisTick = { fontSize: 11, fill: ct.inkFaint };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Metrics"
        description="Runtime numbers gathered directly from the server's own request pipeline."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatTile icon={Activity} label="Total requests" value={metrics ? String(metrics.total_requests) : "—"} />
        <StatTile
          icon={Radio}
          label="Active connections"
          value={metrics ? String(metrics.active_connections) : "—"}
        />
        <StatTile icon={Timer} label="Avg latency" value={metrics ? `${metrics.avg_latency_ms.toFixed(2)} ms` : "—"} />
        <StatTile icon={AlertTriangle} label="Errors" value={metrics ? String(metrics.errors) : "—"} />
        <StatTile icon={Clock} label="Uptime" value={metrics ? `${metrics.uptime_seconds.toFixed(0)}s` : "—"} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Requests per route">
          {routeData.length === 0 ? (
            <EmptyState icon={BarChart3} title="No route traffic yet" />
          ) : (
            <ResponsiveContainer>
              <BarChart data={routeData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.hairline} vertical={false} />
                <XAxis dataKey="route" tick={axisTick} />
                <YAxis tick={axisTick} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: ct.plane }} />
                <Bar dataKey="count" fill={ct.accent} radius={[3, 3, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Average latency per route (ms)">
          {latencyData.length === 0 ? (
            <EmptyState icon={Timer} title="No latency data yet" />
          ) : (
            <ResponsiveContainer>
              <BarChart data={latencyData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.hairline} vertical={false} />
                <XAxis dataKey="route" tick={axisTick} />
                <YAxis tick={axisTick} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: ct.plane }}
                  formatter={(value: number) => `${value.toFixed(3)} ms`}
                />
                <Bar dataKey="avg_latency_ms" fill={ct.accent} radius={[3, 3, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Response status distribution">
          <ResponsiveContainer>
            <BarChart data={statusData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.hairline} vertical={false} />
              <XAxis dataKey="bucket" tick={axisTick} />
              <YAxis tick={axisTick} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: ct.plane }} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={40}>
                {statusData.map((entry) => (
                  <Cell
                    key={entry.bucket}
                    fill={colorForStatusCode(
                      entry.bucket === "2xx" ? 200 : entry.bucket === "3xx" ? 300 : entry.bucket === "4xx" ? 400 : 500
                    )}
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
