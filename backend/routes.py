"""Registers every HTTP route and middleware onto an Application instance.

Kept separate from ``app.py`` so the pipeline engine (Application) stays
agnostic of which specific API this particular deployment exposes.
"""
from __future__ import annotations

from pathlib import Path

from app import Application
from config import Config
from core.middleware import compression_middleware, cors_middleware
from handlers import demo_handlers, trace_handler
from handlers.static_handler import make_static_handler


def build_app(config: Config) -> Application:
    app = Application(max_traces=config.max_traces, log_level=config.log_level)

    app.use(cors_middleware(config.cors_origin))
    app.use(compression_middleware())

    # Demo application routes.
    app.router.add_route("GET", "/", demo_handlers.index, name="index")
    app.router.add_route("GET", "/hello/<name>", demo_handlers.hello, name="hello")
    app.router.add_route("GET", "/users/<id>", demo_handlers.get_user, name="get_user")
    app.router.add_route("POST", "/echo", demo_handlers.echo, name="echo")
    app.router.add_route("GET", "/slow", demo_handlers.slow, name="slow")
    app.router.add_route("GET", "/error", demo_handlers.boom, name="error")

    # Explainability API.
    app.router.add_route("GET", "/trace/<trace_id>", trace_handler.make_get_trace_handler(app), name="get_trace")
    app.router.add_route("GET", "/traces", trace_handler.make_list_traces_handler(app), name="list_traces")
    app.router.add_route(
        "GET", "/graph/<trace_id>.json", trace_handler.make_graph_export_handler(app, "json"), name="graph_json"
    )
    app.router.add_route(
        "GET", "/graph/<trace_id>.dot", trace_handler.make_graph_export_handler(app, "dot"), name="graph_dot"
    )
    app.router.add_route(
        "GET", "/graph/<trace_id>.cypher", trace_handler.make_graph_export_handler(app, "cypher"), name="graph_cypher"
    )
    app.router.add_route("GET", "/metrics", trace_handler.make_metrics_handler(app), name="metrics")
    app.router.add_route("GET", "/logs", trace_handler.make_logs_handler(app), name="logs")

    # Static file serving.
    static_dir = Path(config.static_dir)
    static_dir.mkdir(parents=True, exist_ok=True)
    app.router.add_route("GET", "/static/<path>", make_static_handler(static_dir), name="static")

    return app
