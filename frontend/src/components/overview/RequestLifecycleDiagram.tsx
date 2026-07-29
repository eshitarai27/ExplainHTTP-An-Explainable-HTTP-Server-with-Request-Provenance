import { useEffect } from "react";
import { Play } from "lucide-react";
import { STAGE_COLORS } from "../../lib/colors";
import { useStepReplay } from "../../lib/useStepReplay";
import { useInView } from "../../lib/useInView";

const STAGES: { name: string; module: string; detail: string }[] = [
  {
    name: "Request",
    module: "client → socket",
    detail: "A client opens a TCP connection and writes raw HTTP/1.1 bytes onto the wire.",
  },
  {
    name: "Connection",
    module: "core/connection.py",
    detail:
      "Reads bytes off the socket, frames a full request (Content-Length or chunked body), and owns HTTP/1.1 keep-alive so one socket can serve many requests in sequence.",
  },
  {
    name: "Parser",
    module: "core/parser.py",
    detail:
      "Turns the framed bytes into a method, path, headers, and body. Deliberately has no socket I/O of its own — it only knows how to read bytes it's handed.",
  },
  {
    name: "Router",
    module: "core/router.py",
    detail:
      "Matches the path against compiled <param> patterns. If the path matches but the method doesn't, that's a 405, not a 404 — the router tracks the difference.",
  },
  {
    name: "Middleware",
    module: "core/middleware.py",
    detail:
      "An ordered chain-of-responsibility wraps the handler — CORS then gzip compression, by default, each one able to inspect or rewrite the response.",
  },
  {
    name: "Handler",
    module: "route function",
    detail: "The matched route function runs against the parsed Request and returns a Response.",
  },
  {
    name: "Response",
    module: "core/response.py",
    detail: "Serializes the status line, headers, and body into HTTP/1.1 wire format, gzip-encoding when negotiated.",
  },
  {
    name: "Socket",
    module: "core/connection.py",
    detail:
      "Writes the response bytes back to the client, then either waits — untimed — for the next pipelined request, or closes the connection.",
  },
];

export default function RequestLifecycleDiagram() {
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  const { step, playing, play } = useStepReplay(STAGES.length, 450);

  useEffect(() => {
    if (inView) play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  const activeIndex = Math.max(step, 0);

  return (
    <div ref={ref}>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs text-ink-faint">
          Every request is timed through all eight stages, in order, on the thread that owns its connection.
        </span>
        <button
          onClick={play}
          className="flex items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1 text-xs text-ink-muted hover:border-baseline hover:text-ink dark:border-hairline-dark dark:text-ink-muted-dark dark:hover:border-baseline-dark dark:hover:text-ink-dark"
        >
          <Play size={12} strokeWidth={1.75} />
          {playing ? "Replaying…" : "Replay"}
        </button>
      </div>

      <div className="flex flex-wrap items-stretch gap-1.5 sm:flex-nowrap">
        {STAGES.map((stage, i) => {
          const active = i <= step;
          const current = i === Math.max(step, 0);
          return (
            <button
              key={stage.name}
              onClick={() => play()}
              className="group flex flex-1 flex-col items-center gap-1.5 rounded-md border px-1.5 py-2.5 text-center transition-all duration-300"
              style={{
                borderColor: current ? STAGE_COLORS[stage.name] : "transparent",
                backgroundColor: active ? `${STAGE_COLORS[stage.name]}1f` : "transparent",
              }}
            >
              <span
                className="h-2 w-2 rounded-full transition-transform duration-300"
                style={{
                  backgroundColor: STAGE_COLORS[stage.name],
                  transform: current ? "scale(1.4)" : "scale(1)",
                }}
              />
              <span
                className="text-2xs font-medium transition-colors"
                style={{ color: active ? STAGE_COLORS[stage.name] : undefined }}
              >
                {stage.name}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-md border border-hairline bg-plane px-4 py-3 text-sm transition-all duration-300 dark:border-hairline-dark dark:bg-plane-dark">
        <div className="mono mb-1 text-2xs text-ink-faint">{STAGES[activeIndex].module}</div>
        <div className="text-ink-muted dark:text-ink-muted-dark">{STAGES[activeIndex].detail}</div>
      </div>
    </div>
  );
}
