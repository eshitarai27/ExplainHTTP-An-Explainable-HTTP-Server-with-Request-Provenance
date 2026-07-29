# ExplainHTTP

An HTTP/1.1 server written from scratch in Python, with a dashboard that
shows exactly what happens to every request as it moves through the server.

[![CI](https://github.com/eshitarai27/ExplainHTTP-An-Explainable-HTTP-Server-with-Request-Provenance/actions/workflows/ci.yml/badge.svg)](https://github.com/eshitarai27/ExplainHTTP-An-Explainable-HTTP-Server-with-Request-Provenance/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](backend/requirements.txt)

## Live demo

- **Project tour**: https://explainhttp-dashboard.vercel.app — an interactive
  walkthrough of the whole system (architecture, request lifecycle, the
  explainability pipeline, design trade-offs). Start here if you're new to
  the project.
- **Dashboard**: https://explainhttp-dashboard.vercel.app/dashboard — the
  live operational view: traces, execution graphs, metrics, logs.
- **API**: https://explainhttp-backend-production.up.railway.app

Run `curl https://explainhttp-backend-production.up.railway.app/hello/world`
and then look that request up in the dashboard's Trace Viewer.

## Table of contents

- [What this is](#what-this-is)
- [Features](#features)
- [Architecture](#architecture)
- [Running it locally](#running-it-locally)
- [Docker](#docker)
- [Deployment](#deployment)
- [API](#api)
- [Trace engine](#trace-engine)
- [Execution graph](#execution-graph)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Extension hooks](#extension-hooks)
- [License](#license)

## What this is

Web frameworks hide the parts of an HTTP server that actually do the work:
the socket, the request parser, the router, the response builder. This
project doesn't use one. It's built directly on Python's `socket` module
and the rest of the standard library, and every layer between the raw TCP
connection and the response you get back is plain, readable Python.

On top of that is a tracing layer. Every request is given a trace ID, and
every stage it passes through gets timed and logged: when it started, how
long it took, and whether it succeeded. Nothing here is inferred by a
model. It's instrumentation, recorded as the request runs.

Send a request and you get back:

- the normal HTTP response, with an `X-Trace-ID` header
- a full trace of that request at `GET /trace/<trace_id>`, listing every
  stage with its timing and status
- a graph of that same trace, exportable as JSON, Graphviz DOT, or a Cypher
  script you can paste straight into Neo4j

## Features

- Threaded TCP socket server, standard library only (`core/socket_server.py`)
- HTTP/1.1 parser: request line, headers, `Content-Length` and chunked
  bodies, keep-alive connections (`core/parser.py`, `core/connection.py`)
- Router with static and dynamic routes (`/users/<id>`), correct 404 vs 405
  handling (`core/router.py`)
- Ordered middleware chain: CORS, gzip compression (`core/middleware.py`)
- Response builder with JSON, text, HTML, and byte helpers, plus gzip
  (`core/response.py`)
- Static file serving with MIME detection and path traversal protection
  (`handlers/static_handler.py`)
- Structured JSON logging tied to trace IDs (`logger/`)
- Runtime metrics: latency, status codes, request counts, uptime
  (`metrics/`)
- Trace engine recording every stage of every request (`tracing/`)
- Graph export per trace as `graph.json`, `graph.dot`, and `graph.cypher`
  (`graph/`)
- Lifecycle hooks for extending request handling without touching core
  code (`core/hooks.py`)
- A dashboard built with React, TypeScript, Tailwind, React Flow, and
  Recharts — traces, execution graphs, metrics, and logs, all polling the
  live API
- An interactive project tour (`/`) that explains the architecture, the
  request lifecycle, and the engineering trade-offs behind the server,
  built on the same design system as the dashboard itself

## Architecture

```mermaid
flowchart LR
    Client([Client]) -->|TCP| Socket[Socket Server]
    Socket --> Connection["Connection<br/>keep-alive loop"]
    Connection --> Parser[HTTP Parser]
    Parser --> Router
    Router --> Middleware[Middleware chain]
    Middleware --> Handler[Route Handler]
    Handler --> Response[Response Builder]
    Response --> Connection
    Connection -->|bytes| Client

    Connection -.records.-> Trace[(Trace Store)]
    Router -.records.-> Trace
    Middleware -.records.-> Trace
    Handler -.records.-> Trace
    Response -.records.-> Trace

    Trace --> GraphAPI["/trace, /graph.json|.dot|.cypher"]
    Trace --> MetricsAPI["/metrics"]
    GraphAPI --> Dashboard[React Dashboard]
    MetricsAPI --> Dashboard
```

Each box above is a real module, not a rough grouping. See
[`docs/architecture.md`](docs/architecture.md) for the full layout, a
sequence diagram of a single request, and the concurrency model (one
thread per connection).

No screenshots are checked into this repo. The dashboard is live, so the
fastest way to see it is to run it yourself, or visit the demo link above.

## Running it locally

### Backend

```bash
cd backend
pip install -r requirements-dev.txt   # only needed to run tests
python server.py                      # listens on http://0.0.0.0:8080
```

```bash
curl -i http://localhost:8080/hello/world
curl http://localhost:8080/metrics
```

Configuration comes entirely from environment variables, read in
`backend/config.py`:

| Variable | Default | Purpose |
|---|---|---|
| `EXPLAINHTTP_HOST` | `0.0.0.0` | Bind address |
| `EXPLAINHTTP_PORT` | `8080` (or `PORT` if set) | Bind port |
| `EXPLAINHTTP_STATIC_DIR` | `backend/static` | Static file root |
| `EXPLAINHTTP_MAX_TRACES` | `500` | Max traces kept in memory |
| `EXPLAINHTTP_LOG_LEVEL` | `INFO` | Logger level |
| `EXPLAINHTTP_BACKLOG` | `128` | Socket listen backlog |
| `EXPLAINHTTP_CONN_TIMEOUT` | `30` | Per-connection socket timeout, seconds |
| `EXPLAINHTTP_CORS_ORIGIN` | `*` | `Access-Control-Allow-Origin` value |

### Frontend

```bash
cd frontend
cp .env.example .env   # set VITE_API_BASE_URL if the backend isn't local
npm install
npm run dev             # listens on http://localhost:5173
```

## Docker

```bash
docker compose up --build
```

Starts both services: backend on `http://localhost:8080`, frontend on
`http://localhost:3000`. The frontend image bakes `VITE_API_BASE_URL` in at
build time, since a static site can't read environment variables at
runtime. Set it in `docker-compose.yml` or `.env` to wherever the backend
is actually reachable from a browser.

## Deployment

The live demo runs on:

- Frontend on Vercel, project `eshita-rai/explainhttp`, deployed from
  `frontend/` with `vercel --prod`. `VITE_API_BASE_URL` is set as a project
  environment variable, pointing at the Railway backend.
- Backend on Railway, deployed from `backend/` with `railway up
  ./backend --path-as-root`. `backend/Procfile` tells Railway how to start
  it, and `config.py` reads whatever port Railway assigns automatically.

Both of these are manual CLI deploys rather than push-to-deploy. Connecting
each project to the GitHub repo through its dashboard would make every push
to `main` redeploy on its own.

Render works as a backend alternative with the same Procfile setup, with
one catch: it requires a payment method on file before creating any
service, even on the free tier, which is why Railway was used instead.

Both services can also run from the Dockerfiles in `docker/` on any
platform that builds from a Dockerfile.

## API

Full reference: [`docs/api.md`](docs/api.md).

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Welcome message and route index |
| GET | `/hello/<name>`, `/users/<id>` | Dynamic routing examples |
| POST | `/echo` | Echoes the JSON body back |
| GET | `/slow`, `/error` | Latency and error examples |
| GET | `/static/<path>` | Static file serving |
| GET | `/trace/<trace_id>` | Full trace: timeline, timing, graph |
| GET | `/traces` | Recent traces |
| GET | `/graph/<trace_id>.{json,dot,cypher}` | Graph export |
| GET | `/metrics` | Runtime metrics |
| GET | `/logs` | Recent structured log lines |

## Trace engine

Every request gets a trace ID as soon as its connection is read. As it
moves through the pipeline, each stage logs one event:

```
Connection Accepted → HTTP Parsed → Route Matched → Middleware Executed →
Handler Executed → Response Built → Socket Sent
```

Each event records `component`, `action`, `timestamp`, `duration_ms`,
`status`, and metadata specific to that stage. Pull up a request's full
trace using the `X-Trace-ID` header from its response:

```bash
curl -i http://localhost:8080/hello/eshita   # check the X-Trace-ID header
curl http://localhost:8080/trace/<trace_id>
```

```json
{
  "trace_id": "89c08f71240e4f5fa324aa4cd75262bb",
  "performance": { "total_duration_ms": 0.787, "by_component_ms": { "Parser": 0.056, "Handler": 0.047 } },
  "timeline": [
    { "component": "Connection", "action": "accept_request", "duration_ms": 0.044, "status": "ok" },
    { "component": "Parser", "action": "parse_request", "duration_ms": 0.056, "status": "ok" },
    { "component": "Router", "action": "match_route", "duration_ms": 0.019, "status": "ok" },
    { "component": "Handler", "action": "execute_handler", "duration_ms": 0.047, "status": "ok" },
    { "component": "Response", "action": "build_response", "duration_ms": 0.000, "status": "ok" },
    { "component": "Socket", "action": "send_response", "duration_ms": 0.199, "status": "ok" }
  ]
}
```

Traces sit in a bounded, thread-safe in-memory store
(`tracing/trace_store.py`). The most recent `EXPLAINHTTP_MAX_TRACES` stay
available; older ones are dropped.

## Execution graph

`GET /graph/<trace_id>.cypher` turns a trace into a graph and writes it out
as Cypher `CREATE` statements, ready to paste into the Neo4j Browser or run
with `cypher-shell < graph.cypher`:

```cypher
CREATE (v0:Request {id: "89c08f71..._n0", trace_id: "89c08f71...", label: "Request", status: "ok", duration_ms: 0.0000, metadata: "..."})
CREATE (v1:Connection {id: "89c08f71..._n1", trace_id: "89c08f71...", label: "Connection", status: "ok", duration_ms: 0.0441, metadata: "..."})
CREATE (v2:Parser {id: "89c08f71..._n2", trace_id: "89c08f71...", label: "Parser", status: "ok", duration_ms: 0.0561, metadata: "..."})

CREATE (v0)-[:ACCEPTED_BY]->(v1)
CREATE (v1)-[:PARSED_BY]->(v2)
```

The same graph is available as `graph.json`, which the dashboard's Graph
Viewer renders with React Flow, and `graph.dot`, which Graphviz can turn
into an image with `dot -Tsvg graph.dot -o graph.svg`.

## Testing

```bash
cd backend
pip install -r requirements-dev.txt
pytest -v
```

Covers the parser (request line and header parsing, chunked decoding), the
router (static and dynamic matching, 404 vs 405), the middleware chain
(ordering, the built-in CORS and compression middleware), the trace engine
(`TraceRecorder`, `TraceStore` eviction, graph building), and a full
integration pass through `Application.handle_request`, routing through
middleware, the handler, hooks, and the response, including the 500 path.

## Project structure

```
ExplainHTTP/
├── backend/
│   ├── core/       sockets, parsing, routing, middleware, hooks
│   ├── tracing/    Trace, TraceEvent, TraceStore
│   ├── graph/      trace -> graph.json / .dot / .cypher
│   ├── logger/     structured JSON logging
│   ├── metrics/    runtime counters
│   ├── handlers/   demo routes, static files, trace/graph/metrics API
│   ├── tests/      pytest suite
│   └── app.py, routes.py, server.py, config.py
├── frontend/
│   └── src/
│       ├── pages/       ProjectOverview (home), Dashboard, TraceViewer,
│       │                ExecutionTimeline, GraphViewer, Metrics, Logs
│       ├── components/  Layout, CommandPalette, Panel, PageHeader,
│       │                EmptyState, Disclosure, StatTile, StatusBadge,
│       │                overview/ (tour-specific diagrams and code excerpts)
│       └── lib/         API client, shared types, theme context, chart
│                        theming, stage color mapping, animation hooks
├── docker/         Dockerfiles and nginx config
├── docs/           architecture and API reference
└── .github/workflows/   CI: pytest matrix, frontend build
```

## Extension hooks

`core/hooks.py` fires six named hooks around every request, none of them
registered by default:

```
before_request → before_handler → after_handler → before_response → after_request → after_response
```

Anything can register against a hook name and run without touching the
core pipeline:

```python
def log_slow_requests(request, trace, **_):
    if trace.total_duration_ms > 100:
        print(f"slow request: {request.method} {request.path}")

app.hooks.register("after_request", log_slow_requests)
```

Whatever a hook does still shows up in the trace and the execution graph
like any other event, since hooks run inside the same pipeline every
request already goes through.

## License

[MIT](LICENSE)
