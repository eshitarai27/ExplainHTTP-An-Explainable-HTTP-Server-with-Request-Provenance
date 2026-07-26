"""A minimal structured (one JSON object per line) logger.

Every log line can carry a ``trace_id`` so log output can be correlated with
a request's execution trace, and arbitrary structured ``fields`` for
machine-readable log processing (the Logs dashboard page parses this format).
"""
from __future__ import annotations

import json
import logging
import sys
from typing import Any, Dict, Optional

from .log_store import MemoryLogHandler


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: Dict[str, Any] = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        trace_id = getattr(record, "trace_id", None)
        if trace_id:
            payload["trace_id"] = trace_id
        fields = getattr(record, "fields", None)
        if fields:
            payload.update(fields)
        return json.dumps(payload)


def get_logger(name: str = "explainhttp", level: str = "INFO") -> logging.Logger:
    """Return a process-wide singleton logger configured for JSON output."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        stream_handler = logging.StreamHandler(sys.stdout)
        stream_handler.setFormatter(JSONFormatter())
        logger.addHandler(stream_handler)

        memory_handler = MemoryLogHandler()
        memory_handler.setFormatter(JSONFormatter())
        logger.addHandler(memory_handler)

        logger.setLevel(level)
        logger.propagate = False
    return logger


def log_event(
    logger: logging.Logger,
    message: str,
    trace_id: Optional[str] = None,
    level: int = logging.INFO,
    **fields: Any,
) -> None:
    """Emit one structured log line."""
    logger.log(level, message, extra={"trace_id": trace_id, "fields": fields})
