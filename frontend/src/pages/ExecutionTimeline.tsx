import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Copy, GitBranch, Waypoints } from "lucide-react";
import { api } from "../lib/api";
import type { TraceDetail, TraceEvent } from "../lib/types";
import { colorForStage, STAGE_COLORS } from "../lib/colors";
import { EventStatusBadge, StatusCodeBadge } from "../components/StatusBadge";
import PageHeader from "../components/PageHeader";
import Panel from "../components/Panel";
import EmptyState from "../components/EmptyState";

interface Segment {
  event: TraceEvent;
  offsetPct: number;
  widthPct: number;
}

function buildSegments(events: TraceEvent[]): { segments: Segment[]; total: number } {
  const total = Math.max(
    events.reduce((sum, e) => sum + e.duration_ms, 0),
    0.001
  );
  let cursor = 0;
  const segments = events.map((event) => {
    const offsetPct = (cursor / total) * 100;
    const widthPct = Math.max((event.duration_ms / total) * 100, 0.6);
    cursor += event.duration_ms;
    return { event, offsetPct, widthPct };
  });
  return { segments, total };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="mono flex items-center gap-1 rounded border border-hairline px-1.5 py-0.5 text-2xs text-ink-faint hover:border-baseline hover:text-ink-muted dark:border-hairline-dark dark:hover:border-baseline-dark"
    >
      {copied ? <Check size={11} strokeWidth={2} /> : <Copy size={11} strokeWidth={1.75} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function ExecutionTimeline() {
  const { traceId } = useParams<{ traceId: string }>();
  const [trace, setTrace] = useState<TraceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const focusedRef = useRef(0);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!traceId) return;
    api
      .getTrace(traceId)
      .then(setTrace)
      .catch(() => setError(`No trace found for ${traceId}`));
  }, [traceId]);

  const events = trace?.timeline ?? [];
  const { segments, total } = useMemo(() => buildSegments(events), [events]);
  const ruler = useMemo(() => [0, 0.25, 0.5, 0.75, 1].map((f) => f * total), [total]);
  const usedStages = useMemo(() => Array.from(new Set(events.map((e) => e.component.split(":")[0]))), [events]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!events.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(focusedRef.current + 1, events.length - 1);
        focusedRef.current = next;
        rowRefs.current[next]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const next = Math.max(focusedRef.current - 1, 0);
        focusedRef.current = next;
        rowRefs.current[next]?.focus();
      } else if (e.key === "Escape") {
        setExpanded(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [events.length]);

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

  const request = trace.request as { method?: string; path?: string };
  const response = trace.response as { status_code?: number };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Execution Timeline"
        description={
          <span className="mono">
            {request.method} {request.path} · {trace.trace_id}
          </span>
        }
        actions={
          <Link to={`/traces/${trace.trace_id}/graph`} className="text-xs text-series-1 hover:underline">
            View execution graph →
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <Panel className="px-5 py-4">
          <div className="text-xs text-ink-muted dark:text-ink-muted-dark">Total duration</div>
          <div className="tabular mt-1.5 text-2xl font-semibold">
            {trace.performance.total_duration_ms.toFixed(3)} ms
          </div>
        </Panel>
        <Panel className="px-5 py-4">
          <div className="text-xs text-ink-muted dark:text-ink-muted-dark">Response status</div>
          <div className="mt-1.5">
            <StatusCodeBadge status={response.status_code ?? 0} />
          </div>
        </Panel>
        <Panel className="px-5 py-4">
          <div className="text-xs text-ink-muted dark:text-ink-muted-dark">Stages recorded</div>
          <div className="tabular mt-1.5 text-2xl font-semibold">{events.length}</div>
        </Panel>
      </div>

      {events.length === 0 ? (
        <Panel>
          <EmptyState icon={Waypoints} title="This trace recorded no pipeline stages." />
        </Panel>
      ) : (
        <Panel className="overflow-hidden">
          {/* ms ruler */}
          <div className="grid grid-cols-[160px_1fr_90px_74px] items-center gap-3 border-b border-hairline px-4 py-2 dark:border-hairline-dark">
            <span className="text-2xs font-medium uppercase tracking-wide text-ink-faint">Stage</span>
            <div className="relative h-3.5">
              {ruler.map((ms, i) => (
                <span
                  key={i}
                  className="mono absolute top-0 -translate-x-1/2 text-2xs text-ink-faint first:translate-x-0 last:-translate-x-full"
                  style={{ left: `${(i / (ruler.length - 1)) * 100}%` }}
                >
                  {ms.toFixed(1)}ms
                </span>
              ))}
            </div>
            <span className="text-right text-2xs font-medium uppercase tracking-wide text-ink-faint">
              Duration
            </span>
            <span className="text-right text-2xs font-medium uppercase tracking-wide text-ink-faint">
              Status
            </span>
          </div>

          <div>
            {segments.map(({ event, offsetPct, widthPct }, i) => (
              <div key={i} className="border-b border-hairline last:border-0 dark:border-hairline-dark">
                <button
                  ref={(el) => (rowRefs.current[i] = el)}
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  onFocus={() => (focusedRef.current = i)}
                  className="grid w-full grid-cols-[160px_1fr_90px_74px] items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-plane focus-visible:bg-plane dark:hover:bg-plane-dark dark:focus-visible:bg-plane-dark"
                >
                  <span className="flex items-center gap-2 truncate">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: colorForStage(event.component) }}
                    />
                    <span className="truncate font-medium">{event.component}</span>
                  </span>
                  <span className="relative h-4 rounded bg-plane dark:bg-plane-dark">
                    <span
                      className="absolute inset-y-0 rounded"
                      style={{
                        left: `${offsetPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: colorForStage(event.component),
                        opacity: event.status === "error" ? 0.55 : 1,
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
                  <div className="bg-plane px-4 py-3 dark:bg-plane-dark">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
                        {event.action}
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/traces/${trace.trace_id}/graph?focus=n${i + 1}`}
                          className="flex items-center gap-1 rounded border border-hairline px-1.5 py-0.5 text-2xs text-ink-faint hover:border-baseline hover:text-ink-muted dark:border-hairline-dark dark:hover:border-baseline-dark"
                        >
                          <GitBranch size={11} strokeWidth={1.75} />
                          View in graph
                        </Link>
                        <CopyButton text={JSON.stringify({ action: event.action, ...event.metadata }, null, 2)} />
                      </div>
                    </div>
                    <pre className="mono overflow-x-auto text-xs text-ink-muted dark:text-ink-muted-dark">
                      {JSON.stringify({ action: event.action, ...event.metadata }, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-faint">
        <span className="font-medium text-ink-muted dark:text-ink-muted-dark">Pipeline stages</span>
        {usedStages.map((stage) => (
          <span key={stage} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: STAGE_COLORS[stage] ?? "#898781" }}
            />
            {stage}
          </span>
        ))}
        <span className="ml-auto">↑↓ to move · Enter to expand · Esc to collapse</span>
      </div>
    </div>
  );
}
