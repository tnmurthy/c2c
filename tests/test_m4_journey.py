"""M4 end-to-end journey through the real app (all routers + error handlers), one shared in-memory DB.

admin activates a college -> invites its TPO -> TPO accepts -> invites a coordinator -> coordinator
accepts (sees own department only) -> TPO edits a department -> admin switches roster import on ->
TPO previews + commits a CSV -> scoped cohort reads -> employer can't see imported students ->
student signs up and claims the record -> employer sees them; a squatter can't take the record.

The SQL functions (commit_roster_import etc.) are exercised on staging; here a small Python
stand-in mirrors their contract so the HTTP wiring is tested end to end.
"""
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import api.main as main
import api.routers.employer_router as employer_router
from api.deps import get_current_user, require_admin_supabase
from test_invites import FakeDB, T1, T2, _Q, base_tables, tpo_membership


class Q(_Q):
    def filter(self, c, op, v):
        assert (op, v) == ("not.is", "null")
        self.filters.append(lambda r, c=c: r.get(c) is not None)
        return self


class JourneyDB(FakeDB):
    def table(self, name):
        return Q(self, name)

    def rpc(self, name, params):
        fn = {"map_discipline": lambda p: {"electronics": "ECE"}.get((p["raw"] or "").lower()),
              "commit_roster_import": self._commit,
              "check_whitelist_email": lambda p: False}[name]
        return SimpleNamespace(execute=lambda: SimpleNamespace(data=fn(params)))

    def _commit(self, p):  # mirrors c2c.commit_roster_import's contract
        imp = next(i for i in self.tables["roster_imports"] if i["id"] == p["p_import"])
        inst = next(i for i in self.tables["institutions"] if i["id"] == imp["institution_id"])
        assert imp["status"] == "preview" and inst["roster_import_enabled"]
        out = {"created": 0, "updated": 0, "skipped_errors": 0, "conflicts": 0}
        for r in imp["rows"]:
            if r["action"] == "error":
                out["skipped_errors"] += 1
                continue
            ex = next((s for s in self.tables["students"] if (s.get("email") or "").lower() == r["email"]), None)
            if ex and ex.get("institution_id") != inst["id"]:
                out["conflicts"] += 1
                continue
            vals = {"full_name": r["full_name"], "graduation_year": r["graduation_year"], "department": r["department"],
                    "department_id": r["department_id"], "institution_id": inst["id"], "tenant_id": inst["tenant_id"],
                    "is_verified": True, "is_synthetic": False}
            if ex:
                ex.update(vals)
                out["updated"] += 1
            else:
                self.tables["students"].append(dict(vals, id=f"stu-{len(self.tables['students'])}", email=r["email"],
                                                    auth_id=None, phone=r.get("phone")))
                out["created"] += 1
        imp.update(status="committed", rows=[], result=out)
        return out


def person(uid, email, role=None, **meta):
    md = dict({"role": role} if role else {}, **meta)
    return SimpleNamespace(id=uid, email=email, email_confirmed_at="2026-11-16T00:00:00Z", app_metadata=md)


ADMIN = person("admin-1", "ops@taliatech.in", "admin")
EMPLOYER = person("emp-1", "hr@acme.example", "employer")
OTHER_TPO = person("tpo-9", "tpo@other.edu.in", "institution")


