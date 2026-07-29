import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Boxes,
  Cable,
  Cpu,
  Code2,
  GitFork,
  Globe,
  Layers,
  Map,
  Puzzle,
  Radar,
  ShieldAlert,
  Sparkles,
  SquareStack,
  Wrench,
} from "lucide-react";
import Reveal from "../components/overview/Reveal";
import RequestLifecycleDiagram from "../components/overview/RequestLifecycleDiagram";
import ModuleInteractions from "../components/overview/ModuleInteractions";
import CodeExcerpt from "../components/overview/CodeExcerpt";
import Disclosure from "../components/Disclosure";
import Panel from "../components/Panel";

const REPO_URL = "https://github.com/eshitarai27/ExplainHTTP-An-Explainable-HTTP-Server-with-Request-Provenance";
const LIVE_API = "https://explainhttp-backend-production.up.railway.app";

const TOC = [
  { id: "why", label: "Why it exists" },
  { id: "lifecycle", label: "Request lifecycle" },
  { id: "architecture", label: "Architecture" },
  { id: "frontend", label: "Frontend" },
  { id: "pipeline", label: "Explainability pipeline" },
  { id: "interactions", label: "Module interactions" },
  { id: "stack", label: "Tech & rationale" },
  { id: "tradeoffs", label: "Decisions & trade-offs" },
  { id: "challenges", label: "Challenges" },
  { id: "limits", label: "Limitations & roadmap" },
];

function Kicker({ icon: Icon, children }: { icon: typeof Sparkles; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-2xs font-medium uppercase tracking-wide text-series-1">
      <Icon size={13} strokeWidth={2} />
      {children}
    </div>
  );
}

function Section({
  id,
  icon,
  kicker,
  title,
  description,
  children,
}: {
  id: string;
  icon: typeof Sparkles;
  kicker: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 border-t border-hairline pt-10 dark:border-hairline-dark">
      <Reveal>
        <Kicker icon={icon}>{kicker}</Kicker>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">
            {description}
          </p>
        )}
      </Reveal>
      <Reveal delayMs={80} className="mt-6">
        {children}
      </Reveal>
    </section>
  );
}

