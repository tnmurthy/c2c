"""ADR-003 M3: membership-based student access and tenant resolution."""
from types import SimpleNamespace

import pytest

from api.domain.assessments.policy import resolve_tenant_id
from api.domain.students.access import authorize_student_read
from api.domain.tenancy import membership_covers, staff_can_read
from api.exceptions import NotFoundError, PermissionDeniedError

STUDENT = {"id": "s1", "auth_id": "stu-auth", "tenant_id": "T", "institution_id": 7, "department_id": "D-CSE",
           "email": "kid@cbit.ac.in"}


class _Q:
    def __init__(self, rows, fail=False): self.rows, self.f, self.fail = rows, {}, fail
    def select(self, *a, **k): return self
    def eq(self, c, v): self.f[c] = v; return self
    def limit(self, *a): return self
    def execute(self):
        if self.fail:
            raise RuntimeError('relation "memberships" does not exist')
        return SimpleNamespace(data=[r for r in self.rows if all(str(r.get(c)) == str(v) for c, v in self.f.items())])


def db(memberships=None, students=None, institutions=None, memberships_missing=False):
    tables = {"students": students if students is not None else [STUDENT],
              "memberships": memberships or [], "institutions": institutions or []}
    return SimpleNamespace(table=lambda n: _Q(tables.get(n, []), fail=(n == "memberships" and memberships_missing)))


def user(role, uid="u1", profile_id=None, email="x@cbit.ac.in"):
    meta = {k: v for k, v in {"role": role, "profile_id": profile_id}.items() if v}
    return SimpleNamespace(id=uid, email=email, app_metadata=meta)


def m(role, **scope):
    return dict({"user_id": "u1", "status": "active", "role": role, "tenant_id": None,
                 "institution_id": None, "department_id": None}, **scope)


@pytest.mark.parametrize("mem,ok", [
    (m("tenant_admin", tenant_id="T"), True),
    (m("tenant_admin", tenant_id="OTHER"), False),
    (m("tpo", tenant_id="T", institution_id=7), True),
    (m("tpo", tenant_id="T", institution_id=8), False),
    (m("dept_coordinator", tenant_id="T", institution_id=7, department_id="D-CSE"), True),
    (m("faculty_mentor", tenant_id="T", institution_id=7, department_id="D-ECE"), False),
    (m("student", tenant_id="T", institution_id=7), False),
])
def test_membership_scope(mem, ok):
    assert membership_covers(mem, STUDENT) is ok
    assert staff_can_read([mem], STUDENT) is ok


def test_staff_read_via_membership():
    authorize_student_read(db([m("tpo", tenant_id="T", institution_id=7)]), user("institution"), "s1", allow_employer=False)
    with pytest.raises(PermissionDeniedError):
        authorize_student_read(db([m("tpo", tenant_id="T", institution_id=8)]), user("institution"), "s1", allow_employer=False)


def test_revoked_membership_grants_nothing():
    revoked = dict(m("tpo", tenant_id="T", institution_id=7), status="revoked")
    with pytest.raises(PermissionDeniedError):
        authorize_student_read(db([revoked]), user("institution"), "s1", allow_employer=False)


def test_same_email_domain_no_longer_grants_access():
    """B9 follow-through: a TPO on the student's email domain with no membership is denied."""
    with pytest.raises(PermissionDeniedError):
        authorize_student_read(db(), user("institution", email="tpo@cbit.ac.in"), "s1", allow_employer=False)


def test_legacy_tpo_profile_still_works_during_transition():
    authorize_student_read(db(), user("institution", profile_id="7"), "s1", allow_employer=False)


def test_memberships_table_missing_fails_closed():
    with pytest.raises(PermissionDeniedError):
        authorize_student_read(db(memberships_missing=True), user("institution"), "s1", allow_employer=False)


def test_student_self_and_not_others():
    authorize_student_read(db(), user("student", uid="stu-auth"), "s1", allow_employer=False)
    with pytest.raises(PermissionDeniedError):
        authorize_student_read(db(), user("student", uid="someone"), "s1", allow_employer=False)


def test_unknown_student_is_denied_not_404():
    with pytest.raises(PermissionDeniedError):
        authorize_student_read(db(students=[]), user("institution", profile_id="7"), "nope", allow_employer=False)


def test_resolve_tenant_from_student_then_institution():
    assert resolve_tenant_id(db(), "s1") == "T"
    no_tenant = [dict(STUDENT, tenant_id=None)]
    assert resolve_tenant_id(db(students=no_tenant, institutions=[{"id": 7, "tenant_id": "T-INST"}]), "s1") == "T-INST"


def test_resolve_tenant_has_no_first_tenant_fallback():
    orphan = [dict(STUDENT, tenant_id=None, institution_id=None)]
    with pytest.raises(NotFoundError):
        resolve_tenant_id(db(students=orphan), "s1")
