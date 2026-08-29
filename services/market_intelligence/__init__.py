"""
services/market_intelligence/__init__.py
=========================================
Public API for the native Market Intelligence service.

Imports all callables used by the C2C FastAPI routers and cron scripts
so callers can do:
    from services.market_intelligence import evaluate_lead_quality, score_job_fit, generate_job_match_card
"""

from services.market_intelligence.lead_intel import extract_lead_intel  # noqa: F401
from services.market_intelligence.quality_gate import evaluate_lead_quality  # noqa: F401
from services.market_intelligence.fit_scorer import score_job_fit, generate_job_match_card  # noqa: F401
from services.market_intelligence.interview_prep import generate_interview_prep  # noqa: F401
from services.market_intelligence.profile_expander import expand_github_profile, expand_candidate_profile  # noqa: F401
from services.market_intelligence.skill_gap import generate_skill_gap_report  # noqa: F401
from services.market_intelligence.drafter_reviewer import run_drafter_reviewer_pipeline  # noqa: F401
from services.market_intelligence.outreach_generator import (  # noqa: F401
    generate_outreach_draft,
    build_resume_context,
    build_cover_letter_context,
)

__all__ = [
    "evaluate_lead_quality",
    "score_job_fit",
    "generate_job_match_card",
    "generate_interview_prep",
    "expand_github_profile",
    "expand_candidate_profile",
    "generate_skill_gap_report",
    "run_drafter_reviewer_pipeline",
    "extract_lead_intel",
    "generate_outreach_draft",
    "build_resume_context",
    "build_cover_letter_context",
]