const MODULES: { name: string; path: string; summary: string; facts: string[] }[] = [
  {
    name: "Socket Server",
    path: "core/socket_server.py",
    summary: "Binds the listening socket and accepts connections in a loop.",
    facts: [
      "Each accepted connection is handed to its own daemon thread — a slow client never blocks new connections from being accepted.",
      "`stop()` just closes the listening socket; in-flight connections are left to finish naturally rather than being killed.",
    ],
  },
  {
    name: "Connection",
    path: "core/connection.py",
    summary: "The only module that touches a live client socket.",
    facts: [
      "Owns HTTP/1.1 keep-alive: it loops, reading one request at a time off the same socket until the client closes it or sends `Connection: close`.",
      "The wait for the *next* pipelined request is deliberately untimed and unrecorded — it belongs to the client's think time, not to request handling.",
      "Reads `Content-Length` bodies by byte count and `Transfer-Encoding: chunked` bodies by scanning for the terminating `0\\r\\n\\r\\n`.",
    ],
  },
  {
    name: "Parser",
    path: "core/parser.py",
    summary: "Turns raw bytes into a structured request — no I/O.",
    facts: [
      "Pure functions only: `parse_request_head`, `split_target`, `decode_chunked` — none of them touch a socket, which makes them trivial to unit test with byte strings.",
      "Header keys are lower-cased on the way in, so lookups are case-insensitive everywhere downstream.",
    ],
  },
  {
    name: "Router",
    path: "core/router.py",
    summary: "Matches (method, path) to a registered handler.",
    facts: [
      "`<param>` segments in a route path are compiled to a named-group regex once, at registration time, not on every request.",
      "Distinguishes a true 404 (no path matches) from a 405 (the path matches, just not for this method) — most from-scratch routers collapse these into one case.",
    ],
  },
  {
    name: "Middleware",
    path: "core/middleware.py",
    summary: "An explicit, ordered chain-of-responsibility around the handler.",
    facts: [
      "Registered once via `app.use(...)`; every request runs through all of them, in order, each wrapping the next as a closure.",
      "Ships two built-ins: CORS headers and gzip compression, applied by returning through the chain rather than mutating a shared response object.",
    ],
  },
  {
    name: "Hooks",
    path: "core/hooks.py",
    summary: "Six named extension seams, all no-ops by default.",
    facts: [
      "`before_request → before_handler → after_handler → before_response → after_request → after_response` fire on every request whether or not anything is registered.",
      "A hook callback that raises is caught and discarded — a misbehaving extension can never take the server down.",
    ],
  },
  {
    name: "Trace engine",
    path: "tracing/trace.py",
    summary: "Records what actually happened, as it happens.",
    facts: [
      "`TraceRecorder` is a context manager: entering it starts a `perf_counter`, exiting it records a `TraceEvent` — even if the wrapped block raised.",
      "`Trace.timeline()` returns events sorted by timestamp; `Trace.performance()` rolls them up by component for a per-stage latency breakdown.",
    ],
  },
  {
    name: "Trace store",
    path: "tracing/trace_store.py",
    summary: "Thread-safe, bounded in-memory history.",
    facts: [
      "Backed by an `OrderedDict` guarded by a single `threading.Lock`; inserting past `max_traces` evicts the oldest entry.",
      "This is the only place besides `Metrics` where multiple connection threads touch shared state.",
    ],
  },
  {
    name: "Graph builder & exporters",
    path: "graph/",
    summary: "Turns a Trace into a portable execution graph.",
    facts: [
      "One synthetic `Request` node followed by one node per trace event, joined by edges labeled from a small (from-type, to-type) → relationship lookup table.",
      "The same graph renders three ways: `graph.json` for React Flow, `graph.dot` for Graphviz, and `graph.cypher` — plain `CREATE` statements pasteable straight into the Neo4j Browser.",
    ],
  },
  {
    name: "Static handler",
    path: "handlers/static_handler.py",
    summary: "Serves files with explicit path-traversal protection.",
    facts: [
      "Resolves the requested path and checks `root in candidate.parents` before serving — a `../../etc/passwd` request resolves outside the root and is rejected as 404, not an error.",
      "MIME type comes from the standard library's `mimetypes` module rather than a hardcoded table.",
    ],
  },
];

const STACK: { title: string; icon: typeof Cpu; body: string }[] = [
  {
    title: "Python standard library, no framework",
    icon: Cpu,
    body:
      "The backend is built directly on socket, threading, and re — no Flask, no asyncio. The point of the project is to make the parts a framework hides (the socket, the parser, the router) visible and readable, so leaning on a framework would defeat the purpose.",
  },
  {
    title: "Thread-per-connection over an event loop",
    icon: Cable,
    body:
      "Each accepted connection gets its own daemon thread for its entire keep-alive lifetime. It's the simplest model that's still genuinely concurrent, with no event-loop machinery to explain before you can explain the server itself.",
  },
  {
    title: "Deterministic tracing, not inference",
    icon: Radar,
    body:
      "Every trace event is a real timestamp and duration recorded as the request actually moved through the pipeline — instrumentation, not a model guessing at what probably happened.",
  },
  {
    title: "React + TypeScript + Vite",
    icon: Boxes,
    body:
      "A typed, fast-refreshing SPA that talks to the backend purely over its public HTTP API — the dashboard has no special access the API doesn't expose to anyone else.",
  },
  {
    title: "React Flow for the execution graph",
    icon: GitFork,
    body:
      "The same node/edge shape the backend already exports as graph.json renders directly as an interactive diagram — no translation layer between what the server records and what the UI draws.",
  },
  {
    title: "Recharts for metrics",
    icon: Layers,
    body:
      "Runtime counters (latency, status codes, per-route volume) are simple aggregate numbers — a lightweight declarative chart library is a better fit here than hand-rolled SVG.",
  },
];

