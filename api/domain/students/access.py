"""Who may read a student's record. Moved from api/routers/student_router.py
(R1) — was copied into get_student and get_assessment_history.

The routes use a service-role client that bypasses RLS, so this check is the
only authorisation. Keep it the single place it is defined.
"""
from api.domain.identity import email_domain, is_public_email_domain
from api.exceptions import NotFoundError, PermissionDeniedError


def authorize_student_read(client, current_user, student_id: str, *, allow_employer: bool) -> None:
    """Raise PermissionDeniedError/NotFoundError unless current_user may read student_id.

    admin: always. student (or no role): only their own record.
    institution: students of their institution (profile_id) or same non-webmail email domain.
    employer: only when allow_employer.
    """
    app_metadata = getattr(current_user, "app_metadata", {}) or {}
    role = app_metadata.get("role")
    email = getattr(current_user, "email", "") or ""

    if role == "admin":
        return
    if role == "student" or not role:
        student_check = client.table("students").select("auth_id").eq("id", student_id).execute()
        is_owner = student_check.data and str(student_check.data[0].get("auth_id")) == str(current_user.id)
        is_profile_match = str(app_metadata.get("profile_id")) == str(student_id)
        if not (is_owner or is_profile_match):
            raise PermissionDeniedError("Access denied: cannot view other student profiles")
        return
    if role == "institution":
        student_check = client.table("students").select("institution_id, email").eq("id", student_id).execute()
        if not student_check.data:
            raise NotFoundError("Student not found")
        s_domain = email_domain(student_check.data[0].get("email"))
        tpo_domain = email_domain(email)
        inst_id = app_metadata.get("profile_id")
        is_owner = inst_id and str(student_check.data[0].get("institution_id")) == str(inst_id)
        # Same institutional domain counts; a shared webmail domain (gmail.com) never does (B9).
        is_domain_match = (not is_public_email_domain(tpo_domain)) and tpo_domain == s_domain
        if not (is_owner or is_domain_match):
            raise PermissionDeniedError("Access denied: student does not belong to your institution")
        return
    if role == "employer":
        if allow_employer:
            return
        raise PermissionDeniedError("Access denied: employers are not permitted to view historical score trends")
    raise PermissionDeniedError("Access denied: unauthorized profile view")
