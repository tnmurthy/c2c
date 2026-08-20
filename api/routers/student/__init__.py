"""Student router package: composes onboarding, profile, exports, applications,
and institution-cohort sub-routers into a single `router` for registration in api.main.

Split out of the former monolithic api/routers/student_router.py to keep each
module focused and under the repo's file-size convention.
"""
from fastapi import APIRouter

from api.routers.student.onboarding import router as onboarding_router
from api.routers.student.profile import router as profile_router
from api.routers.student.exports import router as exports_router
from api.routers.student.applications import router as applications_router
from api.routers.student.institution import router as institution_router

router = APIRouter(tags=["Student"])
router.include_router(onboarding_router)
router.include_router(profile_router)
router.include_router(exports_router)
router.include_router(applications_router)
router.include_router(institution_router)
