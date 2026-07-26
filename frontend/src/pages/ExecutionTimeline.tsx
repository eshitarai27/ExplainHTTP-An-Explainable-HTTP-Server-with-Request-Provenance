import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { TraceDetail } from "../lib/types";
import { colorForStage, stageType } from "../lib/colors";
import { EventStatusBadge, StatusCodeBadge } from "../components/StatusBadge";

export default function ExecutionTimeline() {
  const { traceId } = useParams<{ traceId: string }>();
  const [trace, setTrace] = useState<TraceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (!traceId) return;
    api
      .getTrace(traceId)
      .then(setTrace)
      .catch(() => setError(`No trace found for ${traceId}`));
  }, [traceId]);

  if (error) {
    return (
      <div className="rounded-md border border-status-critical/30 bg-status-critical/10 px-4 py-3 text-sm text-status-critical">
        {error}
      </div>
    );
  }

  if (!trace) {
    return <div className="text-sm text-ink-muted dark:text-ink-muted-dark">Loading trace…</div>;
  }

  const maxDuration = Math.max(...trace.events.map((e) => e.duration_ms), 0.001);
  const request = trace.request as { method?: string; path?: string };
  const response = trace.response as { status_code?: number };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Execution Timeline</h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-ink-muted-dark tabular">
            {request.method} {request.path} · {trace.trace_id}
          </p>
        </div>
        <div className="flex gap-3 text-xs">
          <Link to={`/traces/${trace.trace_id}/graph`} className="text-series-1 hover:underline">
            View execution graph →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark px-5 py-4">
          <div className="text-xs text-ink-muted dark:text-ink-muted-dark">Total duration</div>
          <div className="tabular mt-1.5 text-2xl font-semibold">
            {trace.performance.total_duration_ms.toFixed(3)} ms
          </div>
        </div>
        <div className="rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark px-5 py-4">
          <div className="text-xs text-ink-muted dark:text-ink-muted-dark">Response status</div>
          <div className="mt-1.5">
            <StatusCodeBadge status={response.status_code ?? 0} />
          </div>
        </div>
        <div className="rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark px-5 py-4">
          <div className="text-xs text-ink-muted dark:text-ink-muted-dark">Stages recorded</div>
          <div className="tabular mt-1.5 text-2xl font-semibold">{trace.events.length}</div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
          {trace.events.map((event, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span
                className="rounded-full px-2 py-1 font-medium text-white"
                style={{ backgroundColor: colorForStage(event.component) }}
              >
                {event.component}
              </span>
              {i < trace.events.length - 1 && <span className="text-ink-faint">→</span>}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark">
        {trace.events.map((event, i) => (
          <div
            key={i}
            className="border-b border-hairline dark:border-hairline-dark last:border-0"
          >
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="grid w-full grid-cols-[140px_1fr_90px_70px] items-center gap-3 px-4 py-3 text-left text-sm hover:bg-plane dark:hover:bg-plane-dark"
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: colorForStage(event.component) }}
                />
                <span className="truncate font-medium">{event.component}</span>
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-plane dark:bg-plane-dark">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${Math.max((event.duration_ms / maxDuration) * 100, 2)}%`,
                    backgroundColor: colorForStage(event.component),
                  }}
                />
              </span>
              <span className="tabular text-right text-ink-muted dark:text-ink-muted-dark">
                {event.duration_ms.toFixed(3)} ms
              </span>
              <span className="flex justify-end">
                <EventStatusBadge status={event.status} />
              </span>
            </button>
            {expanded === i && (
              <pre className="tabular overflow-x-auto bg-plane dark:bg-plane-dark px-4 py-3 text-xs text-ink-muted dark:text-ink-muted-dark">
                {JSON.stringify({ action: event.action, ...event.metadata }, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-ink-faint">
        Stage type derived from component name (e.g. "{stageType("Middleware:cors_middleware")}"
        for "Middleware:cors_middleware"). Click a row to inspect its recorded metadata.
      </p>
    </div>
  );
}
