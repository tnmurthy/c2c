"""
Assessment router package.

Split from the former monolithic api/routers/assessment_router.py (727 lines)
into concern-based submodules:

- bank.py:     item bank browsing + randomized assessment generation
- sessions.py: assessment session lifecycle (start / submit answer)
- scoring.py:  final submission scoring + development report generation
- feedback.py: peer feedback submission
- admin.py:    admin item analysis + LLM item generation
- webhooks.py: assessment-completed webhook -> background agent pipeline
- common.py:   shared helpers, constants, and background tasks

All sub-routers are combined here into a single `router` so that
`api/main.py` can keep importing `router` from this package exactly as it
did from the old flat module.
"""
from fastapi import APIRouter

from api.routers.assessment.bank import router as bank_router
from api.routers.assessment.sessions import router as sessions_router
from api.routers.assessment.scoring import router as scoring_router
from api.routers.assessment.feedback import router as feedback_router
from api.routers.assessment.admin import router as admin_router
from api.routers.assessment.webhooks import router as webhooks_router

router = APIRouter(tags=["Assessment"])
router.include_router(bank_router)
router.include_router(sessions_router)
router.include_router(scoring_router)
router.include_router(feedback_router)
router.include_router(admin_router)
router.include_router(webhooks_router)
