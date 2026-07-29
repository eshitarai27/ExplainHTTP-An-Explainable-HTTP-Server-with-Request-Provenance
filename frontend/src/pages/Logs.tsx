import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ScrollText } from "lucide-react";
import { api } from "../lib/api";
import type { LogEntry } from "../lib/types";
import { LogLevelBadge } from "../components/StatusBadge";
import PageHeader from "../components/PageHeader";
import Panel from "../components/Panel";
import EmptyState from "../components/EmptyState";

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
      <PageHeader
        title="Logs"
        description="Structured JSON log lines emitted by the server, correlated by trace ID."
        actions={
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm outline-none focus:border-series-1 dark:border-hairline-dark dark:bg-surface-dark"
          >
            {levels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        }
      />

      {error && (
        <div className="rounded-md border border-status-critical/30 bg-status-critical/10 px-4 py-3 text-sm text-status-critical">
          {error}
        </div>
      )}

      <Panel className="mono overflow-hidden text-xs">
        {filtered.length === 0 && (
          <EmptyState
            icon={ScrollText}
            title={logs.length === 0 ? "No log entries yet" : "No entries match this level"}
          />
        )}
        {filtered.map((log, i) => (
          <div
            key={i}
            className="grid grid-cols-[160px_70px_1fr_100px] items-center gap-3 border-b border-hairline px-4 py-2 last:border-0 hover:bg-plane dark:border-hairline-dark dark:hover:bg-plane-dark"
          >
            <span className="text-ink-faint">{log.timestamp}</span>
            <LogLevelBadge level={log.level} />
            <span className="truncate font-sans text-ink dark:text-ink-dark">{log.message}</span>
            {log.trace_id ? (
              <Link to={`/traces/${log.trace_id}/timeline`} className="text-series-1 hover:underline">
                {log.trace_id.slice(0, 10)}…
              </Link>
            ) : (
              <span className="text-ink-faint">—</span>
            )}
          </div>
        ))}
      </Panel>
    </div>
  );
}
