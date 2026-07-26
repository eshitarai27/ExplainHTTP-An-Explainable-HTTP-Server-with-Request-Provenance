"""Runtime configuration for ExplainHTTP, sourced from environment variables."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent


@dataclass(frozen=True)
class Config:
    host: str = os.environ.get("EXPLAINHTTP_HOST", "0.0.0.0")
    port: int = int(os.environ.get("EXPLAINHTTP_PORT", "8080"))
    static_dir: Path = Path(os.environ.get("EXPLAINHTTP_STATIC_DIR", str(BACKEND_DIR / "static")))
    max_traces: int = int(os.environ.get("EXPLAINHTTP_MAX_TRACES", "500"))
    log_level: str = os.environ.get("EXPLAINHTTP_LOG_LEVEL", "INFO")
    socket_backlog: int = int(os.environ.get("EXPLAINHTTP_BACKLOG", "128"))
    connection_timeout: float = float(os.environ.get("EXPLAINHTTP_CONN_TIMEOUT", "30"))
    cors_origin: str = os.environ.get("EXPLAINHTTP_CORS_ORIGIN", "*")


def load_config() -> Config:
    """Build a Config instance from the current environment."""
    return Config()
