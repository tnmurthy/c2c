"""
Backward-compatibility shim.

The assessment router was split into api/routers/assessment/ (see that
package's __init__.py for the breakdown). This module re-exports the
combined `router` plus the helper functions that other modules/tests still
import directly from this path, so `from api.routers.assessment_router
import ...` keeps working without changes elsewhere.
"""
from api.routers.assessment import router
from api.routers.assessment.common import (
    logger,
    parse_scoring_logic,
    generate_development_report,
    normalize_bank_item,
    run_agent_recruiters,
    C2C_Orchestrator_V2,
)

__all__ = [
    "router",
    "logger",
    "parse_scoring_logic",
    "generate_development_report",
    "normalize_bank_item",
    "run_agent_recruiters",
    "C2C_Orchestrator_V2",
]