@pytest.fixture
def world(monkeypatch):
    t = base_tables(status="prospect", agreement=None)
    t["disciplines"] = [{"code": "CSE", "name": "Computer Science & Engineering"},
                        {"code": "ECE", "name": "Electronics & Communication Engineering"}]
    t["departments"] = [
        {"id": "dep-cse", "institution_id": 7, "name": "CSE", "short_code": "CSE", "discipline_code": "CSE"},
        {"id": "dep-ece", "institution_id": 7, "name": "ECE", "short_code": None, "discipline_code": "ECE"},
    ]
    t["department_aliases"], t["roster_imports"], t["assessments"], t["assessment_attempts"] = [], [], [], []
    t["students"] = [{"id": "stu-elsewhere", "email": "ravi@other.edu.in", "institution_id": 9, "auth_id": "u-ravi",
                      "is_synthetic": False, "full_name": "Ravi", "department": "CSE", "graduation_year": 2027}]
    t["memberships"] = [tpo_membership("tpo-9", inst=9, tenant=T2)]
    t["institutions"][0].update(roster_import_enabled=False, roster_dpa_ref=None)
    db = JourneyDB(t)
    monkeypatch.setattr(employer_router, "features_for_students", lambda client, students: {})
    monkeypatch.delenv("SHOW_SYNTHETIC_STUDENTS", raising=False)
    monkeypatch.delenv("ALLOW_DEMO_AUTH", raising=False)
    state = {"user": ADMIN}
    main.app.dependency_overrides[require_admin_supabase] = lambda: db
    main.app.dependency_overrides[get_current_user] = lambda: state["user"]
    client = TestClient(main.app)

    def as_(u):
        state["user"] = u
        return client
    yield db, as_
    main.app.dependency_overrides.clear()


def _token(resp):
    assert resp.status_code == 201, resp.text
    return resp.json()["accept_url"].rsplit("/", 1)[-1]


def _after_accept(db, uid, email):
    """The person as their next request sees them (app_metadata set by accept)."""
    meta = [a["app_metadata"] for u, a in db.meta_updates if u == uid][-1]
    return person(uid, email, **meta)


