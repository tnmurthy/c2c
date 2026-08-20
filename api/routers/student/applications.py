"""Student job application endpoints."""
import logging
from fastapi import APIRouter, Depends

from api.deps import require_admin_supabase, require_role
from api.schemas.student import ApplicationCreate
from api.exceptions import PermissionDeniedError, DatabaseConnectionError

router = APIRouter(tags=["Student"])
logger = logging.getLogger("c2c_api.student")


@router.post("/student/{student_id}/apply")
async def apply_to_job(
    student_id: str,
    application: ApplicationCreate,
    client = Depends(require_admin_supabase),
    current_user = Depends(require_role(["student", "admin"]))
):
    app_metadata = getattr(current_user, "app_metadata", {}) or {}
    role = app_metadata.get("role")
    if role == "student" and str(app_metadata.get("profile_id")) != str(student_id):
        raise PermissionDeniedError("Access denied: can only apply as yourself")
    try:
        payload = {"student_id": student_id, "job_id": application.job_id, "status": "expressed_interest"}
        res = client.table("applications").upsert(payload, on_conflict="student_id,job_id").execute()
        return res.data[0] if res.data else payload
    except Exception as e:
        logger.error(f"ERROR apply_to_job: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.get("/student/{student_id}/applications")
async def get_student_applications(
    student_id: str,
    client = Depends(require_admin_supabase),
    current_user = Depends(require_role(["student", "employer", "admin"]))
):
    app_metadata = getattr(current_user, "app_metadata", {}) or {}
    role = app_metadata.get("role")
    if role == "student" and str(app_metadata.get("profile_id")) != str(student_id):
        raise PermissionDeniedError("Access denied")
    try:
        res = client.table("applications").select("*, job_postings(id, title, location, is_remote, salary_range, role_type, employers(company_name))").eq("student_id", student_id).order("applied_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"ERROR get_student_applications: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))
