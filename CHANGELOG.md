# Changelog

## v1.0.0

Initial release.

- From-scratch HTTP/1.1 server (stdlib-only): threaded TCP socket server,
  request parser (chunked + `Content-Length` bodies, keep-alive), router
  with dynamic `<param>` segments, ordered middleware pipeline, response
  builder with gzip support, and static file serving.
- Execution trace engine: every request gets a trace ID; every pipeline
  stage records a timed, structured event, queryable via `GET /trace/<id>`.
- Request graph generation: `graph.json`, `graph.dot` (Graphviz), and
  `graph.cypher` (Neo4j-importable) exports per trace.
- Structured JSON logging and runtime metrics (`/logs`, `/metrics`).
- Extension hook interface (`core/hooks.py`) as the seam for the future
  ChaosHTTP project, with zero hooks registered by default.
- React + TypeScript + Tailwind dashboard: Dashboard, Trace Viewer,
  Execution Timeline, Graph Viewer (React Flow, with request replay),
  Metrics (Recharts), and Logs.
- Backend pytest suite (parser, router, middleware, tracing, full pipeline
  integration) and a CI workflow running it across Python 3.10-3.12
  alongside a frontend typecheck/build.
- Dockerfiles for both services plus `docker-compose.yml`, and deployment
  notes for Vercel (frontend) and Railway/Render (backend).
