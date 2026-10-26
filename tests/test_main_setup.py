"""CLAUDE.md P1-A / P1-C: no sys.path hacks, and each log line is emitted once."""
import importlib
import logging
import os
import sys

import api.main as main

SERVICE_DIRS = (
    os.path.join("services", "job-intel-desk", "backend"),
    os.path.join("services", "market-scout"),
)


def test_main_does_not_add_service_dirs_to_sys_path():
    importlib.reload(main)
    assert not any(p.endswith(d) for p in sys.path for d in SERVICE_DIRS)


def test_api_logger_has_exactly_one_handler_even_after_reload():
    importlib.reload(main)
    importlib.reload(main)
    handlers = logging.getLogger("c2c_api").handlers
    assert len(handlers) == 1
    assert isinstance(handlers[0], logging.StreamHandler)


def test_orchestrator_imports_as_a_package():
    from scripts.c2c_orchestrator_v2 import C2C_Orchestrator_V2

    assert C2C_Orchestrator_V2.__module__ == "scripts.c2c_orchestrator_v2"
