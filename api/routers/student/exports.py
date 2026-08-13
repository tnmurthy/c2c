"""Student PDF export endpoints (dossier and interview guide)."""
import logging
from fastapi import APIRouter, Depends, Response

from api.deps import require_admin_supabase, get_current_user
from api.pdf_generator import generate_student_pdf, generate_interview_guide_pdf
from api.exceptions import NotFoundError, PermissionDeniedError, DatabaseConnectionError

router = APIRouter(tags=["Student"])
logger = logging.getLogger("c2c_api.student")


@router.get("/export/student/{student_id}")
async def export_student_pdf(student_id: str, client = Depends(require_admin_supabase), current_user = Depends(get_current_user)):
    app_metadata = getattr(current_user, "app_metadata", {}) or {}
    role = app_metadata.get("role")

    if role == "admin":
        pass
    elif role == "student":
        if str(app_metadata.get("profile_id")) != str(student_id):
            raise PermissionDeniedError("Access denied: cannot export other student dossiers")
    elif role == "institution":
        inst_id = app_metadata.get("profile_id")
        student_check = client.table("students").select("institution_id").eq("id", student_id).execute()
        if not student_check.data or str(student_check.data[0].get("institution_id")) != str(inst_id):
            raise PermissionDeniedError("Access denied: student does not belong to your institution")
    elif role == "employer":
        pass
    else:
        raise PermissionDeniedError("Access denied: unauthorized export view")

    try:
        s_res = client.table("students").select("*").eq("id", student_id).execute()
        if not s_res.data: raise NotFoundError("Student not found")
        a_res = client.table("assessments").select("*").eq("student_id", student_id).order("created_at", desc=True).limit(1).execute()
        if not a_res.data: raise NotFoundError("Assessment not found")
        pdf_bytes = generate_student_pdf(s_res.data[0], a_res.data[0])
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=c2c_legend_{student_id}.pdf"})
    except (NotFoundError, PermissionDeniedError):
        raise
    except Exception as e:
        logger.error(f"ERROR export_student_pdf: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.get("/export/interview-guide/{student_id}")
async def export_interview_guide(student_id: str, client = Depends(require_admin_supabase), current_user = Depends(get_current_user)):
    app_metadata = getattr(current_user, "app_metadata", {}) or {}
    role = app_metadata.get("role")

    if role == "admin":
        pass
    elif role == "student":
        if str(app_metadata.get("profile_id")) != str(student_id):
            raise PermissionDeniedError("Access denied: cannot export other student interview guides")
    elif role == "institution":
        inst_id = app_metadata.get("profile_id")
        student_check = client.table("students").select("institution_id").eq("id", student_id).execute()
        if not student_check.data or str(student_check.data[0].get("institution_id")) != str(inst_id):
            raise PermissionDeniedError("Access denied: student does not belong to your institution")
    elif role == "employer":
        pass
    else:
        raise PermissionDeniedError("Access denied: unauthorized export view")

    try:
        s_res = client.table("students").select("*").eq("id", student_id).execute()
        if not s_res.data: raise NotFoundError("Student not found")
        a_res = client.table("assessments").select("*").eq("student_id", student_id).order("created_at", desc=True).limit(1).execute()
        if not a_res.data: raise NotFoundError("Assessment not found")

        pdf_bytes = generate_interview_guide_pdf(s_res.data[0], a_res.data[0])
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=c2c_interview_guide_{student_id}.pdf"})
    except (NotFoundError, PermissionDeniedError):
        raise
    except Exception as e:
        logger.error(f"ERROR export_interview_guide: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))
