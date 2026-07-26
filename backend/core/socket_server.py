"""The TCP socket server.

Binds a listening socket, accepts incoming connections in a loop, and hands
each connection off to its own daemon worker thread so slow clients never
block new connections from being accepted. This threaded model is the
simplest correct way to build a concurrent TCP server with nothing but the
standard library, and keeps the "how does this actually work" story easy to
follow end-to-end.
"""
from __future__ import annotations

import socket
import threading
from typing import Optional

from .connection import Connection


class SocketServer:
    """A minimal, from-scratch, threaded HTTP/1.1 TCP server."""

    def __init__(
        self,
        host: str,
        port: int,
        app,
        backlog: int = 128,
        conn_timeout: float = 30.0,
    ) -> None:
        self.host = host
        self.port = port
        self.app = app
        self.backlog = backlog
        self.conn_timeout = conn_timeout
        self._server_socket: Optional[socket.socket] = None
        self._running = False

    def serve_forever(self) -> None:
        """Bind, listen, and accept connections until :meth:`stop` is called."""
        self._server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._server_socket.bind((self.host, self.port))
        self._server_socket.listen(self.backlog)
        self._running = True
        self.app.logger.info(f"ExplainHTTP listening on {self.host}:{self.port}")

        try:
            while self._running:
                try:
                    client_sock, addr = self._server_socket.accept()
                except OSError:
                    break
                thread = threading.Thread(
                    target=self._handle_client,
                    args=(client_sock, addr),
                    daemon=True,
                    name=f"conn-{addr[0]}:{addr[1]}",
                )
                thread.start()
        finally:
            self._server_socket.close()

    def _handle_client(self, client_sock: socket.socket, addr) -> None:
        Connection(client_sock, addr, self.app, timeout=self.conn_timeout).serve()

    def stop(self) -> None:
        """Stop accepting new connections. In-flight connections finish naturally."""
        self._running = False
        if self._server_socket is not None:
            try:
                self._server_socket.close()
            except OSError:
                pass
