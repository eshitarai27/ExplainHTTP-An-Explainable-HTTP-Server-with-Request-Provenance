import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { TraceSummary } from "../lib/types";
import { MethodBadge, StatusCodeBadge } from "../components/StatusBadge";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Trace Viewer</h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-ink-muted-dark">
            Every request gets a trace ID. Inspect its full execution timeline and graph.
          </p>
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by path or trace ID…"
          className="w-64 rounded-md border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark px-3 py-1.5 text-sm outline-none focus:border-series-1"
        />
      </div>

      {error && (
        <div className="rounded-md border border-status-critical/30 bg-status-critical/10 px-4 py-3 text-sm text-status-critical">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline dark:border-hairline-dark text-left text-xs text-ink-muted dark:text-ink-muted-dark">
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
                <td colSpan={7} className="px-4 py-8 text-center text-ink-faint">
                  No traces match.
                </td>
              </tr>
            )}
            {filtered.map((t) => (
              <tr
                key={t.trace_id}
                className="border-b border-hairline dark:border-hairline-dark last:border-0 hover:bg-plane dark:hover:bg-plane-dark"
              >
                <td className="px-4 py-2.5">
                  <MethodBadge method={t.request?.method ?? "?"} />
                </td>
                <td className="px-4 py-2.5 tabular">{t.request?.path ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <StatusCodeBadge status={t.response?.status_code ?? 0} />
                </td>
                <td className="px-4 py-2.5 tabular text-ink-muted dark:text-ink-muted-dark">
                  {t.total_duration_ms.toFixed(2)} ms
                </td>
                <td className="px-4 py-2.5 tabular text-ink-faint">
                  {t.request?.client_addr ?? "—"}
                </td>
                <td className="px-4 py-2.5 tabular text-xs text-ink-faint">
                  {t.trace_id.slice(0, 12)}…
                </td>
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
      </div>
    </div>
  );
}
