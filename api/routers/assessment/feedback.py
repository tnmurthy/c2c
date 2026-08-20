"""
Peer feedback submission endpoint.
"""
from fastapi import APIRouter, Depends

from api.deps import require_admin_supabase
from api.schemas.assessment import FeedbackSubmit
from api.exceptions import DatabaseConnectionError
from api.routers.assessment.common import logger

router = APIRouter(tags=["Assessment"])


@router.post("/feedback/submit")
async def submit_feedback(submit: FeedbackSubmit, client = Depends(require_admin_supabase)):
    try:
        res = client.table("peer_feedback").insert(submit.dict()).execute()
        return res.data
    except Exception as e:
        logger.error(f"ERROR submit_feedback: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))
