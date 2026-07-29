import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, AlertTriangle, Clock, Radio, Timer } from "lucide-react";
import { api } from "../lib/api";
import type { MetricsSnapshot, TraceSummary } from "../lib/types";
import StatTile from "../components/StatTile";
import PageHeader from "../components/PageHeader";
import Panel from "../components/Panel";
import EmptyState from "../components/EmptyState";
import { MethodBadge, StatusCodeBadge } from "../components/StatusBadge";

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [traces, setTraces] = useState<TraceSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      Promise.all([api.getMetrics(), api.listTraces(8)])
        .then(([m, t]) => {
          if (cancelled) return;
          setMetrics(m);
          setTraces(t.traces);
          setError(null);
        })
        .catch(() => !cancelled && setError("Could not reach the ExplainHTTP server."));
    };
    load();
    const interval = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Dashboard"
        description={
          <>
            Live overview of the ExplainHTTP server at <span className="mono">{api.baseUrl}</span>
          </>
        }
      />

      {error && (
        <div className="rounded-md border border-status-critical/30 bg-status-critical/10 px-4 py-3 text-sm text-status-critical">
          {error} Start it with <code className="mono">python backend/server.py</code>.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatTile
          icon={Activity}
          label="Total requests"
          value={metrics ? String(metrics.total_requests) : "—"}
        />
        <StatTile
          icon={Radio}
          label="Active connections"
          value={metrics ? String(metrics.active_connections) : "—"}
        />
        <StatTile
          icon={Timer}
          label="Avg latency"
          value={metrics ? `${metrics.avg_latency_ms.toFixed(2)} ms` : "—"}
        />
        <StatTile
          icon={AlertTriangle}
          label="Errors"
          value={metrics ? String(metrics.errors) : "—"}
          accent={metrics && metrics.errors > 0 ? "#d03b3b" : undefined}
        />
        <StatTile icon={Clock} label="Uptime" value={metrics ? formatUptime(metrics.uptime_seconds) : "—"} />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink-muted dark:text-ink-muted-dark">Recent requests</h2>
          <Link to="/traces" className="text-xs text-series-1 hover:underline">
            View all traces →
          </Link>
        </div>
        <Panel className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs text-ink-muted dark:border-hairline-dark dark:text-ink-muted-dark">
                <th className="px-4 py-2.5 font-normal">Method</th>
                <th className="px-4 py-2.5 font-normal">Path</th>
                <th className="px-4 py-2.5 font-normal">Status</th>
                <th className="px-4 py-2.5 font-normal">Duration</th>
                <th className="px-4 py-2.5 font-normal">Trace ID</th>
              </tr>
            </thead>
            <tbody>
              {traces.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={Activity}
                      title="No requests recorded yet"
                      hint={`curl ${api.baseUrl}/hello/world`}
                    />
                  </td>
                </tr>
              )}
              {traces.map((t) => (
                <tr
                  key={t.trace_id}
                  className="border-b border-hairline last:border-0 hover:bg-plane dark:border-hairline-dark dark:hover:bg-plane-dark"
                >
                  <td className="px-4 py-2.5">
                    <MethodBadge method={t.request?.method ?? "?"} />
                  </td>
                  <td className="mono px-4 py-2.5">{t.request?.path ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <StatusCodeBadge status={t.response?.status_code ?? 0} />
                  </td>
                  <td className="mono px-4 py-2.5 text-ink-muted dark:text-ink-muted-dark">
                    {t.total_duration_ms.toFixed(2)} ms
                  </td>
                  <td className="px-4 py-2.5">
                    <Link to={`/traces/${t.trace_id}/timeline`} className="mono text-xs text-series-1 hover:underline">
                      {t.trace_id.slice(0, 12)}…
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}
