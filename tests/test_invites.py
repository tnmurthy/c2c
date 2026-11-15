"""M4-1: college activation, staff invites, acceptance, legacy TPO verification, college scope."""
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.deps import get_current_user, require_admin_supabase
from api.domain import invites as inv
from api.domain.tenancy import institution_access
from api.routers.tenancy_router import router

T1, T2 = "tenant-1", "tenant-2"
NOW = datetime(2026, 11, 16, tzinfo=timezone.utc)


# ------------------------------------------------------------------ fake Supabase
class _Q:
    def __init__(self, db, name):
        self.db, self.name, self.filters, self.mode, self.payload = db, name, [], "select", None
        self._limit = None

    def select(self, *a, **k): self.mode = "select"; return self
    def insert(self, row): self.mode, self.payload = "insert", row; return self
    def update(self, vals): self.mode, self.payload = "update", vals; return self
    def eq(self, c, v): self.filters.append(lambda r, c=c, v=v: str(r.get(c)) == str(v)); return self
    def neq(self, c, v): self.filters.append(lambda r, c=c, v=v: str(r.get(c)) != str(v)); return self
    def is_(self, c, v): self.filters.append(lambda r, c=c: r.get(c) is None); return self
    def in_(self, c, vs): self.filters.append(lambda r, c=c, vs=vs: str(r.get(c)) in {str(x) for x in vs}); return self
    def lt(self, c, v): self.filters.append(lambda r, c=c, v=v: r.get(c) is not None and str(r.get(c)) < str(v)); return self
    def order(self, *a, **k): return self
    def limit(self, n): self._limit = n; return self

    def execute(self):
        rows = self.db.tables.setdefault(self.name, [])
        if self.mode == "insert":
            row = dict(self.payload)
            row.setdefault("id", str(uuid.uuid4()))
            rows.append(row)
            return SimpleNamespace(data=[row])
        hit = [r for r in rows if all(f(r) for f in self.filters)]
        if self.mode == "update":
            for r in hit:
                r.update(self.payload)
        return SimpleNamespace(data=hit[: self._limit] if self._limit else hit)


class FakeDB:
    def __init__(self, tables):
        self.tables = tables
        self.meta_updates = []
        self.auth = SimpleNamespace(admin=SimpleNamespace(
            update_user_by_id=lambda uid, attributes: self.meta_updates.append((uid, attributes)),
            get_user_by_id=lambda uid: SimpleNamespace(user=SimpleNamespace(email=f"{uid}@cbit.ac.in")),
        ))

    def table(self, name):
        return _Q(self, name)


def base_tables(status="active", agreement="MSA-001"):
    return {
        "tenants": [{"tenant_id": T1, "name": "CBIT Group", "kind": "college_group", "status": "active"},
                    {"tenant_id": T2, "name": "Other", "kind": "university", "status": "active"}],
        "institutions": [{"id": 7, "name": "CBIT", "domain": "cbit.ac.in", "status": status, "tenant_id": T1,
                          "agreement_ref": agreement},
                         {"id": 9, "name": "Other College", "domain": "other.edu.in", "status": "active",
                          "tenant_id": T2, "agreement_ref": "MSA-9"}],
        "institution_domains": [{"domain": "cbit.ac.in", "institution_id": 7}],
        "departments": [{"id": "dep-cse", "institution_id": 7, "name": "CSE"},
                        {"id": "dep-ece", "institution_id": 7, "name": "ECE"}],
        "memberships": [],
        "invites": [],
        "audit_logs": [],
    }


def user(uid="admin-1", role="admin", email="ops@taliatech.in", **meta):
    return SimpleNamespace(id=uid, email=email, app_metadata=dict({"role": role} if role else {}, **meta))


def client_for(db, u):
    app = FastAPI()
    app.include_router(router, prefix="/api")
    app.dependency_overrides[require_admin_supabase] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: u
    return TestClient(app)


def tpo_membership(uid="tpo-1", verified=True, inst=7, tenant=T1):
    return {"id": f"m-{uid}", "user_id": uid, "tenant_id": tenant, "institution_id": inst, "department_id": None,
            "role": "tpo", "status": "active", "source": "invite", "verified_at": NOW.isoformat() if verified else None}


# ------------------------------------------------------------------ pure rules
def test_token_is_random_and_only_hash_is_comparable():
    a, b = inv.new_token(), inv.new_token()
    assert a != b and len(a) >= 40
    assert inv.hash_token(a) == inv.hash_token(a) and len(inv.hash_token(a)) == 64
    assert inv.hash_token(a) != a


