"""Thread-safe in-process runtime metrics.

Not a replacement for a real metrics backend (Prometheus, etc.) -- this
exists purely to power the dashboard's Metrics page with live numbers
gathered directly from the server's own request pipeline.
"""
from __future__ import annotations

import threading
import time
from collections import defaultdict
from typing import Any, Dict


class Metrics:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._start_time = time.time()
        self.total_requests = 0
        self.active_connections = 0
        self.errors = 0
        self.total_latency_ms = 0.0
        self.status_counts: Dict[int, int] = defaultdict(int)
        self.route_counts: Dict[str, int] = defaultdict(int)
        self.route_latency_total_ms: Dict[str, float] = defaultdict(float)

    def connection_opened(self) -> None:
        with self._lock:
            self.active_connections += 1

    def connection_closed(self) -> None:
        with self._lock:
            self.active_connections = max(0, self.active_connections - 1)

    def record_request(self, route: str, status_code: int, duration_ms: float) -> None:
        with self._lock:
            self.total_requests += 1
            self.status_counts[status_code] += 1
            self.route_counts[route] += 1
            self.route_latency_total_ms[route] += duration_ms
            self.total_latency_ms += duration_ms
            if status_code >= 500:
                self.errors += 1

    def snapshot(self) -> Dict[str, Any]:
        with self._lock:
            uptime = time.time() - self._start_time
            avg_latency = (
                self.total_latency_ms / self.total_requests if self.total_requests else 0.0
            )
            routes = {
                route: {
                    "count": count,
                    "avg_latency_ms": round(self.route_latency_total_ms[route] / count, 3),
                }
                for route, count in self.route_counts.items()
            }
            return {
                "uptime_seconds": round(uptime, 2),
                "total_requests": self.total_requests,
                "active_connections": self.active_connections,
                "errors": self.errors,
                "avg_latency_ms": round(avg_latency, 3),
                "status_counts": dict(self.status_counts),
                "routes": routes,
            }
