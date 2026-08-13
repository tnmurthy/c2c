"""
Admin-only assessment endpoints: item analysis (item difficulty/discrimination
stats) and LLM-backed item generation.
"""
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.deps import require_admin_supabase, require_role, get_current_user
from api.exceptions import PermissionDeniedError, DatabaseConnectionError
from api.routers.assessment.common import logger, parse_scoring_logic

router = APIRouter(tags=["Assessment"])


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