const TRADEOFFS: { title: string; body: string }[] = [
  {
    title: "The pipelined-request wait is untimed, on purpose",
    body:
      "Connection._await_next_request() blocks on the socket with no timer while idle between keep-alive requests. Timing it would inflate every trace with the client's think time — the trade-off is that a trace can't tell you how long a connection sat idle, only how long the server actually worked.",
  },
  {
    title: "Trace history is bounded and in-memory",
    body:
      "TraceStore evicts the oldest trace once EXPLAINHTTP_MAX_TRACES (default 500) is exceeded, so a long-running server can't grow memory without bound. The trade-off: restart the process, or push past the cap, and older traces are simply gone — there's no persistence layer.",
  },
  {
    title: "Hooks swallow their own exceptions",
    body:
      "HookManager.fire() catches and discards anything a registered hook raises. That makes hooks safe to extend the pipeline with, at the cost of a hook that's silently failing giving you no signal that it did.",
  },
  {
    title: "Middleware is explicit; hooks are implicit",
    body:
      "core/middleware.py is user-facing and ordered — you register it and it always runs. core/hooks.py is an infrastructure seam that does nothing unless something registers against it. Keeping them separate means the request-handling code path stays readable without guessing which extensions are active.",
  },
  {
    title: "404 vs. 405 is tracked deliberately",
    body:
      "Router.match() returns a third boolean — whether the path matched at all — specifically so a route that exists but was called with the wrong method reports 405 with an Allow header, not a bare 404. A small correctness detail most minimal routers skip.",
  },
];

const CHALLENGES: { title: string; body: string }[] = [
  {
    title: "Keeping the parser testable without a live socket",
    body:
      "Framing decisions (how many more bytes are needed) and pure parsing were split into two modules. core/parser.py takes bytes in and structured data out with zero I/O, so the parser test suite runs against byte strings directly — no socket, no server process.",
  },
  {
    title: "Tracing every middleware without polluting the handler",
    body:
      "app.py's _run_pipeline wraps each registered middleware in its own TraceRecorder(trace, f\"Middleware:{name}\", ...) closure before composing the chain, so every middleware shows up in the trace individually and by name — without the middleware functions themselves knowing tracing exists.",
  },
  {
    title: "A dashboard that has to render two different truths in dark mode",
    body:
      "Recharts and React Flow both take raw color values as props, not CSS classes — they can't react to Tailwind's dark: variant. Fixing this meant lifting theme state into a shared ThemeContext and mirroring the relevant design tokens as plain hex in lib/chartTheme.ts, so both libraries repaint correctly the moment the theme toggles.",
  },
  {
    title: "Showing a pipeline that runs in milliseconds",
    body:
      "Most stages finish in fractions of a millisecond, which makes a real-time animation meaningless. The Graph Viewer and this page's lifecycle diagram both replay a trace's already-recorded events on a fixed step interval instead — accurate about order and attribution, honest about not being real-time.",
  },
];

