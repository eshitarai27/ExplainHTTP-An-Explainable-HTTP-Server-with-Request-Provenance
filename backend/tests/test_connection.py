"""Integration tests for core.connection.Connection: real socket I/O,
keep-alive framing, and the trace timing it produces.
"""
from __future__ import annotations

import socket
import threading
import time

from app import Application
from core.connection import Connection
from core.response import Response


def _make_connection(app: Application):
    server_sock, client_sock = socket.socketpair()
    conn = Connection(server_sock, ("test-client", 0), app, timeout=5.0)
    thread = threading.Thread(target=conn.serve, daemon=True)
    thread.start()
    return client_sock, thread


def test_keep_alive_idle_time_between_requests_is_not_counted_as_latency():
    """Regression test: a keep-alive connection may sit idle between
    requests for an arbitrary amount of time (e.g. a dashboard polling
    every few seconds). That idle wait must never be attributed to the
    next request's trace duration."""
    app = Application()
    app.get("/ping")(lambda request: Response.text("pong"))

    client_sock, thread = _make_connection(app)
    request_line = b"GET /ping HTTP/1.1\r\nHost: test\r\nConnection: keep-alive\r\n\r\n"

    client_sock.sendall(request_line)
    client_sock.recv(65536)

    time.sleep(1.0)  # simulate an idle gap on the persistent connection

    client_sock.sendall(request_line)
    client_sock.recv(65536)

    client_sock.close()
    thread.join(timeout=2)

    traces = app.trace_store.list_recent(limit=2)
    assert len(traces) == 2
    most_recent = traces[0]
    assert most_recent.total_duration_ms < 100, (
        f"expected the idle gap to be excluded from trace duration, got "
        f"{most_recent.total_duration_ms}ms"
    )


def test_connection_serves_multiple_keep_alive_requests_on_one_socket():
    app = Application()
    app.get("/ping")(lambda request: Response.text("pong"))

    client_sock, thread = _make_connection(app)
    request_line = b"GET /ping HTTP/1.1\r\nHost: test\r\nConnection: keep-alive\r\n\r\n"

    client_sock.sendall(request_line)
    first = client_sock.recv(65536)
    client_sock.sendall(request_line)
    second = client_sock.recv(65536)

    client_sock.close()
    thread.join(timeout=2)

    assert first.startswith(b"HTTP/1.1 200")
    assert second.startswith(b"HTTP/1.1 200")
    assert app.metrics.snapshot()["total_requests"] == 2


def test_connection_closes_after_connection_close_header():
    app = Application()
    app.get("/ping")(lambda request: Response.text("pong"))

    client_sock, thread = _make_connection(app)
    client_sock.sendall(b"GET /ping HTTP/1.1\r\nHost: test\r\nConnection: close\r\n\r\n")
    response = client_sock.recv(65536)

    thread.join(timeout=2)

    assert response.startswith(b"HTTP/1.1 200")
    assert not thread.is_alive()
