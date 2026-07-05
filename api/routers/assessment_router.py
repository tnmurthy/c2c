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

from api.deps import require_admin_supabase, require_role, get_current_user, get_supabase_client
from api.schemas.assessment import AssessmentSubmit, FeedbackSubmit, SessionStart, AnswerSubmit
from api.exceptions import APIException, NotFoundError, PermissionDeniedError, DatabaseConnectionError

router = APIRouter(tags=["Assessment"])
logger = logging.getLogger("c2c_api.assessment")

# Try to import C2C_Orchestrator_V2
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from scripts.c2c_orchestrator_v2 import C2C_Orchestrator_V2
except ImportError:
    class C2C_Orchestrator_V2:
        def __init__(self, candidate_name, audit_gaps):
            self.candidate = candidate_name
            self.gaps = audit_gaps
            self.evidence_scores = {str(gap): 0 for gap in audit_gaps}
            self.logs = []
        def run_ordeal_session(self):
            return {"candidate": self.candidate, "final_status": "CERTIFIED"}

# --- HELPERS ---

def parse_scoring_logic(logic_str: str, item_type: str) -> Dict[str, Any]:
    if not logic_str or not isinstance(logic_str, str):
        return {}
    
    logic = {}
    item_type_lower = item_type.lower()
    if "sjt" in item_type_lower:
        matches = re.findall(r'([A-E]):\s*(\d+)', logic_str)
        if matches:
            logic["mapping"] = {k: int(v) for k, v in matches}
    elif "likert" in item_type_lower:
        if "high score = high" in logic_str.lower():
            logic["direction"] = "forward"
        elif "low score = high" in logic_str.lower() or "reverse" in logic_str.lower():
            logic["direction"] = "reverse"
        else:
            logic["direction"] = "forward"
    elif "cognitive" in item_type_lower:
        match = re.search(r'Correct:\s*([A-E]|\d+)', logic_str, re.I)
        if match:
            logic["correct_answer"] = match.group(1)
            
    return logic

def generate_development_report(scores: Dict[str, int], founder_profile: str) -> Dict[str, Any]:
    report = {
        "profile_summary": "",
        "actionable_feedback": []
    }
    
    if founder_profile == "Builder":
        report["profile_summary"] = "Builders thrive on creating and optimizing systems. They combine high cognitive and adversity quotients to solve complex problems."
    elif founder_profile == "Leader":
        report["profile_summary"] = "Leaders excel at rallying teams and building culture. They leverage high emotional and social intelligence."
    elif founder_profile == "Rainmaker":
        report["profile_summary"] = "Rainmakers are natural advocates and relationship builders. They use social and adversity quotients to drive growth."
    elif founder_profile == "Anchor":
        report["profile_summary"] = "Anchors provide stability and process. They combine cognitive and emotional intelligence to manage operations effectively."
        
    if scores.get("AQ", 0) < 50:
        report["actionable_feedback"].append("Your AQ is below 50. Consider engaging in resilience-building exercises and taking on challenging projects with mentorship.")
    if scores.get("SQ", 0) > 80:
        report["actionable_feedback"].append("Your SQ is high (> 80). Suggest pursuing leadership roles in student clubs or organizing community events.")
    if scores.get("IQ", 0) < 50:
        report["actionable_feedback"].append("Consider supplemental courses or study groups to strengthen core problem-solving (IQ) skills.")
    if scores.get("EQ", 0) > 80:
        report["actionable_feedback"].append("Your EQ is excellent. You might make a great peer mentor or team mediator.")
        
    # Archetype Engine v2 — SpQ Integration
    if scores.get("SpQ", 0) > 75:
        report["actionable_feedback"].append("Your SpQ is high (> 75). Purpose-driven leadership is a strong growth vector for you. Consider leading cross-functional initiative projects.")
    if scores.get("SpQ", 0) < 40:
        report["actionable_feedback"].append("Your SpQ score is below 40. Engaging in value-alignment reflection and mission-driven projects can help expand your perspective.")
        
    return report

