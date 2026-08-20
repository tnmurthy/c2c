"""
Inbound webhook triggering the agent-recruiters background pipeline once an
assessment is completed.
"""
from fastapi import APIRouter, BackgroundTasks, Depends, Request

from api.deps import verify_webhook_secret
from api.routers.assessment.common import logger, run_agent_recruiters

router = APIRouter(tags=["Assessment"])


@router.post("/webhook/assessment-completed", dependencies=[Depends(verify_webhook_secret)])
async def webhook_assessment_completed(request: Request, background_tasks: BackgroundTasks):
    payload = await request.json()
    logger.info(f"WEBHOOK: assessment-completed received. Payload: {payload}")
    record = payload.get("record", {})
    if student_id := record.get("student_id"):
        background_tasks.add_task(run_agent_recruiters, student_id)
    return {"status": "received"}
