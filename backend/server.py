"""ExplainHTTP entrypoint.

Usage::

    python server.py

Configuration is read entirely from environment variables (see config.py),
which makes this friendly to containerized and PaaS deployments (Docker,
Railway, Render) without any code changes.
"""
from __future__ import annotations

from config import load_config
from core.socket_server import SocketServer
from routes import build_app


def main() -> None:
    config = load_config()
    app = build_app(config)
    server = SocketServer(
        host=config.host,
        port=config.port,
        app=app,
        backlog=config.socket_backlog,
        conn_timeout=config.connection_timeout,
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        app.logger.info("Shutting down")
        server.stop()


if __name__ == "__main__":
    main()
