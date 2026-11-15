import os
import sys
import random
import re
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import JSONResponse

from api.deps import require_admin_supabase, require_role, get_current_user, get_supabase_client, require_webhook_secret
from api.schemas.assessment import AssessmentSubmit, FeedbackSubmit, SessionStart, AnswerSubmit
from api.exceptions import APIException, NotFoundError, PermissionDeniedError, DatabaseConnectionError

router = APIRouter(tags=["Assessment"])
logger = logging.getLogger("c2c_api.assessment")

# The agent-recruiters orchestrator. If it cannot be imported, agent evaluation
# is disabled and reported by /api/health/agents. Never substitute a stand-in:
# a stub that always returned "CERTIFIED" used to hide this failure.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ORCHESTRATOR_IMPORT_ERROR: Optional[str] = None
try:
    from scripts.c2c_orchestrator_v2 import C2C_Orchestrator_V2
except ImportError as e:
    C2C_Orchestrator_V2 = None
    ORCHESTRATOR_IMPORT_ERROR = str(e)
    logger.critical(
        f"❌ CRITICAL: C2C_Orchestrator_V2 failed to import: {e}. "
        "Agent evaluation will be DISABLED until this is resolved."
    )

# --- HELPERS ---
# Scoring, bank and policy rules live in api/domain (R1). Re-exported here so
# existing imports (tests, scripts) keep working.
from api.domain.assessments.scoring import (  # noqa: F401
    DIMENSIONS, parse_scoring_logic, generate_development_report, evaluate,
)
from api.domain.assessments.bank import (  # noqa: F401
    normalize_bank_item, select_distinct_items, load_fallback_bank,
    build_question_set, items_for_submission,
)
from api.domain.assessments.policy import (
    resolve_tenant_id, retake_cooldown_until, cooldown_response_body,
)

# --- BACKGROUND TASKS ---

async def run_agent_recruiters(student_id: str):
    if C2C_Orchestrator_V2 is None:
        logger.error(f"[WORKER] Skipping agent-recruiters for {student_id} — orchestrator unavailable")
        return
    logger.info(f"🚀 [WORKER] Running agent-recruiters (Psychologist, Narratologist) for {student_id}...")
    try:
        orch = C2C_Orchestrator_V2(candidate_name=student_id, audit_gaps=[])
        res = orch.run_ordeal_session()
        logger.info(f"✅ [WORKER] agent-recruiters session result: {res}")
    except Exception as e:
        logger.error(f"❌ [WORKER] agent-recruiters failed: {e}")

async def run_moodle_remediation_sync(student_id: str, course_name: str, grade: Optional[float] = None):
    logger.info(f"🚀 [WORKER] Running Moodle remediation sync for {student_id} (course: {course_name})...")
    try:
        from api.deps import require_admin_supabase
        client = require_admin_supabase()
        res = client.table("students").select("id, skills").eq("id", student_id).execute()
        if res.data:
            current_skills = res.data[0].get("skills") or []
            if isinstance(current_skills, list):
                if course_name not in current_skills:
                    current_skills.append(course_name)
                    client.table("students").update({"skills": current_skills}).eq("id", student_id).execute()
                    logger.info(f"✅ [WORKER] Added completed skill '{course_name}' for student {student_id}")
            elif isinstance(current_skills, dict):
                current_skills[course_name] = {"status": "completed", "grade": grade}
                client.table("students").update({"skills": current_skills}).eq("id", student_id).execute()
                logger.info(f"✅ [WORKER] Updated completed skill '{course_name}' for student {student_id}")
    except Exception as e:
        logger.error(f"❌ [WORKER] Moodle remediation sync failed for {student_id}: {e}")

# --- ENDPOINTS ---

@router.get("/health/agents")
async def agents_health():
    """Ops check: is agent evaluation available? (GO_LIVE B7, CLAUDE.md P1-B)"""
    if C2C_Orchestrator_V2 is None:
        return {"orchestrator": "unavailable", "error": "import failed"}
    return {"orchestrator": "ok"}

