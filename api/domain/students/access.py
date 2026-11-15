"""Who may read a student's record.

The routes use a service-role client that bypasses RLS, so this check is the
only authorisation. Keep it the single place it is defined.

ADR-003 / M3: staff access comes from memberships (tenant_admin / tpo /
dept_coordinator / faculty_mentor at the right scope). Email domains never
grant access (GO_LIVE B9).
"""
from api.domain.tenancy import active_memberships, staff_can_read, student_scope
from api.exceptions import PermissionDeniedError


def authorize_student_read(client, current_user, student_id: str, *, allow_employer: bool) -> None:
    """Raise PermissionDeniedError unless current_user may read student_id.

    admin: always.
    the student themself (login owner, or app_metadata.profile_id).
    staff: an active membership covering the student's tenant / institution / department.
    legacy TPO (role=institution, profile_id = student's institution): kept until
      every TPO has a membership (M2 backfills one for each institution owner).
    employer: only when allow_employer (tenant approval gating comes with M4).
    """
    app_metadata = getattr(current_user, "app_metadata", {}) or {}
    role = app_metadata.get("role")

    if role == "admin":
        return

    student = student_scope(client, student_id)
    if not student:
        # Same answer as "not yours": do not reveal which student ids exist.
        raise PermissionDeniedError("Access denied")

    if role in ("student", None, ""):
        is_owner = student.get("auth_id") is not None and str(student["auth_id"]) == str(current_user.id)
        is_profile_match = str(app_metadata.get("profile_id")) == str(student_id)
        if is_owner or is_profile_match:
            return
        raise PermissionDeniedError("Access denied: cannot view other student profiles")

    if role == "employer":
        if allow_employer:
            return
        raise PermissionDeniedError("Access denied: employers are not permitted to view historical score trends")

    if staff_can_read(active_memberships(client, current_user.id), student):
        return

    if role == "institution":
        inst_id = app_metadata.get("profile_id")
        if inst_id and student.get("institution_id") is not None and str(student["institution_id"]) == str(inst_id):
            return
        raise PermissionDeniedError("Access denied: student does not belong to your institution")

    raise PermissionDeniedError("Access denied: unauthorized profile view")
