"""
GO_LIVE B7 / CLAUDE.md P1-B: when the agent-recruiters orchestrator cannot be
imported, nothing pretends to evaluate students. No stub, no CERTIFIED result,
and /api/health/agents says so.
"""
import asyncio
import importlib
import logging
import sys

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import api.routers.assessment_router as ar

ORCH_MODULE = "scripts.c2c_orchestrator_v2"


def _client(module) -> TestClient:
    app = FastAPI()
    app.include_router(module.router, prefix="/api")
    return TestClient(app)


@pytest.fixture
def broken_orchestrator(monkeypatch):
    """Reload the router with the orchestrator import failing; restore afterwards."""
    monkeypatch.setitem(sys.modules, ORCH_MODULE, None)  # makes `import` raise ImportError
    yield importlib.reload(ar)
    monkeypatch.delitem(sys.modules, ORCH_MODULE)
    importlib.reload(ar)


def test_health_reports_ok_when_orchestrator_imports():
    assert ar.C2C_Orchestrator_V2 is not None
    assert _client(ar).get("/api/health/agents").json() == {"orchestrator": "ok"}


def test_health_reports_unavailable_when_import_fails(broken_orchestrator):
    assert broken_orchestrator.C2C_Orchestrator_V2 is None
    res = _client(broken_orchestrator).get("/api/health/agents")
    assert res.status_code == 200
    assert res.json() == {"orchestrator": "unavailable", "error": "import failed"}


def test_import_failure_is_logged_as_critical(monkeypatch, caplog):
    monkeypatch.setitem(sys.modules, ORCH_MODULE, None)
    with caplog.at_level(logging.CRITICAL, logger="c2c_api.assessment"):
        importlib.reload(ar)
    monkeypatch.delitem(sys.modules, ORCH_MODULE)
    importlib.reload(ar)
    assert any("failed to import" in r.message for r in caplog.records if r.levelno == logging.CRITICAL)


def test_worker_produces_no_result_when_orchestrator_unavailable(broken_orchestrator, caplog):
    with caplog.at_level(logging.INFO, logger="c2c_api.assessment"):
        asyncio.run(broken_orchestrator.run_agent_recruiters("student-1"))

    messages = " ".join(r.getMessage() for r in caplog.records)
    assert "orchestrator unavailable" in messages
    assert "CERTIFIED" not in messages
    assert "session result" not in messages
