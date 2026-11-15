"""GO_LIVE B9: institution takeover, webmail-domain and cohort-telemetry leaks."""
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import api.routers.student_router as sr
from api.deps import get_current_user, require_admin_supabase
from api.domain.students.access import authorize_student_read
from api.exceptions import APIException, PermissionDeniedError
from api.main import api_exception_handler


class _Q:
    def __init__(self, db, table):
        self.db, self.table, self.filters, self.op, self.payload = db, table, {}, "select", None
    def select(self, *a, **k): return self
    def eq(self, col, val): self.filters[col] = val; return self
    def insert(self, payload): self.op, self.payload = "insert", payload; return self
    def update(self, payload): self.op, self.payload = "update", payload; return self
    def execute(self):
        rows = self.db.setdefault(self.table, [])
        match = [r for r in rows if all(str(r.get(c)) == str(v) for c, v in self.filters.items())]
        if self.op == "insert":
            row = dict(self.payload, id=len(rows) + 100); rows.append(row); return SimpleNamespace(data=[row])
        if self.op == "update":
            for r in match: r.update(self.payload)
            return SimpleNamespace(data=match)
        return SimpleNamespace(data=match)


class FakeDB:
    def __init__(self, tables):
        self.tables = tables
        self.role_updates = []
        self.auth = SimpleNamespace(admin=SimpleNamespace(
            update_user_by_id=lambda uid, attributes: self.role_updates.append((uid, attributes))))
    def table(self, name): return _Q(self.tables, name)


def make(db, role=None, uid="u-new", email="tpo@cbit.ac.in", profile_id=None):
    app = FastAPI()
    app.add_exception_handler(APIException, api_exception_handler)  # same mapping as production
    app.include_router(sr.router, prefix="/api")
    meta = {k: v for k, v in {"role": role, "profile_id": profile_id}.items() if v}
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=uid, email=email, app_metadata=meta)
    app.dependency_overrides[require_admin_supabase] = lambda: db
    return TestClient(app)


BODY = {"name": "CBIT", "type": "Engineering", "domain": "cbit.ac.in", "location": "Hyderabad"}


def seeded():
    return FakeDB({"institutions": [{"id": 6, "name": "CBIT", "domain": "cbit.ac.in", "auth_id": None}]})


def test_cannot_claim_existing_unowned_institution():
    db = seeded()
    r = make(db).post("/api/onboard/institution", json=BODY)
    assert r.status_code == 409
    assert db.tables["institutions"][0]["auth_id"] is None and not db.role_updates


def test_cannot_take_over_owned_institution():
    db = FakeDB({"institutions": [{"id": 6, "domain": "cbit.ac.in", "auth_id": "owner"}]})
    assert make(db, uid="attacker").post("/api/onboard/institution", json=BODY).status_code == 409
    assert db.tables["institutions"][0]["auth_id"] == "owner"


def test_owner_can_update_own_institution():
    db = FakeDB({"institutions": [{"id": 6, "domain": "cbit.ac.in", "auth_id": "owner"}]})
    r = make(db, role="institution", uid="owner").post("/api/onboard/institution", json=dict(BODY, location="Gandipet"))
    assert r.status_code == 200 and db.tables["institutions"][0]["location"] == "Gandipet"


def test_new_institution_on_own_domain_ok():
    db = FakeDB({"institutions": []})
    r = make(db, email="tpo@newcollege.ac.in").post("/api/onboard/institution", json=dict(BODY, domain="NewCollege.ac.in"))
    assert r.status_code == 200
    assert db.tables["institutions"][0]["domain"] == "newcollege.ac.in"
    assert db.role_updates[0][1]["app_metadata"]["role"] == "institution"


def test_subdomain_email_matches():
    db = FakeDB({"institutions": []})
    r = make(db, email="tpo@placements.kmit.in").post("/api/onboard/institution", json=dict(BODY, domain="kmit.in"))
    assert r.status_code == 200


def test_webmail_domain_rejected_with_e2e_message():
    r = make(FakeDB({"institutions": []}), email="x@gmail.com").post("/api/onboard/institution", json=dict(BODY, domain="gmail.com"))
    assert r.status_code == 400
    assert r.json()["detail"] == "Only academic email domains (.edu, .ac.in) are authorized for TPO onboarding."


def test_email_must_be_on_claimed_domain():
    r = make(FakeDB({"institutions": []}), email="someone@other.ac.in").post("/api/onboard/institution", json=BODY)
    assert r.status_code == 403


def test_student_cannot_register_institution():
    r = make(FakeDB({"institutions": []}), role="student").post("/api/onboard/institution", json=BODY)
    assert r.status_code == 403


def test_admin_edits_details_without_taking_ownership():
    for owner in (None, "owner"):
        db = FakeDB({"institutions": [{"id": 6, "domain": "cbit.ac.in", "auth_id": owner}]})
        r = make(db, role="admin", uid="admin-1", email="a@taliatech.in").post("/api/onboard/institution", json=dict(BODY, location="X"))
        assert r.status_code == 200
        assert db.tables["institutions"][0]["auth_id"] == owner
        assert db.tables["institutions"][0]["location"] == "X"
        assert not db.role_updates  # admin role untouched


@pytest.mark.parametrize("role,profile_id,ok", [
    ("admin", None, True), ("institution", "6", True), ("institution", "7", False), ("student", None, False), (None, None, False),
])
def test_cohort_report_only_admin_or_own_tpo(role, profile_id, ok):
    db = FakeDB({"institutions": [{"id": 6, "domain": "cbit.ac.in"}], "students": []})
    r = make(db, role=role, profile_id=profile_id, email="s@cbit.ac.in").get("/api/cohort/6")
    assert (r.status_code != 403) == ok


def test_webmail_tpo_cannot_read_webmail_students():
    client = SimpleNamespace(table=lambda n: _Q({"students": [{"id": "s1", "institution_id": 9, "email": "kid@gmail.com"}]}, n))
    tpo = SimpleNamespace(id="t", email="tpo@gmail.com", app_metadata={"role": "institution", "profile_id": "6"})
    with pytest.raises(PermissionDeniedError):
        authorize_student_read(client, tpo, "s1", allow_employer=False)
