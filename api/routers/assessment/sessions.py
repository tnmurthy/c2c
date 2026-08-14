"""
Assessment session lifecycle endpoints: starting a session (with retake
cooldown enforcement) and recording answers as a student progresses.
"""
import json
import random
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from api.deps import require_admin_supabase, require_role, assert_own_student_profile
from api.schemas.assessment import SessionStart, AnswerSubmit
from api.exceptions import NotFoundError, DatabaseConnectionError, PermissionDeniedError
from api.routers.assessment.common import (
    logger,
    normalize_bank_item,
    get_fallback_bank_path,
)

router = APIRouter(tags=["Assessment"])


@router.post("/assessment/session/start")
async def start_session(
    req: SessionStart,
    client = Depends(require_admin_supabase),
    current_user = Depends(require_role(["student", "admin"]))
):
    student_id = req.student_id
    assert_own_student_profile(current_user, str(student_id))
    try:
        # Extract student's tenant_id from their profile/record
        student_res = client.table("students").select("tenant_id").eq("id", str(student_id)).execute()
        if not student_res.data:
            raise NotFoundError("Student not found")
        tenant_id = student_res.data[0].get("tenant_id")

        if not tenant_id:
            # Fallback: get first tenant or default tenant
            tenants_res = client.table("tenants").select("tenant_id").limit(1).execute()
            if tenants_res.data:
                tenant_id = tenants_res.data[0]["tenant_id"]
            else:
                raise NotFoundError("No tenants available in the system")

        # Check if there's an active session (status = 'in_progress')
        session_res = client.table("assessment_sessions").select("*").eq("student_id", str(student_id)).eq("status", "in_progress").execute()
        if session_res.data:
            session = session_res.data[0]
            return {
                "session_id": session["id"],
                "student_id": session["student_id"],
                "tenant_id": session["tenant_id"],
                "last_question_index": session["last_question_index"],
                "responses_json": session["responses_json"],
                "questions": session["questions_json"],
                "status": session["status"]
            }

        # Verify retake policy
        last_assess_res = client.table("assessments").select("created_at").eq("student_id", str(student_id)).order("created_at", desc=True).limit(1).execute()
        if last_assess_res.data:
            tenant_res = client.table("tenants").select("retake_cooldown_days").eq("tenant_id", str(tenant_id)).execute()
            cooldown_days = 90
            if tenant_res.data:
                cooldown_days = tenant_res.data[0].get("retake_cooldown_days", 90)

            last_date_str = last_assess_res.data[0]["created_at"]
            if last_date_str.endswith('Z'):
                last_date_str = last_date_str[:-1] + '+00:00'
            last_date = datetime.fromisoformat(last_date_str)
            current_date = datetime.now(timezone.utc)
            cooldown_until = last_date + timedelta(days=cooldown_days)
            if current_date < cooldown_until:
                cooldown_until_str = cooldown_until.date().isoformat()
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": f"Assessment cooldown active. Retake available on {cooldown_until_str}",
                        "cooldown_until": cooldown_until_str
                    }
                )

        # Create a new session with randomized question sequence
        dimensions = ["IQ", "EQ", "SQ", "AQ", "SpQ"]
        selected_questions = []

        bank_data = []
        try:
            fallback_path = get_fallback_bank_path()
            with open(fallback_path, "r", encoding="utf-8") as f:
                raw_bank = json.load(f)
                bank_data = [normalize_bank_item(item) for item in raw_bank]
        except Exception as e:
            logger.warning(f"Failed to load fallback bank: {e}")

        for dim in dimensions:
            items = []
            try:
                res = client.table("psychometric_items").select("*").eq("primary_dimension", dim).execute()
                items = res.data or []
            except Exception as e:
                logger.warning(f"Failed to fetch psychometric_items for {dim}: {e}")

            if not items and bank_data:
                items = [item for item in bank_data if item.get("primary_dimension") == dim]

            if items:
                count = min(len(items), 5)
                selected_questions.extend(random.sample(items, count))

        session_payload = {
            "student_id": str(student_id),
            "tenant_id": str(tenant_id),
            "last_question_index": 0,
            "responses_json": [],
            "questions_json": selected_questions,
            "status": "in_progress"
        }
        create_res = client.table("assessment_sessions").insert(session_payload).execute()
        if not create_res.data:
            raise DatabaseConnectionError("Failed to create assessment session in database")

        session = create_res.data[0]
        return {
            "session_id": session["id"],
            "student_id": session["student_id"],
            "tenant_id": session["tenant_id"],
            "last_question_index": session["last_question_index"],
            "responses_json": session["responses_json"],
            "questions": session["questions_json"],
            "status": session["status"]
        }
    except (NotFoundError, PermissionDeniedError, HTTPException):
        raise
    except Exception as e:
        logger.error(f"ERROR start_session: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.patch("/assessment/session/{session_id}/answer")
async def submit_answer(
    session_id: str,
    answer: AnswerSubmit,
    client = Depends(require_admin_supabase),
    current_user = Depends(require_role(["student", "admin"]))
):
    try:
        session_res = client.table("assessment_sessions").select("*").eq("id", session_id).execute()
        if not session_res.data:
            raise NotFoundError("Assessment session not found")

        session = session_res.data[0]
        assert_own_student_profile(current_user, str(session["student_id"]))
        if session["status"] == "completed":
            raise HTTPException(status_code=400, detail="Session is already completed")

        responses = session.get("responses_json", [])
        if not isinstance(responses, list):
            responses = []

        updated = False
        for r in responses:
            if r.get("item_id") == answer.item_id:
                r["response"] = answer.response
                updated = True
                break
        if not updated:
            responses.append({"item_id": answer.item_id, "response": answer.response})

        last_index = len(responses)
        questions = session.get("questions_json", [])
        status = "in_progress"
        if len(responses) >= len(questions) and len(questions) > 0:
            status = "completed"

        update_payload = {
            "responses_json": responses,
            "last_question_index": last_index,
            "status": status
        }
        update_res = client.table("assessment_sessions").update(update_payload).eq("id", session_id).execute()
        if not update_res.data:
            raise DatabaseConnectionError("Failed to update assessment session in database")

        updated_session = update_res.data[0]
        return {
            "session_id": updated_session["id"],
            "student_id": updated_session["student_id"],
            "tenant_id": updated_session["tenant_id"],
            "last_question_index": updated_session["last_question_index"],
            "responses_json": updated_session["responses_json"],
            "questions": updated_session["questions_json"],
            "status": updated_session["status"]
        }
    except (NotFoundError, PermissionDeniedError, HTTPException):
        raise
    except Exception as e:
        logger.error(f"ERROR submit_answer: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))