@pytest.mark.parametrize("email,ok", [
    ("tpo@cbit.ac.in", True), ("hod@cse.cbit.ac.in", True), ("tpo@gmail.com", False),
    ("tpo@notcbit.ac.in", False), ("not-an-email", False),
])
def test_invite_email_must_be_official(email, ok):
    if ok:
        inv.check_email(email, ["cbit.ac.in"])
    else:
        with pytest.raises(inv.InviteError):
            inv.check_email(email, ["cbit.ac.in"])


def test_no_domain_on_file_blocks_invites():
    with pytest.raises(inv.InviteError, match="no official email domain"):
        inv.check_email("x@cbit.ac.in", [])


@pytest.mark.parametrize("app_role,ms,role,inst,ok", [
    ("admin", [], "tpo", 7, True),
    ("institution", [tpo_membership()], "dept_coordinator", 7, True),
    ("institution", [tpo_membership()], "tpo", 7, False),                 # TPOs don't mint TPOs
    ("institution", [tpo_membership()], "dept_coordinator", 9, False),    # other college
    ("institution", [tpo_membership(verified=False)], "faculty_mentor", 7, False),  # unverified
    ("institution", [dict(tpo_membership(), role="tenant_admin", institution_id=None)], "tpo", 7, True),
    ("institution", [], "tpo", 7, False),
])
def test_who_can_invite(app_role, ms, role, inst, ok):
    tenant = T1 if inst == 7 else T2
    assert inv.can_invite(app_role, ms, role=role, tenant_id=tenant, institution_id=inst) is ok


def test_invite_states():
    open_ = {"expires_at": (NOW + timedelta(hours=1)).isoformat()}
    assert inv.invite_state(open_, NOW) == "open"
    assert inv.invite_state({"expires_at": (NOW - timedelta(seconds=1)).isoformat()}, NOW) == "expired"
    assert inv.invite_state(dict(open_, accepted_at="x"), NOW) == "accepted"
    assert inv.invite_state(dict(open_, revoked_at="x"), NOW) == "revoked"


def test_app_metadata_after_accept():
    i = {"institution_id": 7}
    assert inv.app_metadata_after_accept({"role": "admin"}, i) is None
    assert inv.app_metadata_after_accept({}, i) == {"role": "institution", "profile_id": 7}
    assert inv.app_metadata_after_accept({"role": "institution", "profile_id": 3}, i) is None  # keeps first college
    with pytest.raises(inv.InviteError):
        inv.app_metadata_after_accept({"role": "student"}, i)


# ------------------------------------------------------------------ college scope
def test_institution_access_rules():
    db = FakeDB(base_tables())
    db.tables["memberships"] = [
        tpo_membership(),
        {"user_id": "hod-1", "tenant_id": T1, "institution_id": 7, "department_id": "dep-cse",
         "role": "dept_coordinator", "status": "active"},
        {"user_id": "grp-1", "tenant_id": T1, "institution_id": None, "department_id": None,
         "role": "tenant_admin", "status": "active"},
        dict(tpo_membership("old-1"), status="revoked"),
    ]
    whole = {"department_ids": None}
    assert institution_access(db, user(), 7) == whole
    assert institution_access(db, user("tpo-1", "institution"), 7) == whole
    assert institution_access(db, user("tpo-1", "institution"), 9) is None
    assert institution_access(db, user("grp-1", "institution"), 7) == whole
    assert institution_access(db, user("hod-1", "institution"), 7) == {"department_ids": ["dep-cse"]}
    assert institution_access(db, user("old-1", "institution"), 7) is None
    assert institution_access(db, user("legacy", "institution", profile_id=7), 7) == whole
    assert institution_access(db, user("stu", "student"), 7) is None


# ------------------------------------------------------------------ API
def test_activate_records_agreement_and_audit():
    db = FakeDB(base_tables(status="prospect", agreement=None))
    r = client_for(db, user()).post("/api/tenancy/institutions/7/activate", json={"agreement_ref": "LoI-2026-11"})
    assert r.status_code == 200
    inst = db.tables["institutions"][0]
    assert inst["status"] == "active" and inst["agreement_ref"] == "LoI-2026-11" and inst["activated_by"] == "admin-1"
    assert db.tables["audit_logs"][-1]["action"] == "institution.activate"


