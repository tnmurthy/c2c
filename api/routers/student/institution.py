"""Institution-facing cohort management endpoints (roster and verification)."""
import logging
from fastapi import APIRouter, Depends, HTTPException

from api.deps import require_admin_supabase, require_role, assert_own_institution_profile
from api.exceptions import DatabaseConnectionError, PermissionDeniedError

router = APIRouter(tags=["Student"])
logger = logging.getLogger("c2c_api.student")


@router.get("/institution/{institution_id}/cohort")
async def get_institution_cohort(institution_id: str, client = Depends(require_admin_supabase), current_user = Depends(require_role(["institution", "admin"]))):
    assert_own_institution_profile(current_user, institution_id)
    try:
        students_res = client.table("students").select("id, full_name, email, department, graduation_year, resume_url, skills, is_verified, created_at").eq("institution_id", institution_id).execute()
        students = students_res.data or []
        if not students:
            return []

        student_ids = [s["id"] for s in students]
        attempts_res = client.table("assessment_attempts").select("student_id, tech_fit_index, sales_fit_index, attempt_number").in_("student_id", student_ids).execute()
        attempts = attempts_res.data or []

        latest_attempts = {}
        for att in attempts:
            sid = att["student_id"]
            if sid not in latest_attempts or att["attempt_number"] > latest_attempts[sid]["attempt_number"]:
                latest_attempts[sid] = att

        for s in students:
            lat = latest_attempts.get(s["id"])
            if lat:
                s["tech_fit_index"] = float(lat["tech_fit_index"]) if lat["tech_fit_index"] is not None else None
                s["sales_fit_index"] = float(lat["sales_fit_index"]) if lat["sales_fit_index"] is not None else None
            else:
                s["tech_fit_index"] = None
                s["sales_fit_index"] = None
        return students
    except Exception as e:
        logger.error(f"ERROR get_institution_cohort: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.post("/institution/{institution_id}/verify")
async def verify_student(institution_id: str, payload: dict, client = Depends(require_admin_supabase), current_user = Depends(require_role(["institution", "admin"]))):
    assert_own_institution_profile(current_user, institution_id)
    student_id = payload.get("student_id")
    if not student_id:
        raise HTTPException(status_code=400, detail="student_id required")
    try:
        res = client.table("students").update({"is_verified": True}).eq("id", student_id).eq("institution_id", institution_id).execute()
        return res.data
    except Exception as e:
        logger.error(f"ERROR verify_student: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))
