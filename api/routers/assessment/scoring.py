"""
Final assessment submission and scoring: computes dimension scores, founder
fit, development report, and persists the completed attempt.
"""
import json
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from api.deps import require_admin_supabase, require_role, assert_own_student_profile
from api.schemas.assessment import AssessmentSubmit
from api.exceptions import NotFoundError, DatabaseConnectionError
from api.routers.assessment.common import (
    logger,
    parse_scoring_logic,
    generate_development_report,
    normalize_bank_item,
    get_fallback_bank_path,
)

router = APIRouter(tags=["Assessment"])


@router.post("/assessment/submit")
async def submit_assessment(submit: AssessmentSubmit, client = Depends(require_admin_supabase), current_user = Depends(require_role(["student", "admin"]))):
    assert_own_student_profile(current_user, submit.student_id)
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
                fallback_path = get_fallback_bank_path()
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
