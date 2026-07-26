"""Unit tests for core.router: static and dynamic route matching."""
from __future__ import annotations

from core.request import Request
from core.response import Response
from core.router import Router


def make_request(method: str, path: str) -> Request:
    return Request(
        method=method,
        path=path,
        http_version="HTTP/1.1",
        headers={},
        body=b"",
        query_params={},
        client_addr="127.0.0.1:0",
    )


def dummy_handler(request: Request) -> Response:
    return Response.text("ok")


def test_matches_static_route():
    router = Router()
    router.add_route("GET", "/health", dummy_handler)
    route, params, path_matched_other = router.match("GET", "/health")
    assert route is not None
    assert params == {}
    assert path_matched_other is False


def test_matches_dynamic_route_and_extracts_params():
    router = Router()
    router.add_route("GET", "/users/<id>", dummy_handler)
    route, params, _ = router.match("GET", "/users/42")
    assert route is not None
    assert params == {"id": "42"}


def test_dynamic_segment_does_not_cross_slash_boundaries():
    router = Router()
    router.add_route("GET", "/users/<id>", dummy_handler)
    route, _, path_matched_other = router.match("GET", "/users/42/profile")
    assert route is None
    assert path_matched_other is False


def test_multiple_dynamic_segments():
    router = Router()
    router.add_route("GET", "/orgs/<org_id>/repos/<repo_id>", dummy_handler)
    route, params, _ = router.match("GET", "/orgs/acme/repos/explainhttp")
    assert route is not None
    assert params == {"org_id": "acme", "repo_id": "explainhttp"}


def test_returns_405_signal_when_path_matches_but_method_does_not():
    router = Router()
    router.add_route("POST", "/echo", dummy_handler)
    route, params, path_matched_other = router.match("GET", "/echo")
    assert route is None
    assert path_matched_other is True


def test_returns_404_signal_when_no_route_matches_path():
    router = Router()
    router.add_route("GET", "/health", dummy_handler)
    route, params, path_matched_other = router.match("GET", "/nonexistent")
    assert route is None
    assert path_matched_other is False


def test_allowed_methods_lists_every_method_for_a_path():
    router = Router()
    router.add_route("GET", "/echo", dummy_handler)
    router.add_route("POST", "/echo", dummy_handler)
    assert router.allowed_methods("/echo") == ["GET", "POST"]


def test_decorator_registration():
    router = Router()

    @router.get("/ping")
    def ping(request: Request) -> Response:
        return Response.text("pong")

    route, _, _ = router.match("GET", "/ping")
    assert route is not None
    assert route.handler is ping
