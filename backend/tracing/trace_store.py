"""Thread-safe in-memory storage for completed and in-flight traces."""
from __future__ import annotations

import threading
from collections import OrderedDict
from typing import List, Optional

from .trace import Trace


class TraceStore:
    """Bounded, thread-safe store of recent traces, keyed by trace_id.

    Oldest traces are evicted once ``max_traces`` is exceeded, so long-running
    servers do not grow memory without bound.
    """

    def __init__(self, max_traces: int = 500) -> None:
        self._max_traces = max_traces
        self._lock = threading.Lock()
        self._traces: "OrderedDict[str, Trace]" = OrderedDict()

    def add(self, trace: Trace) -> None:
        with self._lock:
            self._traces[trace.trace_id] = trace
            self._traces.move_to_end(trace.trace_id)
            while len(self._traces) > self._max_traces:
                self._traces.popitem(last=False)

    def get(self, trace_id: str) -> Optional[Trace]:
        with self._lock:
            return self._traces.get(trace_id)

    def list_recent(self, limit: int = 50) -> List[Trace]:
        with self._lock:
            items = list(self._traces.values())[-limit:]
            return list(reversed(items))

    def __len__(self) -> int:
        with self._lock:
            return len(self._traces)
