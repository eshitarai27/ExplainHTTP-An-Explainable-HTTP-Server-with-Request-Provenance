"""Unit tests for the middleware chain-of-responsibility pipeline."""
from __future__ import annotations

from core.middleware import MiddlewareChain, compression_middleware, cors_middleware
from core.request import Request
from core.response import Response


def make_request(headers=None) -> Request:
    return Request(
        method="GET",
        path="/",
        http_version="HTTP/1.1",
        headers=headers or {},
        body=b"",
        query_params={},
        client_addr="127.0.0.1:0",
    )


def test_middleware_chain_runs_in_registration_order_outermost_first():
    calls = []

    def mw_a(request, call_next):
        calls.append("a-before")
        response = call_next(request)
        calls.append("a-after")
        return response

    def mw_b(request, call_next):
        calls.append("b-before")
        response = call_next(request)
        calls.append("b-after")
        return response

    def handler(request):
        calls.append("handler")
        return Response.text("ok")

    chain = MiddlewareChain()
    chain.use(mw_a)
    chain.use(mw_b)
    built = chain.build(handler)
    built(make_request())

    assert calls == ["a-before", "b-before", "handler", "b-after", "a-after"]


def test_middleware_chain_with_no_middleware_calls_handler_directly():
    chain = MiddlewareChain()
    built = chain.build(lambda request: Response.text("direct"))
    response = built(make_request())
    assert response.body == b"direct"


def test_cors_middleware_adds_headers():
    mw = cors_middleware(origin="https://example.com")
    response = mw(make_request(), lambda request: Response.text("ok"))
    assert response.headers["Access-Control-Allow-Origin"] == "https://example.com"
    assert "GET" in response.headers["Access-Control-Allow-Methods"]


def test_compression_middleware_compresses_large_bodies_when_accepted():
    mw = compression_middleware()
    big_body = "x" * 2000

    def handler(request):
        return Response.text(big_body)

    response = mw(make_request(headers={"accept-encoding": "gzip"}), handler)
    assert response.headers.get("Content-Encoding") == "gzip"
    assert len(response.body) < len(big_body)


def test_compression_middleware_skips_when_client_does_not_accept_gzip():
    mw = compression_middleware()

    def handler(request):
        return Response.text("x" * 2000)

    response = mw(make_request(headers={}), handler)
    assert "Content-Encoding" not in response.headers


def test_middleware_names_are_set_for_tracing():
    assert cors_middleware().__name__ == "cors_middleware"
    assert compression_middleware().__name__ == "compression_middleware"
