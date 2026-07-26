"""Demo application routes that exercise dynamic routing, JSON bodies, and
error handling -- useful both as a smoke test and as example traces to
explore in the dashboard."""
from __future__ import annotations

import time

from core.request import Request
from core.response import Response

WELCOME = {
    "message": "Welcome to ExplainHTTP",
    "description": (
        "An HTTP/1.1 server built from scratch in Python that explains "
        "exactly how it handles every request: parsing, routing, "
        "middleware, and response construction, all captured as an "
        "inspectable execution trace."
    ),
    "try": [
        "GET /hello/<name>",
        "GET /users/<id>",
        "POST /echo",
        "GET /slow",
        "GET /error",
        "GET /trace/<trace_id>",
        "GET /metrics",
        "GET /logs",
    ],
}


def index(request: Request) -> Response:
    return Response.json(WELCOME)


def hello(request: Request) -> Response:
    name = request.path_params.get("name", "world")
    return Response.json({"message": f"Hello, {name}!"})


def get_user(request: Request) -> Response:
    user_id = request.path_params.get("id")
    return Response.json({"id": user_id, "type": "demo-user"})


def echo(request: Request) -> Response:
    payload = request.json()
    return Response.json({"you_sent": payload, "headers": request.headers}, status_code=200)


def slow(request: Request) -> Response:
    delay = float(request.query("ms", "250")) / 1000
    time.sleep(min(delay, 5.0))
    return Response.json({"message": f"Slept for {delay * 1000:.0f}ms"})


def boom(request: Request) -> Response:
    raise RuntimeError("Deliberate failure for demonstrating 500 handling and error traces")
