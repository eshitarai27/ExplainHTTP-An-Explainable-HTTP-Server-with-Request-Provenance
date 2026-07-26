"""Extension-point hook interface.

Every stage of the pipeline fires a named hook through :class:`HookManager`,
so behavior can be extended (logging, metrics, request/response mutation,
fault injection for testing, etc.) by registering a plain callable against a
hook name, with no changes to the core request-handling code. By default the
hook manager has no registered callbacks and behaves as a no-op.

Hook names and where they fire:

* ``before_request``  -- immediately after the HTTP request has been parsed.
* ``after_request``   -- immediately after the response has been sent.
* ``before_handler``  -- right before the matched route handler is invoked.
* ``after_handler``   -- right after the route handler returns (or raises).
* ``before_response`` -- right before the response is serialized to bytes.
* ``after_response``  -- right after the response bytes are written to the socket.
"""
from __future__ import annotations

from typing import Any, Callable, Dict, List

HookFn = Callable[..., None]

HOOK_NAMES = (
    "before_request",
    "after_request",
    "before_handler",
    "after_handler",
    "before_response",
    "after_response",
)


class HookManager:
    """Registers and fires lifecycle hooks used to extend the core pipeline."""

    def __init__(self) -> None:
        self._hooks: Dict[str, List[HookFn]] = {name: [] for name in HOOK_NAMES}

    def register(self, hook_name: str, fn: HookFn) -> None:
        """Register ``fn`` to be called whenever ``hook_name`` fires."""
        if hook_name not in self._hooks:
            raise ValueError(
                f"Unknown hook '{hook_name}'. Valid hooks: {', '.join(HOOK_NAMES)}"
            )
        self._hooks[hook_name].append(fn)

    def unregister(self, hook_name: str, fn: HookFn) -> None:
        self._hooks[hook_name].remove(fn)

    def fire(self, hook_name: str, **kwargs: Any) -> None:
        """Invoke every callback registered for ``hook_name``, in order.

        Hook callbacks are expected not to raise; a misbehaving hook must
        never be able to take down the core server, so exceptions raised by
        a hook are swallowed after being attached to the calling trace via
        the ``kwargs['trace']`` reference if present.
        """
        for fn in self._hooks.get(hook_name, ()):
            try:
                fn(**kwargs)
            except Exception:  # noqa: BLE001 - hooks must never crash the server
                continue
