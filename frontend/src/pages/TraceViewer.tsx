import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Waypoints } from "lucide-react";
import { api } from "../lib/api";
import type { TraceSummary } from "../lib/types";
import { MethodBadge, StatusCodeBadge } from "../components/StatusBadge";
import PageHeader from "../components/PageHeader";
import Panel from "../components/Panel";
import EmptyState from "../components/EmptyState";

export default function TraceViewer() {
  const [traces, setTraces] = useState<TraceSummary[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api
        .listTraces(100)
        .then((res) => !cancelled && setTraces(res.traces))
        .catch(() => !cancelled && setError("Could not reach the ExplainHTTP server."));
    };
    load();
    const interval = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const filtered = traces.filter((t) => {
    if (!filter) return true;
    const needle = filter.toLowerCase();
    return (
      (t.request?.path ?? "").toLowerCase().includes(needle) ||
      t.trace_id.toLowerCase().includes(needle)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Trace Viewer"
        description="Every request gets a trace ID. Inspect its full execution timeline and graph."
        actions={
          <div className="relative">
            <Search size={13} strokeWidth={1.75} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by path or trace ID…"
              className="w-64 rounded-md border border-hairline bg-surface py-1.5 pl-8 pr-3 text-sm outline-none focus:border-series-1 dark:border-hairline-dark dark:bg-surface-dark"
            />
          </div>
        }
      />

      {error && (
        <div className="rounded-md border border-status-critical/30 bg-status-critical/10 px-4 py-3 text-sm text-status-critical">
          {error}
        </div>
      )}

      <Panel className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs text-ink-muted dark:border-hairline-dark dark:text-ink-muted-dark">
              <th className="px-4 py-2.5 font-normal">Method</th>
              <th className="px-4 py-2.5 font-normal">Path</th>
              <th className="px-4 py-2.5 font-normal">Status</th>
              <th className="px-4 py-2.5 font-normal">Duration</th>
              <th className="px-4 py-2.5 font-normal">Client</th>
              <th className="px-4 py-2.5 font-normal">Trace ID</th>
              <th className="px-4 py-2.5 font-normal">Explore</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={Waypoints}
                    title={traces.length === 0 ? "No traces recorded yet" : "No traces match your filter"}
                    hint={traces.length === 0 ? `curl ${api.baseUrl}/hello/world` : undefined}
                  />
                </td>
              </tr>
            )}
            {filtered.map((t) => (
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
                <td className="mono px-4 py-2.5 text-ink-faint">{t.request?.client_addr ?? "—"}</td>
                <td className="mono px-4 py-2.5 text-xs text-ink-faint">{t.trace_id.slice(0, 12)}…</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-3 text-xs">
                    <Link to={`/traces/${t.trace_id}/timeline`} className="text-series-1 hover:underline">
                      Timeline
                    </Link>
                    <Link to={`/traces/${t.trace_id}/graph`} className="text-series-1 hover:underline">
                      Graph
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
