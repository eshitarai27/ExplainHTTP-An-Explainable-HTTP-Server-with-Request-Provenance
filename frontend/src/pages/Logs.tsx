import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { LogEntry } from "../lib/types";

const LEVEL_COLORS: Record<string, string> = {
  DEBUG: "#898781",
  INFO: "#2a78d6",
  WARNING: "#fab219",
  ERROR: "#d03b3b",
  CRITICAL: "#d03b3b",
};

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api
        .getLogs(300)
        .then((res) => !cancelled && setLogs(res.logs))
        .catch(() => !cancelled && setError("Could not reach the ExplainHTTP server."));
    };
    load();
    const interval = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const levels = ["ALL", ...Array.from(new Set(logs.map((l) => l.level)))];
  const filtered = levelFilter === "ALL" ? logs : logs.filter((l) => l.level === levelFilter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Logs</h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-ink-muted-dark">
            Structured JSON log lines emitted by the server, correlated by trace ID.
          </p>
        </div>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="rounded-md border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark px-3 py-1.5 text-sm outline-none"
        >
          {levels.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-md border border-status-critical/30 bg-status-critical/10 px-4 py-3 text-sm text-status-critical">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark font-mono text-xs">
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-ink-faint">No log entries yet.</div>
        )}
        {filtered.map((log, i) => (
          <div
            key={i}
            className="grid grid-cols-[160px_70px_1fr_100px] items-center gap-3 border-b border-hairline dark:border-hairline-dark px-4 py-2 last:border-0 hover:bg-plane dark:hover:bg-plane-dark"
          >
            <span className="tabular text-ink-faint">{log.timestamp}</span>
            <span
              className="rounded px-1.5 py-0.5 text-center font-semibold"
              style={{
                color: LEVEL_COLORS[log.level] ?? "#898781",
                backgroundColor: `${LEVEL_COLORS[log.level] ?? "#898781"}1a`,
              }}
            >
              {log.level}
            </span>
            <span className="truncate text-ink dark:text-ink-dark">{log.message}</span>
            {log.trace_id ? (
              <Link to={`/traces/${log.trace_id}/timeline`} className="tabular text-series-1 hover:underline">
                {log.trace_id.slice(0, 10)}…
              </Link>
            ) : (
              <span className="text-ink-faint">—</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
