"""Unit tests for config.py's environment-variable resolution, in particular
the PaaS-style PORT fallback (Render/Railway/Heroku inject PORT, not our
provider-specific EXPLAINHTTP_PORT)."""
from __future__ import annotations

import importlib

import config as config_module


def _reload_config():
    importlib.reload(config_module)
    return config_module.load_config()


def test_defaults_to_8080_with_no_env_vars(monkeypatch):
    monkeypatch.delenv("EXPLAINHTTP_PORT", raising=False)
    monkeypatch.delenv("PORT", raising=False)
    assert _reload_config().port == 8080


def test_uses_platform_port_when_set(monkeypatch):
    monkeypatch.delenv("EXPLAINHTTP_PORT", raising=False)
    monkeypatch.setenv("PORT", "10000")
    assert _reload_config().port == 10000


def test_explicit_explainhttp_port_takes_precedence_over_platform_port(monkeypatch):
    monkeypatch.setenv("EXPLAINHTTP_PORT", "9090")
    monkeypatch.setenv("PORT", "10000")
    assert _reload_config().port == 9090