export default function ProjectOverview() {
  return (
    <div className="flex flex-col gap-14 pb-16">
      {/* Hero */}
      <Reveal>
        <div className="flex flex-col gap-6 pt-2">
          <div className="flex items-center gap-2 text-2xs font-medium uppercase tracking-wide text-ink-faint">
            <Sparkles size={13} strokeWidth={2} className="text-series-1" />
            Project overview
          </div>
          <div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              An HTTP/1.1 server, built to show its own work.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted dark:text-ink-muted-dark">
              ExplainHTTP is a from-scratch HTTP/1.1 server — no framework underneath it — paired with a
              dashboard that shows exactly what happened to every request as it moved through the server.
              Nothing on the trace is inferred: every stage is timed and recorded as it actually runs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["stdlib only", "thread-per-connection", "deterministic tracing", "no AI in the loop"].map((b) => (
              <span
                key={b}
                className="mono rounded-full border border-hairline px-2.5 py-1 text-2xs text-ink-muted dark:border-hairline-dark dark:text-ink-muted-dark"
              >
                {b}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 rounded-md bg-series-1 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Open the live dashboard
              <ArrowRight size={14} strokeWidth={2} />
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-md border border-hairline px-4 py-2 text-sm text-ink-muted hover:border-baseline hover:text-ink dark:border-hairline-dark dark:text-ink-muted-dark dark:hover:border-baseline-dark dark:hover:text-ink-dark"
            >
              <Code2 size={14} strokeWidth={1.75} />
              View source
            </a>
            <a
              href={LIVE_API}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-md border border-hairline px-4 py-2 text-sm text-ink-muted hover:border-baseline hover:text-ink dark:border-hairline-dark dark:text-ink-muted-dark dark:hover:border-baseline-dark dark:hover:text-ink-dark"
            >
              <Globe size={14} strokeWidth={1.75} />
              Live API
            </a>
          </div>
        </div>
      </Reveal>

      {/* Table of contents */}
      <Reveal delayMs={100}>
        <Panel className="flex flex-wrap gap-x-5 gap-y-2 px-5 py-3 text-xs text-ink-muted dark:text-ink-muted-dark">
          {TOC.map((item) => (
            <a key={item.id} href={`#${item.id}`} className="hover:text-series-1 hover:underline">
              {item.label}
            </a>
          ))}
        </Panel>
      </Reveal>

      {/* Why */}
      <Section
        id="why"
        icon={Puzzle}
        kicker="The problem"
        title="Frameworks hide the parts that actually do the work"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Panel className="p-5">
            <div className="text-sm font-medium">What it is</div>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">
              A web framework normally hides the socket, the request parser, the router, and the response
              builder behind a single decorator. This project doesn't use one — every layer between the raw
              TCP connection and the response you get back is plain, readable Python.
            </p>
          </Panel>
          <Panel className="p-5">
            <div className="text-sm font-medium">Why it was built</div>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">
              "Explainability over cleverness" is the stated design goal — every architectural choice favors
              code that reads top-to-bottom over code that's maximally fast or abstract. It's a teaching tool
              as much as it is a server.
            </p>
          </Panel>
          <Panel className="p-5">
            <div className="text-sm font-medium">What you get back</div>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">
              The normal HTTP response, an <code className="mono">X-Trace-ID</code> header, a full timeline of
              every stage that request passed through, and that same trace exported as JSON, Graphviz DOT, or a
              Cypher script ready to paste into Neo4j.
            </p>
          </Panel>
        </div>
      </Section>

      {/* Lifecycle */}
      <Section
        id="lifecycle"
        icon={Radar}
        kicker="From socket to screen"
        title="The request lifecycle"
        description="Every request is assigned a trace ID the moment its connection is read. Each stage below records one timed TraceEvent onto that trace as it executes — this is the exact sequence the Execution Timeline and Graph Viewer pages render for a real request."
      >
        <Panel className="p-5 sm:p-6">
          <RequestLifecycleDiagram />
        </Panel>
      </Section>

      {/* Architecture */}
      <Section
        id="architecture"
        icon={SquareStack}
        kicker="System design"
        title="Backend architecture, module by module"
        description="Every box in the pipeline is a real module with a single job — click one to see what it's actually responsible for."
      >
        <Panel className="divide-y divide-hairline px-5 dark:divide-hairline-dark">
          {MODULES.map((m) => (
            <Disclosure
              key={m.name}
              summary={
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="mono text-2xs text-ink-faint">{m.path}</div>
                  </div>
                </div>
              }
            >
              <div className="pb-4">
                <p className="text-sm text-ink-muted dark:text-ink-muted-dark">{m.summary}</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {m.facts.map((f, i) => (
                    <li key={i} className="flex gap-2 text-sm text-ink-muted dark:text-ink-muted-dark">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </Disclosure>
          ))}
        </Panel>
        <p className="mt-3 text-xs text-ink-faint">
          Concurrency model: <span className="mono">SocketServer</span> accepts in a single loop and hands each
          connection to its own daemon thread for its entire keep-alive lifetime.{" "}
          <span className="mono">TraceStore</span> and <span className="mono">Metrics</span> are the only state
          shared across threads, and both guard themselves with a <span className="mono">threading.Lock</span>.
        </p>
      </Section>

      {/* Frontend */}
      <Section
        id="frontend"
        icon={Boxes}
        kicker="The dashboard"
        title="Frontend architecture"
        description="A typed React SPA with no state-management library — the server is the only source of truth, so pages simply poll their endpoint and render what comes back."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Panel className="p-5">
            <div className="text-sm font-medium">Pages talk directly to the public API</div>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">
              <span className="mono">lib/api.ts</span> is a thin fetch wrapper around the same endpoints anyone
              can call with curl — <span className="mono">/metrics</span>, <span className="mono">/traces</span>,{" "}
              <span className="mono">/trace/&lt;id&gt;</span>, <span className="mono">/logs</span>. The dashboard
              has no privileged access the API doesn't expose to anyone else.
            </p>
          </Panel>
          <Panel className="p-5">
            <div className="text-sm font-medium">Polling instead of a socket</div>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">
              Dashboard, Trace Viewer, Metrics, and Logs each poll on a 3–10s interval rather than opening a
              WebSocket — simple, stateless, and resilient to a page sitting open for hours. Listed on the
              roadmap below as a place a push-based update would help.
            </p>
          </Panel>
          <Panel className="p-5">
            <div className="text-sm font-medium">One categorical palette, reused everywhere</div>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">
              <span className="mono">lib/colors.ts</span> maps each pipeline stage to a fixed color once, so a
              component's color never shifts between the Execution Timeline, the Graph Viewer, and this page's
              lifecycle diagram.
            </p>
          </Panel>
          <Panel className="p-5">
            <div className="text-sm font-medium">Two chart libraries, one design system</div>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">
              React Flow renders the exact node/edge shape the backend exports as{" "}
              <span className="mono">graph.json</span>; Recharts renders aggregate metrics. Both are re-themed
              through <span className="mono">lib/chartTheme.ts</span> so dark mode reaches them too.
            </p>
          </Panel>
        </div>
      </Section>

      {/* Explainability pipeline */}
      <Section
        id="pipeline"
        icon={Radar}
        kicker="How tracing works"
        title="The explainability pipeline"
        description="Nothing about a trace is inferred after the fact. TraceRecorder is a context manager that times whatever block it wraps and records the result onto the trace — including when that block raises."
      >
        <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <CodeExcerpt
            title="tracing/trace.py — TraceRecorder"
            code={`class TraceRecorder:
    """Context manager that times a pipeline stage and records it onto a Trace.

    If the block raises, the event is still recorded with status="error" and
    the exception propagates normally (it is never suppressed).
    """

    def __enter__(self) -> "TraceRecorder":
        self._start = time.perf_counter()
        return self

    def fail(self, reason: str) -> None:
        """Mark this step as failed without raising an exception."""
        self.status = "error"
        self.metadata["error"] = reason

    def __exit__(self, exc_type, exc, tb) -> bool:
        duration_ms = (time.perf_counter() - self._start) * 1000
        status = "error" if exc_type else self.status
        if exc_type and "error" not in self.metadata:
            self.metadata["error"] = str(exc)
        self.trace.add_event(
            TraceEvent(
                component=self.component,
                action=self.action,
                timestamp=time.time(),
                duration_ms=duration_ms,
                status=status,
                metadata=self.metadata,
            )
        )
        return False`}
          />
          <div className="flex flex-col gap-4">
            <Panel className="p-5">
              <div className="text-sm font-medium">One primitive, used everywhere</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">
                Every stage in <span className="mono">app.py</span> — routing, each middleware, the handler,
                response assembly — is wrapped in exactly this context manager. It's the entire tracing
                mechanism: no separate instrumentation layer, no decorators to remember to add.
              </p>
            </Panel>
            <Panel className="p-5">
              <div className="text-sm font-medium">Trace → graph → export</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">
                Once a request finishes, <span className="mono">graph_builder.py</span> converts its ordered
                events into nodes and edges, and <span className="mono">exporters.py</span> renders that graph
                three ways: JSON for this dashboard, DOT for Graphviz, and Cypher <span className="mono">CREATE</span>{" "}
                statements you can paste straight into the Neo4j Browser.
              </p>
            </Panel>
          </div>
        </div>
      </Section>

      {/* Module interactions */}
      <Section
        id="interactions"
        icon={GitFork}
        kicker="Wiring"
        title="How the modules interact"
        description="Not the per-request pipeline — this is how the objects are actually wired together at startup and on every call to Application.handle_request()."
      >
        <ModuleInteractions />
      </Section>

      {/* Tech + rationale */}
      <Section
        id="stack"
        icon={Wrench}
        kicker="Technology choices"
        title="What was used, and why"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STACK.map((s) => (
            <Panel key={s.title} className="p-5">
              <s.icon size={16} strokeWidth={1.75} className="text-series-1" />
              <div className="mt-3 text-sm font-medium">{s.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">{s.body}</p>
            </Panel>
          ))}
        </div>
      </Section>

      {/* Trade-offs */}
      <Section
        id="tradeoffs"
        icon={ShieldAlert}
        kicker="Engineering judgment"
        title="Decisions and the trade-offs they accepted"
      >
        <Panel className="divide-y divide-hairline px-5 dark:divide-hairline-dark">
          {TRADEOFFS.map((t) => (
            <Disclosure key={t.title} summary={<div className="text-sm font-medium">{t.title}</div>}>
              <p className="pb-4 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">{t.body}</p>
            </Disclosure>
          ))}
        </Panel>
      </Section>

      {/* Challenges */}
      <Section
        id="challenges"
        icon={Puzzle}
        kicker="What was hard"
        title="Challenges along the way"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {CHALLENGES.map((c) => (
            <Panel key={c.title} className="p-5">
              <div className="text-sm font-medium">{c.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">{c.body}</p>
            </Panel>
          ))}
        </div>
      </Section>

      {/* Limitations & roadmap */}
      <Section
        id="limits"
        icon={Map}
        kicker="Honest accounting"
        title="Limitations and what's next"
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <div className="mb-3 text-sm font-medium text-ink-muted dark:text-ink-muted-dark">
              Current limitations
            </div>
            <ul className="flex flex-col gap-3">
              {[
                "Plain HTTP/1.1 only — no TLS, HTTP/2, or HTTP/3. Deployed instances rely on their platform's edge (Railway/Vercel) for TLS termination.",
                "Trace history is in-memory and bounded (EXPLAINHTTP_MAX_TRACES, default 500) — a restart or exceeding the cap loses older traces permanently.",
                "Thread-per-connection means every open keep-alive connection holds a real OS thread — costlier under very high idle-connection counts than an async event loop.",
                "Single-process — traces and metrics aren't aggregated across multiple running instances of the server.",
                "The explainability endpoints (/trace, /metrics, /logs) have no authentication — fine for local use or a demo, not for exposing on a shared network as-is.",
              ].map((l, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-ink-muted dark:text-ink-muted-dark">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-status-serious" />
                  {l}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-3 text-sm font-medium text-ink-muted dark:text-ink-muted-dark">Roadmap</div>
            <ul className="flex flex-col gap-3">
              {[
                "Persist traces to disk or SQLite so history survives a restart.",
                "Push trace updates to the dashboard over a WebSocket instead of polling.",
                "Authentication and rate limiting on the explainability endpoints, for safe production exposure.",
                "Additional trace exporters (e.g. OpenTelemetry) alongside the existing JSON/DOT/Cypher formats.",
                "Push-to-deploy CI/CD — connect the Vercel and Railway projects to GitHub directly instead of manual CLI deploys.",
              ].map((l, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-ink-muted dark:text-ink-muted-dark">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-series-1" />
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <Reveal className="border-t border-hairline pt-8 dark:border-hairline-dark">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-ink-muted dark:text-ink-muted-dark">
            That's the whole system — from a raw TCP byte to a rendered graph.
          </p>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-series-1 hover:underline">
              Explore the live dashboard <ArrowRight size={13} strokeWidth={2} />
            </Link>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-series-1 hover:underline">
              <Code2 size={13} strokeWidth={1.75} /> Read the source
            </a>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