def test_only_admin_activates():
    db = FakeDB(base_tables(status="prospect"))
    r = client_for(db, user("tpo-1", "institution")).post("/api/tenancy/institutions/7/activate",
                                                          json={"agreement_ref": "LoI-1"})
    assert r.status_code == 403


def test_admin_invites_tpo_and_only_hash_is_stored():
    db = FakeDB(base_tables())
    r = client_for(db, user()).post("/api/tenancy/invites", json={"email": "TPO@cbit.ac.in", "role": "tpo",
                                                                  "institution_id": 7})
    assert r.status_code == 201, r.text
    body = r.json()
    token = body["accept_url"].rsplit("/", 1)[-1]
    stored = db.tables["invites"][0]
    assert stored["email"] == "tpo@cbit.ac.in"
    assert stored["token_hash"] == inv.hash_token(token) and token not in str(stored)
    assert "token_hash" not in body and body["emailed"] is False and body["state"] == "open"
    assert db.tables["audit_logs"][-1]["action"] == "invite.create"


def test_reinvite_replaces_open_invite():
    db = FakeDB(base_tables())
    c = client_for(db, user())
    c.post("/api/tenancy/invites", json={"email": "tpo@cbit.ac.in", "role": "tpo", "institution_id": 7})
    c.post("/api/tenancy/invites", json={"email": "tpo@cbit.ac.in", "role": "tpo", "institution_id": 7})
    states = [inv.invite_state(i) for i in db.tables["invites"]]
    assert sorted(states) == ["open", "revoked"]


@pytest.mark.parametrize("tables,payload,code", [
    (base_tables(status="prospect"), {"email": "tpo@cbit.ac.in", "role": "tpo", "institution_id": 7}, 409),
    (base_tables(agreement=None), {"email": "tpo@cbit.ac.in", "role": "tpo", "institution_id": 7}, 409),
    (base_tables(), {"email": "tpo@gmail.com", "role": "tpo", "institution_id": 7}, 400),
    (base_tables(), {"email": "tpo@other.edu.in", "role": "tpo", "institution_id": 7}, 400),
    (base_tables(), {"email": "hod@cbit.ac.in", "role": "dept_coordinator", "institution_id": 7}, 400),
    (base_tables(), {"email": "hod@cbit.ac.in", "role": "dept_coordinator", "institution_id": 9,
                     "department_id": "dep-cse"}, 400),
])
def test_invite_rejections(tables, payload, code):
    r = client_for(FakeDB(tables), user()).post("/api/tenancy/invites", json=payload)
    assert r.status_code == code, r.text


def test_verified_tpo_invites_coordinator_but_not_tpo():
    db = FakeDB(base_tables())
    db.tables["memberships"] = [tpo_membership()]
    c = client_for(db, user("tpo-1", "institution", email="tpo@cbit.ac.in"))
    ok = c.post("/api/tenancy/invites", json={"email": "hod@cbit.ac.in", "role": "dept_coordinator",
                                              "institution_id": 7, "department_id": "dep-cse"})
    assert ok.status_code == 201, ok.text
    assert c.post("/api/tenancy/invites", json={"email": "x@cbit.ac.in", "role": "tpo",
                                                "institution_id": 7}).status_code == 403


def test_unverified_tpo_cannot_invite():
    db = FakeDB(base_tables())
    db.tables["memberships"] = [tpo_membership(verified=False)]
    c = client_for(db, user("tpo-1", "institution"))
    r = c.post("/api/tenancy/invites", json={"email": "hod@cbit.ac.in", "role": "dept_coordinator",
                                             "institution_id": 7, "department_id": "dep-cse"})
    assert r.status_code == 403


def _invite(db):
    r = client_for(db, user()).post("/api/tenancy/invites", json={"email": "tpo@cbit.ac.in", "role": "tpo",
                                                                  "institution_id": 7})
    return r.json()["accept_url"].rsplit("/", 1)[-1]


def test_accept_creates_verified_membership_once():
    db = FakeDB(base_tables())
    token = _invite(db)
    invitee = user("new-tpo", None, email="TPO@cbit.ac.in")
    c = client_for(db, invitee)
    look = c.post("/api/tenancy/invites/lookup", json={"token": token}).json()
    assert look["institution"] == "CBIT" and look["email_matches"] is True and look["state"] == "open"

    r = c.post("/api/tenancy/invites/accept", json={"token": token})
    assert r.status_code == 200, r.text
    m = db.tables["memberships"][-1]
    assert (m["user_id"], m["role"], m["institution_id"], m["source"]) == ("new-tpo", "tpo", 7, "invite")
    assert m["verified_by"] == "admin-1" and m["verified_at"]
    assert db.meta_updates == [("new-tpo", {"app_metadata": {"role": "institution", "profile_id": 7}})]
    assert r.json()["refresh_session"] is True
    assert c.post("/api/tenancy/invites/accept", json={"token": token}).status_code == 410