def normalize_bank_item(item: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(item)
    if "ID" in normalized and "id" not in normalized:
        normalized["id"] = normalized["ID"]
    if "type" in normalized and "item_type" not in normalized:
        normalized["item_type"] = normalized["type"]
    sl = normalized.get("scoring_logic")
    if isinstance(sl, str):
        normalized["scoring_logic"] = {"raw": sl}
    return normalized

# --- BACKGROUND TASKS ---

async def run_agent_recruiters(student_id: str):
    logger.info(f"🚀 [WORKER] Running agent-recruiters (Psychologist, Narratologist) for {student_id}...")
    try:
        orch = C2C_Orchestrator_V2(candidate_name=student_id, audit_gaps=[])
        res = orch.run_ordeal_session()
        logger.info(f"✅ [WORKER] agent-recruiters session result: {res}")
    except Exception as e:
        logger.error(f"❌ [WORKER] agent-recruiters failed: {e}")

# --- ENDPOINTS ---

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
                fallback_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fallback_bank.json")
                with open(fallback_path, "r", encoding="utf-8") as f:
                    raw_bank = json.load(f)
                    items = [normalize_bank_item(item) for item in raw_bank]
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
            fallback_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fallback_bank.json")
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
async def generate_assessment(num_per_section: int = 25, client = Depends(require_admin_supabase), current_user = Depends(get_current_user)):
    dimensions = ["IQ", "EQ", "SQ", "AQ", "SpQ"]
    final_items = []
    try:
        bank_data = []
        try:
            fallback_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fallback_bank.json")
            with open(fallback_path, "r", encoding="utf-8") as f:
                raw_bank = json.load(f)
                bank_data = [normalize_bank_item(item) for item in raw_bank]
        except Exception as e:
            logger.warning(f"Failed to load fallback bank: {e}")

        for dim in dimensions:
            items = []
            try:
                res = client.table("psychometric_items").select("*").eq("primary_dimension", dim).execute()
                items = res.data
            except Exception as e:
                logger.warning(f"Failed to fetch psychometric_items for {dim}: {e}")
            
            if not items and bank_data:
                items = [item for item in bank_data if item.get("primary_dimension") == dim]

            if items:
                count = min(len(items), random.randint(25, 30) if num_per_section == 25 else num_per_section)
                final_items.extend(random.sample(items, count))
                
        if not final_items:
            raise NotFoundError("Database empty and fallback JSON missing")
            
        return final_items
    except APIException:
        raise
    except Exception as e:
        logger.error(f"ERROR generate_assessment: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.post("/assessment/submit")
async def submit_assessment(submit: AssessmentSubmit, client = Depends(require_admin_supabase), current_user = Depends(require_role(["student", "admin"]))):
    scores = {"IQ": 0, "EQ": 0, "SQ": 0, "AQ": 0, "SpQ": 0}
    try:
        # Extract student's tenant_id from their profile/record
        student_res = client.table("students").select("tenant_id").eq("id", submit.student_id).execute()
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
                
        # Check retake cooldown policy
        last_assess_res = client.table("assessments").select("created_at").eq("student_id", submit.student_id).order("created_at", desc=True).limit(1).execute()
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

        item_ids = [r["item_id"] for r in submit.responses]
        items_map = {}
        try:
            items_res = client.table("psychometric_items").select("*").in_("id", item_ids).execute()
            items_map = {item["id"]: item for item in items_res.data}
        except Exception as e:
            logger.warning(f"Failed to query psychometric_items: {e}")
        
        if not items_map:
            try:
                fallback_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fallback_bank.json")
                with open(fallback_path, "r", encoding="utf-8") as f:
                    raw_bank = json.load(f)
                    normalized_bank = [normalize_bank_item(item) for item in raw_bank]
                    items_map = {item["id"]: item for item in normalized_bank if item.get("id") in item_ids}
            except Exception as e:
                logger.warning(f"Failed to load fallback bank: {e}")
        
        for resp in submit.responses:
            item = items_map.get(resp["item_id"])
            if not item: continue
            val, dim = resp["response"], item["primary_dimension"]
            logic_raw = item.get("scoring_logic")
            logic_str = logic_raw.get("raw", "") if isinstance(logic_raw, dict) else str(logic_raw or "")
            
            try:
                logic = parse_scoring_logic(logic_str, item["item_type"])
                if item["item_type"].lower() == "likert":
                    s = int(val)
                    if logic.get("direction") == "reverse": s = 6 - s
                    scores[dim] += s
                elif item["item_type"].lower() == "cognitive":
                    if str(val) == str(logic.get("correct_answer")): scores[dim] += 1
                elif "sjt" in item["item_type"].lower():
                    m = logic.get("mapping") or {}
                    if val in m: scores[dim] += m[val]
            except Exception as e:
                logger.warning(f"Failed parsing scoring logic for item {resp['item_id']}: {e}")
        
        # Calculate max possible scores per dimension in this submission for normalization
        max_possible = {dim: 0 for dim in ["IQ", "EQ", "SQ", "AQ", "SpQ"]}
        for item in items_map.values():
            dim = item.get("primary_dimension")
            if dim not in max_possible: continue
            item_type_lower = item.get("item_type", "").lower()
            logic_raw = item.get("scoring_logic")
            logic_str = logic_raw.get("raw", "") if isinstance(logic_raw, dict) else str(logic_raw or "")
            try:
                logic = parse_scoring_logic(logic_str, item.get("item_type", ""))
                if item_type_lower == "likert":
                    max_possible[dim] += 5
                elif item_type_lower == "cognitive":
                    max_possible[dim] += 1
                elif "sjt" in item_type_lower:
                    m = logic.get("mapping") or {}
                    max_val = max(m.values()) if m else 5
                    max_possible[dim] += max_val
            except Exception as e:
                logger.warning(f"Error calculating max possible for item {item.get('id')}: {e}")

        # Compute normalized scores on a 100-point scale
        normalized_scores = {}
        for dim in ["IQ", "EQ", "SQ", "AQ", "SpQ"]:
            raw_s = scores.get(dim, 0)
            max_s = max_possible.get(dim, 0)
            if max_s > 0:
                normalized_scores[dim] = round((raw_s / max_s) * 100)
            else:
                # Keep raw score if no items matched (for custom mocks/manual tests)
                normalized_scores[dim] = raw_s

        # Score normalization percentile bands
        percentile_bands = {}
        for dim, score in normalized_scores.items():
            if dim == "IQ":
                if score >= 90: percentile_bands[dim] = "Top 10%"
                elif score >= 80: percentile_bands[dim] = "Top 25%"
                elif score >= 60: percentile_bands[dim] = "Top 50%"
                else: percentile_bands[dim] = "Average"
            elif dim in ["EQ", "SQ", "AQ", "SpQ"]:
                if score >= 85: percentile_bands[dim] = "Top 10%"
                elif score >= 75: percentile_bands[dim] = "Top 25%"
                elif score >= 55: percentile_bands[dim] = "Top 50%"
                else: percentile_bands[dim] = "Average"
            else:
                percentile_bands[dim] = "Average"

        founder_fit = {
            "Builder": normalized_scores.get("IQ", 0) + normalized_scores.get("AQ", 0),
            "Leader": normalized_scores.get("EQ", 0) + normalized_scores.get("SQ", 0),
            "Rainmaker": normalized_scores.get("SQ", 0) + normalized_scores.get("AQ", 0),
            "Anchor": normalized_scores.get("IQ", 0) + normalized_scores.get("EQ", 0)
        }
        primary_profile = max(founder_fit, key=founder_fit.get)
        
        # Generate development report with SpQ integration
        dev_report = generate_development_report(normalized_scores, primary_profile)
        dev_report["percentile_bands"] = percentile_bands
        
        # Save to database
        db_payload = {
            "student_id": submit.student_id, 
            "dimension_scores": normalized_scores, 
            "founder_fit": founder_fit,
            "primary_profile": primary_profile,
            "development_report": dev_report
        }
        assess_res = client.table("assessments").insert(db_payload).execute()
        
        if assess_res.data:
            assessment_id = assess_res.data[0]["id"]
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
    metadata = getattr(current_user, "user_metadata", {}) or {}
    role = metadata.get("role")
    email = getattr(current_user, "email", "") or ""
    if not (role == "admin" or email.endswith("@taliatech.in")):
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

@router.post("/webhook/assessment-completed")
async def webhook_assessment_completed(request: Request, background_tasks: BackgroundTasks):
    payload = await request.json()
    logger.info(f"WEBHOOK: assessment-completed received. Payload: {payload}")
    record = payload.get("record", {})
    if student_id := record.get("student_id"):
        background_tasks.add_task(run_agent_recruiters, student_id)
    return {"status": "received"}
