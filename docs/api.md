# API Reference

Base URL defaults to `http://localhost:8080` (override with `EXPLAINHTTP_PORT` /
`EXPLAINHTTP_HOST`). Every response includes an `X-Trace-ID` header.

## Demo application routes

| Method | Path | Description |
|---|---|---|
| GET | `/` | Welcome payload describing the server and available routes. |
| GET | `/hello/<name>` | Dynamic route example. Returns `{"message": "Hello, <name>!"}`. |
| GET | `/users/<id>` | Another dynamic route example. |
| POST | `/echo` | Echoes the parsed JSON request body back to the client. |
| GET | `/slow?ms=250` | Sleeps for `ms` milliseconds (capped at 5000) -- useful for seeing latency show up in a trace. |
| GET | `/error` | Deliberately raises an exception, demonstrating 500 handling and error trace events. |
| GET | `/static/<path>` | Serves a file from `backend/static/`, with path-traversal protection. |

## Explainability API

| Method | Path | Description |
|---|---|---|
| GET | `/trace/<trace_id>` | Full trace detail: `timeline`, `performance`, `execution_graph`, `events`, and the original `request`/`response` summaries. |
| GET | `/traces?limit=50` | The most recent traces (newest first), for the Trace Viewer / Dashboard. |
| GET | `/graph/<trace_id>.json` | The execution graph as JSON (nodes + edges). |
| GET | `/graph/<trace_id>.dot` | The execution graph as Graphviz DOT. |
| GET | `/graph/<trace_id>.cypher` | The execution graph as a Neo4j `CREATE` script. |
| GET | `/metrics` | Runtime metrics snapshot: uptime, total requests, active connections, error count, average latency, status code counts, and per-route counts/latency. |
| GET | `/logs?limit=200` | The most recent structured log lines (newest first). |

### `GET /trace/<trace_id>` response shape

```json
{
  "trace_id": "89c08f71240e4f5fa324aa4cd75262bb",
  "timeline": [ { "component": "Connection", "action": "accept_request", "timestamp": 1785077947.335, "duration_ms": 0.044, "status": "ok", "metadata": { "client": "127.0.0.1:55449" } } ],
  "performance": { "total_duration_ms": 0.787, "by_component_ms": { "Connection": 0.044, "Parser": 0.056 } },
  "execution_graph": { "trace_id": "89c08f71...", "nodes": [ /* GraphNode[] */ ], "edges": [ /* GraphEdge[] */ ] },
  "events": [ /* same shape as timeline, in raw recorded order */ ],
  "request": { "method": "GET", "path": "/hello/eshita", "headers": { }, "query_params": {} },
  "response": { "status_code": 200, "headers": { }, "body_size": 29 }
}
```

### `GET /metrics` response shape

```json
{
  "uptime_seconds": 48.03,
  "total_requests": 5,
  "active_connections": 1,
  "errors": 1,
  "avg_latency_ms": 0.405,
  "status_counts": { "200": 3, "404": 1, "500": 1 },
  "routes": { "hello": { "count": 1, "avg_latency_ms": 0.288 } }
}
```

## Error responses

Unmatched paths return `404` and paths that exist but don't support the
request method return `405` with an `Allow` header listing the methods that
do. Unhandled exceptions inside a route handler are caught by
`Application.handle_request` and converted to a `500` -- they never crash the
connection thread, and they're still fully recorded in the trace with
`status: "error"` on the failing event.