def test_accept_verifies_existing_legacy_membership():
    db = FakeDB(base_tables())
    db.tables["memberships"] = [dict(tpo_membership("new-tpo", verified=False), source="legacy_backfill")]
    token = _invite(db)
    r = client_for(db, user("new-tpo", "institution", email="tpo@cbit.ac.in", profile_id=7)).post(
        "/api/tenancy/invites/accept", json={"token": token})
    assert r.status_code == 200
    assert len(db.tables["memberships"]) == 1 and db.tables["memberships"][0]["verified_at"]


@pytest.mark.parametrize("who,code", [
    (user("someone", None, email="other@cbit.ac.in"), 403),
    (user("stu", "student", email="tpo@cbit.ac.in"), 409),
])
def test_accept_rejected_without_using_up_invite(who, code):
    db = FakeDB(base_tables())
    token = _invite(db)
    assert client_for(db, who).post("/api/tenancy/invites/accept", json={"token": token}).status_code == code
    assert inv.invite_state(db.tables["invites"][0]) == "open"


def test_expired_and_revoked_invites_cannot_be_accepted():
    db = FakeDB(base_tables())
    token = _invite(db)
    db.tables["invites"][0]["expires_at"] = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
    c = client_for(db, user("new-tpo", None, email="tpo@cbit.ac.in"))
    assert c.post("/api/tenancy/invites/accept", json={"token": token}).status_code == 410

    db2 = FakeDB(base_tables())
    token2 = _invite(db2)
    inv_id = db2.tables["invites"][0]["id"]
    assert client_for(db2, user()).post(f"/api/tenancy/invites/{inv_id}/revoke").status_code == 200
    c2 = client_for(db2, user("new-tpo", None, email="tpo@cbit.ac.in"))
    assert c2.post("/api/tenancy/invites/accept", json={"token": token2}).status_code == 410


def test_unknown_token_is_404():
    c = client_for(FakeDB(base_tables()), user("x", None, email="x@cbit.ac.in"))
    assert c.post("/api/tenancy/invites/accept", json={"token": "x" * 43}).status_code == 404


def test_admin_verifies_legacy_tpo():
    db = FakeDB(base_tables())
    db.tables["memberships"] = [dict(tpo_membership(verified=False), source="legacy_backfill")]
    r = client_for(db, user()).post("/api/tenancy/memberships/m-tpo-1/verify")
    assert r.status_code == 200 and db.tables["memberships"][0]["verified_by"] == "admin-1"
    assert db.tables["audit_logs"][-1]["action"] == "membership.verify"


def test_invite_list_is_scoped_and_hides_hash():
    db = FakeDB(base_tables())
    _invite(db)
    db.tables["memberships"] = [tpo_membership(inst=9, tenant=T2)]
    other_tpo = client_for(db, user("tpo-1", "institution"))
    assert other_tpo.get("/api/tenancy/invites?institution_id=7").status_code == 403
    rows = client_for(db, user()).get("/api/tenancy/invites?institution_id=7").json()
    assert len(rows) == 1 and "token_hash" not in rows[0]


def test_coordinator_sees_only_own_departments():
    db = FakeDB(base_tables())
    db.tables["memberships"] = [{"user_id": "hod-1", "tenant_id": T1, "institution_id": 7,
                                 "department_id": "dep-cse", "role": "dept_coordinator", "status": "active"}]
    rows = client_for(db, user("hod-1", "institution")).get("/api/tenancy/institutions/7/departments").json()
    assert [r["id"] for r in rows] == ["dep-cse"]


def test_coordinator_with_profile_id_stays_department_scoped():
    """B12: accept gives coordinators role=institution + profile_id; that must not grant the whole college."""
    db = FakeDB(base_tables())
    db.tables["memberships"] = [{"user_id": "hod-1", "tenant_id": T1, "institution_id": 7, "department_id": "dep-cse",
                                 "role": "dept_coordinator", "status": "active"}]
    assert institution_access(db, user("hod-1", "institution", profile_id=7), 7) == {"department_ids": ["dep-cse"]}
