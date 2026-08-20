"""Student profile, cohort telemetry, assessment history, and alert endpoints."""
import logging
from fastapi import APIRouter, Depends

from api.deps import require_admin_supabase, get_current_user
from api.schemas.student import StudentProfileUpdate
from api.exceptions import NotFoundError, PermissionDeniedError, DatabaseConnectionError

router = APIRouter(tags=["Student"])
logger = logging.getLogger("c2c_api.student")


@router.get("/cohort/{institution_id}")
async def get_cohort_report(institution_id: str, client = Depends(require_admin_supabase), current_user = Depends(get_current_user)):
    app_metadata = getattr(current_user, "app_metadata", {}) or {}
    role = app_metadata.get("role")
    email = getattr(current_user, "email", "") or ""

    try:
        inst_check = client.table("institutions").select("domain").eq("id", institution_id).execute()
        inst_domain = inst_check.data[0]["domain"] if inst_check.data else None
        email_domain = email.split("@")[-1] if email else ""

        is_authorized = False
        if role == "admin":
            is_authorized = True
        elif role == "institution" and str(app_metadata.get("profile_id")) == str(institution_id):
            is_authorized = True
        elif inst_domain and email_domain == inst_domain:
            is_authorized = True

        if not is_authorized:
            raise PermissionDeniedError("Access denied: unauthorized institution telemetry access")
    except PermissionDeniedError:
        raise
    except Exception as e:
        logger.error(f"Authorization check failed: {e}")
        raise PermissionDeniedError("Access denied")

    try:
        students_res = client.table("students").select("id").eq("institution_id", institution_id).execute()
        if not students_res.data:
            return {"averages": {"IQ": 0, "EQ": 0, "SQ": 0, "AQ": 0, "SpQ": 0}, "founder_distribution": {"Builder": 0, "Leader": 0, "Rainmaker": 0, "Anchor": 0}, "support_needs": []}
        ids = [s["id"] for s in students_res.data]
        assess_res = client.table("assessments").select("*").in_("student_id", ids).execute()
        if not assess_res.data:
            return {"averages": {"IQ": 0, "EQ": 0, "SQ": 0, "AQ": 0, "SpQ": 0}, "founder_distribution": {"Builder": 0, "Leader": 0, "Rainmaker": 0, "Anchor": 0}, "support_needs": []}

        total = len(assess_res.data)
        sums = {"IQ": 0, "EQ": 0, "SQ": 0, "AQ": 0, "SpQ": 0}
        counts = {"Builder": 0, "Leader": 0, "Rainmaker": 0, "Anchor": 0}

        for a in assess_res.data:
            s = a.get("dimension_scores", {})
            for d in sums: sums[d] += s.get(d, 0)
            p = a.get("primary_profile")
            if p in counts: counts[p] += 1

        avgs = {d: t / total for d, t in sums.items()}
        dist = {p: (c / total) * 100 for p, c in counts.items()}
        needs = []
        if avgs.get("AQ", 0) < 50: needs.append("Low AQ detected - Implement resilience workshops.")
        if avgs.get("EQ", 0) < 50: needs.append("Low EQ detected - Encourage teamwork training.")

        return {"averages": avgs, "founder_distribution": dist, "support_needs": needs}
    except Exception as e:
        logger.error(f"ERROR get_cohort_report: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.get("/student/{student_id}")
async def get_student(student_id: str, client = Depends(require_admin_supabase), current_user = Depends(get_current_user)):
    app_metadata = getattr(current_user, "app_metadata", {}) or {}
    role = app_metadata.get("role")
    email = getattr(current_user, "email", "") or ""

    if role == "admin":
        pass
    elif role == "student" or not role:
        student_check = client.table("students").select("auth_id").eq("id", student_id).execute()
        is_owner = student_check.data and str(student_check.data[0].get("auth_id")) == str(current_user.id)
        is_profile_match = str(app_metadata.get("profile_id")) == str(student_id)

        if not (is_owner or is_profile_match):
            raise PermissionDeniedError("Access denied: cannot view other student profiles")
    elif role == "institution":
        student_check = client.table("students").select("institution_id, email").eq("id", student_id).execute()
        if not student_check.data:
            raise NotFoundError("Student not found")

        s_email = student_check.data[0].get("email") or ""
        s_domain = s_email.split("@")[-1] if s_email else ""
        tpo_domain = email.split("@")[-1] if email else ""

        inst_id = app_metadata.get("profile_id")
        is_owner = inst_id and str(student_check.data[0].get("institution_id")) == str(inst_id)
        is_domain_match = tpo_domain and s_domain == tpo_domain

        if not (is_owner or is_domain_match):
            raise PermissionDeniedError("Access denied: student does not belong to your institution")
    elif role == "employer":
        pass
    else:
        raise PermissionDeniedError("Access denied: unauthorized profile view")

    try:
        s_res = client.table("students").select("*").eq("id", student_id).execute()
        if not s_res.data: raise NotFoundError("Student not found")
        a_res = client.table("assessments").select("*").eq("student_id", student_id).order("created_at", desc=True).execute()
        f_res = client.table("peer_feedback").select("*").eq("student_id", student_id).execute()

        peer_scores = None
        if f_res.data:
            n = len(f_res.data)
            sums = {}
            for f in f_res.data:
                for d, sc in f.get("dimension_scores", {}).items(): sums[d] = sums.get(d, 0) + sc
            peer_scores = {d: t / n for d, t in sums.items()}

        return {"student": s_res.data[0], "assessments": a_res.data, "peer_scores": peer_scores}
    except (NotFoundError, PermissionDeniedError):
        raise
    except Exception as e:
        logger.error(f"ERROR get_student: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.get("/student/{student_id}/history")
async def get_assessment_history(student_id: str, client = Depends(require_admin_supabase), current_user = Depends(get_current_user)):
    app_metadata = getattr(current_user, "app_metadata", {}) or {}
    role = app_metadata.get("role")
    email = getattr(current_user, "email", "") or ""

    if role == "admin":
        pass
    elif role == "student" or not role:
        student_check = client.table("students").select("auth_id").eq("id", student_id).execute()
        is_owner = student_check.data and str(student_check.data[0].get("auth_id")) == str(current_user.id)
        is_profile_match = str(app_metadata.get("profile_id")) == str(student_id)

        if not (is_owner or is_profile_match):
            raise PermissionDeniedError("Access denied: cannot view other student profiles")
    elif role == "institution":
        student_check = client.table("students").select("institution_id, email").eq("id", student_id).execute()
        if not student_check.data:
            raise NotFoundError("Student not found")

        s_email = student_check.data[0].get("email") or ""
        s_domain = s_email.split("@")[-1] if s_email else ""
        tpo_domain = email.split("@")[-1] if email else ""

        inst_id = app_metadata.get("profile_id")
        is_owner = inst_id and str(student_check.data[0].get("institution_id")) == str(inst_id)
        is_domain_match = tpo_domain and s_domain == tpo_domain

        if not (is_owner or is_domain_match):
            raise PermissionDeniedError("Access denied: student does not belong to your institution")
    elif role == "employer":
        raise PermissionDeniedError("Access denied: employers are not permitted to view historical score trends")
    else:
        raise PermissionDeniedError("Access denied: unauthorized profile view")

    try:
        res = (
            client.table("assessment_attempts")
            .select("attempt_number, dimension_scores, created_at")
            .eq("student_id", student_id)
            .order("attempt_number")
            .execute()
        )
        return res.data
    except Exception as e:
        logger.error(f"ERROR get_assessment_history: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.put("/student/{student_id}/profile")
async def update_student_profile(student_id: str, profile: StudentProfileUpdate, client = Depends(require_admin_supabase), current_user = Depends(get_current_user)):
    student_check = client.table("students").select("auth_id").eq("id", student_id).execute()
    if not student_check.data or str(student_check.data[0].get("auth_id")) != str(current_user.id):
        raise PermissionDeniedError("Access denied: can only update your own profile")

    try:
        data = profile.dict(exclude_unset=True)
        res = client.table("students").update(data).eq("id", student_id).execute()
        if not res.data:
            raise NotFoundError("Student not found")
        return res.data[0]
    except (NotFoundError, PermissionDeniedError):
        raise
    except Exception as e:
        logger.error(f"ERROR update_student_profile: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.get("/alerts/student/{student_id}")
async def get_student_alerts(student_id: str, client = Depends(require_admin_supabase), current_user = Depends(get_current_user)):
    app_metadata = getattr(current_user, "app_metadata", {}) or {}
    role = app_metadata.get("role")
    if role != "admin":
        if role != "student" or str(app_metadata.get("profile_id")) != str(student_id):
            return []

    try:
        res = client.table("match_alerts").select("*, market_leads(*)").eq("student_id", student_id).order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        logger.error(f"ERROR get_student_alerts: {e}", exc_info=True)
        return []