@router.get("/assessment/bank")
async def get_assessment_bank(
    page: int = 1,
    limit: int = 10,
    dimension: Optional[str] = None,
    client = Depends(require_admin_supabase),
    current_user = Depends(get_current_user)
):
    try:
        items = []
        try:
            query = client.table("psychometric_items").select("*")
            if dimension:
                query = query.eq("primary_dimension", dimension)
            res = query.execute()
            items = res.data or []
        except Exception as e:
            logger.warning(f"Failed to query psychometric_items: {e}")
            
        if not items:
            try:
                items = load_fallback_bank()
                if dimension:
                    items = [item for item in items if item.get("primary_dimension") == dimension]
            except Exception as e:
                logger.error(f"Failed to load fallback bank: {e}")
                
        total = len(items)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_items = items[start_idx:end_idx]
        
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "items": paginated_items
        }
    except Exception as e:
        logger.error(f"ERROR get_assessment_bank: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.post("/assessment/session/start")
async def start_session(
    req: SessionStart,
    client = Depends(require_admin_supabase),
    current_user = Depends(require_role(["student", "admin"]))
):
    student_id = req.student_id
    try:
        tenant_id = resolve_tenant_id(client, student_id)

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
        cooldown_until = retake_cooldown_until(client, student_id, tenant_id)
        if cooldown_until:
            return JSONResponse(status_code=429, content=cooldown_response_body(cooldown_until))

        # Create a new session with randomized question sequence
        selected_questions = build_question_set(client, lambda items: 5)
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
    except Exception as e:
        logger.error(f"ERROR submit_answer: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.get("/assessment/generate")
async def generate_assessment(num_per_section: int = 5, client = Depends(require_admin_supabase), current_user = Depends(get_current_user)):
    per_section = num_per_section if num_per_section > 0 else 5
    try:
        final_items = build_question_set(client, lambda items: min(len(items), per_section))
        if not final_items:
            raise NotFoundError("Database empty and fallback JSON missing")
            
        return final_items
    except APIException:
        raise
    except Exception as e:
        logger.error(f"ERROR generate_assessment: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.post("/assessment/submit")
async def submit_assessment(
    submit: AssessmentSubmit, 
    background_tasks: BackgroundTasks, 
    client = Depends(require_admin_supabase), 
    current_user = Depends(require_role(["student", "admin"]))
):
    try:
        tenant_id = resolve_tenant_id(client, submit.student_id)

        # Check retake cooldown policy
        cooldown_until = retake_cooldown_until(client, submit.student_id, tenant_id)
        if cooldown_until:
            return JSONResponse(status_code=429, content=cooldown_response_body(cooldown_until))

        item_ids = [r["item_id"] for r in submit.responses]
        items_map = items_for_submission(client, item_ids)

        result = evaluate(submit.responses, items_map)
        normalized_scores = result["dimension_scores"]
        percentile_bands = result["percentile_bands"]
        founder_fit = result["founder_fit"]
        primary_profile = result["primary_profile"]
        dev_report = result["development_report"]

        from api.routers.employer_router import calculate_match_score
        tech_fit_index = calculate_match_score(normalized_scores, "tech")
        sales_fit_index = calculate_match_score(normalized_scores, "sales")

        # Save to database
        db_payload = {
            "student_id": submit.student_id, 
            "dimension_scores": normalized_scores, 
            "founder_fit": founder_fit,
            "primary_profile": primary_profile,
            "development_report": dev_report,
            "tech_fit_index": tech_fit_index,
            "sales_fit_index": sales_fit_index
        }
        assess_res = client.table("assessment_attempts").insert(db_payload).execute()
        
        if assess_res.data:
            assessment_id = None
            synced_res = client.table("assessments").select("id").eq("student_id", submit.student_id).execute()
            if synced_res.data:
                assessment_id = synced_res.data[0]["id"]
            responses_payload = []
            for resp in submit.responses:
                responses_payload.append({
                    "student_id": submit.student_id,
                    "assessment_id": assessment_id,
                    "question_id": resp["item_id"],
                    "response": str(resp["response"])
                })
            if responses_payload:
                try:
                    client.table("assessment_responses").insert(responses_payload).execute()
                except Exception as ex_resp:
                    logger.error(f"Failed to save assessment responses: {ex_resp}")
                    
        # Mark any active session for this student as completed
        try:
            client.table("assessment_sessions").update({
                "status": "completed",
                "responses_json": submit.responses
            }).eq("student_id", submit.student_id).eq("status", "in_progress").execute()
        except Exception as ex_sess:
            logger.warning(f"Failed to update assessment session status to completed: {ex_sess}")

        # Check if LTI AGS grade passback is requested
        if submit.lti_context:
            lineitem_url = submit.lti_context.get("lineitem_url")
            lti_user_id = submit.lti_context.get("user_id") or submit.student_id
            if lineitem_url and lti_user_id:
                composite_score = sum(normalized_scores.values()) / max(len(normalized_scores), 1)
                from api.services.lti_ags import send_lti_grade
                background_tasks.add_task(
                    send_lti_grade,
                    lineitem_url=lineitem_url,
                    user_id=str(lti_user_id),
                    score=float(composite_score),
                    max_score=100.0,
                    comment=f"C2C Assessment Result: {primary_profile} (Composite: {composite_score:.1f})"
                )
            
        return {
            "student_id": submit.student_id, 
            "dimension_scores": normalized_scores, 
            "founder_fit": founder_fit,
            "primary_profile": primary_profile,
            "development_report": dev_report,
            "percentile_bands": percentile_bands
        }
    except Exception as e:
        logger.error(f"ERROR submit_assessment: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.post("/feedback/submit")
async def submit_feedback(submit: FeedbackSubmit, client = Depends(require_admin_supabase)):
    try:
        res = client.table("peer_feedback").insert(submit.dict()).execute()
        return res.data
    except Exception as e:
        logger.error(f"ERROR submit_feedback: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.get("/admin/item-analysis")
async def get_item_analysis(client = Depends(require_admin_supabase), current_user = Depends(get_current_user)):
    app_metadata = getattr(current_user, "app_metadata", {}) or {}
    role = app_metadata.get("role")
    if role != "admin":
        raise PermissionDeniedError("Access denied: unauthorized admin view")

    try:
        try:
            items_res = client.table("psychometric_items").select("*").execute()
            items = items_res.data or []
        except Exception as e:
            logger.warning(f"Failed to fetch psychometric_items: {e}")
            items = []

        try:
            resp_res = client.table("assessment_responses").select("*").execute()
            responses = resp_res.data or []
        except Exception as e:
            logger.warning(f"Failed to fetch assessment_responses: {e}")
            responses = []

        from collections import defaultdict
        resp_by_item = defaultdict(list)
        for r in responses:
            resp_by_item[r["question_id"]].append(r)

        analysis = []
        for item in items:
            item_id = item["id"]
            stem = item["stem"]
            item_type = item["item_type"]
            dim = item["primary_dimension"]
            
            item_resps = resp_by_item[item_id]
            attempts = len(item_resps)
            
            if attempts == 0:
                success_rate = 0.5
                status = "Optimal"
                avg_score = 0.0
            else:
                logic_raw = item.get("scoring_logic") or {}
                logic_str = logic_raw.get("raw", "") if isinstance(logic_raw, dict) else str(logic_raw or "")
                
                try:
                    logic = parse_scoring_logic(logic_str, item_type)
                except Exception:
                    logic = {}

                if item_type.lower() == "cognitive":
                    correct_ans = str(logic.get("correct_answer") or "")
                    correct_attempts = sum(1 for r in item_resps if str(r["response"]) == correct_ans)
                    success_rate = correct_attempts / attempts
                    avg_score = success_rate
                elif item_type.lower() == "likert":
                    total_score = 0
                    for r in item_resps:
                        try:
                            val = int(r["response"])
                            if logic.get("direction") == "reverse":
                                val = 6 - val
                            total_score += val
                        except ValueError:
                            pass
                    avg_score = total_score / attempts
                    success_rate = avg_score / 5.0
                else:
                    mapping = logic.get("mapping") or {}
                    total_score = 0
                    max_possible = max(mapping.values()) if mapping else 1
                    if max_possible == 0: max_possible = 1
                    for r in item_resps:
                        val = r["response"]
                        if val in mapping:
                            total_score += mapping[val]
                    avg_score = total_score / attempts
                    success_rate = avg_score / max_possible

                if success_rate < 0.35:
                    status = "Too Hard"
                elif success_rate > 0.85:
                    status = "Too Easy"
                else:
                    status = "Optimal"

            analysis.append({
                "id": item_id,
                "stem": stem[:60] + "..." if len(stem) > 60 else stem,
                "item_type": item_type,
                "dimension": dim,
                "attempts": attempts,
                "success_rate": round(success_rate * 100, 1),
                "status": status
            })

        return analysis
    except PermissionDeniedError:
        raise
    except Exception as e:
        logger.error(f"ERROR get_item_analysis: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.post("/webhook/assessment-completed", dependencies=[Depends(require_webhook_secret)])
async def webhook_assessment_completed(request: Request, background_tasks: BackgroundTasks):
    payload = await request.json()
    logger.info(f"WEBHOOK: assessment-completed received (record id={payload.get('record', {}).get('id')})")
    record = payload.get("record", {})
    if student_id := record.get("student_id"):
        background_tasks.add_task(run_agent_recruiters, student_id)
    return {"status": "received"}

@router.post("/webhook/moodle-course-completed", dependencies=[Depends(require_webhook_secret)])
async def webhook_moodle_course_completed(request: Request, background_tasks: BackgroundTasks):
    payload = await request.json()
    logger.info(f"WEBHOOK: moodle-course-completed received: {payload}")
    record = payload.get("record", payload)
    student_id = record.get("student_id")
    course_name = record.get("course_name") or record.get("course_id") or "Remediation Course"
    grade = record.get("grade")
    if student_id:
        background_tasks.add_task(run_moodle_remediation_sync, student_id, str(course_name), grade)
    return {"status": "received", "student_id": student_id, "course": course_name}

from pydantic import BaseModel

class ItemGenerateRequest(BaseModel):
    dimension: str
    item_type: str
    context: str
    count: int = 1

@router.post("/admin/generate-items")
async def generate_items_endpoint(req: ItemGenerateRequest, client = Depends(require_admin_supabase), current_user = Depends(require_role(["admin"]))):
    """
    Admin-only endpoint to generate psychometric items using LLM and insert them into the database.
    """
    from api.item_generator import generate_llm_item
    
    generated_items = []
    for _ in range(req.count):
        try:
            item = generate_llm_item(req.dimension, req.item_type, req.context)
            db_payload = {
                "id": item["id"],
                "stem": item["stem"],
                "item_type": item["item_type"],
                "primary_dimension": item["primary_dimension"],
                "secondary_dimensions": item.get("secondary_dimensions", []),
                "tags": item.get("tags", []),
                "options": item.get("options"),
                "scoring_logic": item["scoring_logic"],
                "intended_audience": "general"
            }
            res = client.table("psychometric_items").insert(db_payload).execute()
            if res.data:
                generated_items.append(res.data[0])
        except Exception as e:
            logger.error(f"Failed to generate and save item: {e}")
            raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")
            
    return {"status": "success", "generated_items": generated_items}

