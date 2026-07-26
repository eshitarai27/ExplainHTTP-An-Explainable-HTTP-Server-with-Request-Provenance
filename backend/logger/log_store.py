"""An in-memory ring buffer of recent structured log records, powering the
dashboard's Logs page without standing up an external log aggregator."""
from __future__ import annotations

import json
import logging
import threading
from collections import deque
from typing import Any, Dict, List

_MAX_LOGS = 1000
_lock = threading.Lock()
_buffer: "deque[Dict[str, Any]]" = deque(maxlen=_MAX_LOGS)


class MemoryLogHandler(logging.Handler):
    """Captures every formatted (JSON) log line into an in-memory ring buffer."""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            payload = json.loads(self.format(record))
        except (TypeError, ValueError):
            payload = {"message": record.getMessage(), "level": record.levelname}
        with _lock:
            _buffer.append(payload)


def get_recent_logs(limit: int = 200) -> List[Dict[str, Any]]:
    with _lock:
        items = list(_buffer)[-limit:]
    return list(reversed(items))