def test_college_onboarding_journey(world):
    db, as_ = world

    # 1. Admin activates the college and invites its TPO
    assert as_(ADMIN).post("/api/tenancy/invites", json={"email": "tpo@cbit.ac.in", "role": "tpo",
                                                         "institution_id": 7}).status_code == 409  # still a prospect
    assert as_(ADMIN).post("/api/tenancy/institutions/7/activate", json={"agreement_ref": "LoI-CBIT-2026"}).status_code == 200
    tpo_token = _token(as_(ADMIN).post("/api/tenancy/invites", json={"email": "tpo@cbit.ac.in", "role": "tpo",
                                                                      "institution_id": 7}))

    # 2. TPO signs up and accepts
    newcomer = person("tpo-7", "TPO@cbit.ac.in")
    assert as_(newcomer).post("/api/tenancy/invites/lookup", json={"token": tpo_token}).json()["email_matches"]
    assert as_(newcomer).post("/api/tenancy/invites/accept", json={"token": tpo_token}).status_code == 200
    tpo = _after_accept(db, "tpo-7", "tpo@cbit.ac.in")
    assert tpo.app_metadata == {"role": "institution", "profile_id": 7}
    me = as_(tpo).get("/api/tenancy/institutions/7/me").json()
    assert me["can_manage"] and me["can_invite"] and not me["roster_enabled"]

    # 3. TPO invites a coordinator, who sees only their department
    hod_token = _token(as_(tpo).post("/api/tenancy/invites", json={
        "email": "hod.cse@cbit.ac.in", "role": "dept_coordinator", "institution_id": 7, "department_id": "dep-cse"}))
    assert as_(person("hod-7", "hod.cse@cbit.ac.in")).post("/api/tenancy/invites/accept",
                                                          json={"token": hod_token}).status_code == 200
    hod = _after_accept(db, "hod-7", "hod.cse@cbit.ac.in")
    assert as_(hod).get("/api/tenancy/institutions/7/me").json()["scope"] == "departments"
    assert as_(hod).patch("/api/tenancy/departments/dep-cse", json={"name": "x"}).status_code == 403

    # 4. TPO tidies a department
    r = as_(tpo).patch("/api/tenancy/departments/dep-ece", json={"name": "Electronics & Communication Engineering"})
    assert r.status_code == 200

    # 5. Roster import: off until c2c records the agreement clause
    csv = ("Name,Email,Branch,Year of Passing,Mobile\n"
           "Asha Reddy,asha@cbit.ac.in,CSE,2027,+91 98765 43210\n"
           "Kiran Rao,kiran@cbit.ac.in,Electronics,2027,\n"
           "Meena,meena@cbit.ac.in,Mechanical,2027,\n"
           "Ravi,ravi@other.edu.in,CSE,2027,\n")
    assert as_(tpo).post("/api/roster/7/preview", json={"csv_text": csv}).status_code == 409
    assert as_(ADMIN).post("/api/tenancy/institutions/7/roster-access",
                           json={"enabled": True, "dpa_ref": "MSA-CBIT cl. 9"}).status_code == 200
    prev = as_(tpo).post("/api/roster/7/preview", json={"filename": "cbit.csv", "csv_text": csv})
    assert prev.status_code == 201, prev.text
    s = prev.json()["summary"]
    assert (s["new"], s["update"], s["error"], s["unresolved_department"]) == (3, 0, 1, 1)
    out = as_(tpo).post(f"/api/roster/imports/{prev.json()['id']}/commit").json()
    assert out == {"created": 3, "updated": 0, "skipped_errors": 1, "conflicts": 0}
    asha = next(x for x in db.tables["students"] if x["email"] == "asha@cbit.ac.in")
    assert asha["department_id"] == "dep-cse" and asha["auth_id"] is None

    # 6. Scoped reads: TPO all, coordinator own department, other college's TPO nothing
    assert len(as_(tpo).get("/api/institution/7/cohort").json()) == 3
    assert [x["email"] for x in as_(hod).get("/api/institution/7/cohort").json()] == ["asha@cbit.ac.in"]
    assert as_(OTHER_TPO).get("/api/institution/7/cohort").status_code == 403
    assert len(as_(tpo).get("/api/tenancy/institutions/7/review-queue").json()["groups"]) == 1  # "Mechanical"

    # 7. Employers can't see imported students who haven't signed up
    db.tables["assessments"].append({"student_id": asha["id"], "dimension_scores": {"IQ": 80, "EQ": 70, "SQ": 60,
                                                                                    "AQ": 75, "SpQ": 65},
                                     "created_at": "2026-11-16"})
    assert as_(EMPLOYER).get("/api/employer/candidates").json() == []

    # 8. A squatter can't take Asha's record by typing her email
    mallory = person("u-mallory", "mallory@cbit.ac.in")
    r = as_(mallory).post("/api/onboard/student", json={"full_name": "Asha Reddy", "email": "asha@cbit.ac.in",
                                                        "department": "CSE", "graduation_year": 2027, "institution_id": "7"})
    assert r.status_code == 200 and r.json()[0]["email"] == "mallory@cbit.ac.in"
    assert asha["auth_id"] is None

    # 9. Asha signs up with her own (confirmed) email and claims her record
    r = as_(person("u-asha", "Asha@cbit.ac.in")).post("/api/onboard/student", json={
        "full_name": "A", "email": "whatever@x.com", "department": "?", "graduation_year": 2030})
    assert r.status_code == 200 and r.json()[0]["id"] == asha["id"]
    assert asha["auth_id"] == "u-asha" and asha["full_name"] == "Asha Reddy"   # college data kept
    assert ("u-asha", {"app_metadata": {"role": "student", "profile_id": asha["id"]}}) in db.meta_updates
    assert [c["name"] for c in as_(EMPLOYER).get("/api/employer/candidates").json()] == ["Asha Reddy"]

    # 10. Everything that changed something is in the audit trail
    actions = [a["action"] for a in db.tables["audit_logs"]]
    for expected in ("institution.activate", "invite.create", "invite.accept", "department.update",
                     "institution.roster_access", "roster.preview", "roster.commit"):
        assert expected in actions, expected
