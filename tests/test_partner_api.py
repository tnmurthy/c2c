"""R4: partner API — keys, gap-free feed per opted-in tenant, consent-gated student details, admin controls."""
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.deps import get_current_user, require_admin_supabase
from api.domain.consent import NOTICES
from api.domain.partner_auth import new_key, parse_key
from api.routers.partner_api_router import router as partner_router
from api.routers.tenancy_router import router as tenancy_router
from test_invites import FakeDB, T1, T2, base_tables, user

V = NOTICES["eklav"]["version"]


class PartnerDB(FakeDB):
    def rpc(self, name, p):
        assert name == "partner_event_feed"
        enabled = {l["tenant_id"] for l in self.tables["tenant_partner_links"]
                   if l["partner_id"] == p["p_partner"] and l["enabled"]}
        rows = [e for e in sorted(self.tables["partner_events"], key=lambda e: e["id"])
                if e["id"] > p["p_after"] and e["tenant_id"] in enabled and e.get("finished", True)
                and (e["type"] != "consent.upserted" or e["payload"].get("partner_id") == p["p_partner"])]
        return SimpleNamespace(execute=lambda: SimpleNamespace(data=rows[: p["p_limit"]]))


def world(enabled=True):
    t = base_tables()
    key, prefix, key_hash = new_key("eklav")
    t["partner_credentials"] = [{"id": "k1", "partner_id": "eklav", "key_prefix": prefix, "key_hash": key_hash,
                                 "revoked_at": None}]
    t["tenant_partner_links"] = [{"tenant_id": T1, "partner_id": "eklav", "enabled": enabled}]
    t["departments"] = [{"id": "dep-cse", "institution_id": 7, "name": "CSE", "short_code": "CSE", "discipline_code": "CSE"}]
    t["cohorts"] = [{"id": "c1", "department_id": "dep-cse", "program": "B.Tech", "graduation_year": 2027}]
    t["students"] = [
        {"id": "s-yes", "full_name": "Asha", "email": "asha@cbit.ac.in", "graduation_year": 2027, "institution_id": 7,
         "tenant_id": T1, "department_id": "dep-cse", "cohort_id": "c1", "is_synthetic": False, "auth_id": "u1"},
        {"id": "s-no", "full_name": "Ravi", "email": "ravi@cbit.ac.in", "graduation_year": 2027, "institution_id": 7,
         "tenant_id": None, "department_id": "dep-cse", "cohort_id": "c1", "is_synthetic": False, "auth_id": "u2"},
        {"id": "s-fake", "full_name": "Fake", "email": "f@cbit.ac.in", "graduation_year": 2027, "institution_id": 7,
         "tenant_id": T1, "is_synthetic": True},
        {"id": "s-other", "full_name": "Meena", "email": "m@other.edu.in", "graduation_year": 2027, "institution_id": 9,
         "tenant_id": T2, "is_synthetic": False, "auth_id": "u3"},
    ]
    granted = {"partner_id": "eklav", "granted": True, "age_confirmed": True, "notice_version": V}
    t["consent_records"] = [dict(granted, id=1, student_id="s-yes"), dict(granted, id=2, student_id="s-other"),
                            dict(granted, id=3, student_id="s-fake")]
    t["student_consents"] = [dict(r) for r in t["consent_records"]]
    t["assessment_attempts"] = [{"id": "a1", "student_id": "s-yes", "attempt_number": 2, "primary_profile": "Builder",
                                 "dimension_scores": {"IQ": 80, "EQ": 70, "SQ": 60, "AQ": 75, "SpQ": 65},
                                 "created_at": "2026-11-16"}]
    t["partner_events"] = [
        {"id": 1, "event_id": "e1", "type": "student.upserted", "tenant_id": T1, "subject_id": "s-yes", "payload": {}},
        {"id": 2, "event_id": "e2", "type": "student.upserted", "tenant_id": T2, "subject_id": "s-other", "payload": {}},
        {"id": 3, "event_id": "e3", "type": "consent.upserted", "tenant_id": T1, "subject_id": "s-yes",
         "payload": {"partner_id": "other-partner"}},
        {"id": 4, "event_id": "e4", "type": "consent.upserted", "tenant_id": T1, "subject_id": "s-yes",
         "payload": {"partner_id": "eklav", "granted": True}},
        {"id": 5, "event_id": "e5", "type": "assessment.completed", "tenant_id": T1, "subject_id": "a1", "payload": {}},
    ]
    return PartnerDB(t), key


def api(db, key=None, who=None):
    app = FastAPI()
    app.include_router(partner_router, prefix="/api")
    app.include_router(tenancy_router, prefix="/api")
    app.dependency_overrides[require_admin_supabase] = lambda: db
    if who:
        app.dependency_overrides[get_current_user] = lambda: who
    c = TestClient(app)
    if key:
        c.headers["Authorization"] = f"Bearer {key}"
    return c


# ------------------------------------------------------------------ keys
def test_key_format_and_parse():
    key, prefix, h = new_key("eklav")
    assert parse_key(key)[:2] == ("eklav", prefix) and len(h) == 64 and parse_key("nope") is None


@pytest.mark.parametrize("bad", [None, "Bearer junk", "Bearer c2c_other_abcdefghij_" + "x" * 43])
def test_bad_keys_are_401(bad):
    db, _ = world()
    c = api(db)
    if bad:
        c.headers["Authorization"] = bad
    assert c.get("/api/partners/eklav/events").status_code == 401


def test_wrong_secret_and_revoked_key_are_401():
    db, key = world()
    pfx = parse_key(key)
    assert api(db, f"c2c_eklav_{pfx[1]}_{'A' * 43}").get("/api/partners/eklav/events").status_code == 401
    db.tables["partner_credentials"][0]["revoked_at"] = "2026-11-16"
    assert api(db, key).get("/api/partners/eklav/events").status_code == 401


# ------------------------------------------------------------------ feed
def test_feed_only_opted_in_tenants_own_consent_events_and_cursor():
    db, key = world()
    c = api(db, key)
    body = c.get("/api/partners/eklav/events?after=0&limit=2").json()
    assert [e["id"] for e in body["events"]] == [1, 4] and body["next_cursor"] == 4
    body = c.get(f"/api/partners/eklav/events?after={body['next_cursor']}").json()
    assert [e["id"] for e in body["events"]] == [5]
    assert c.get("/api/partners/eklav/events?after=5").json() == {"events": [], "next_cursor": 5}
    assert db.tables["partner_credentials"][0]["last_used_at"]


def test_feed_empty_when_tenant_switched_off():
    db, key = world(enabled=False)
    assert api(db, key).get("/api/partners/eklav/events").json()["events"] == []


def test_tenants_snapshot_has_structure_not_people():
    db, key = world()
    t = api(db, key).get("/api/partners/eklav/tenants").json()["tenants"]
    assert [x["tenant_id"] for x in t] == [T1]
    inst = t[0]["institutions"][0]
    assert inst["departments"][0]["cohorts"][0]["program"] == "B.Tech"
    assert "email" not in str(t) and "Asha" not in str(t)


# ------------------------------------------------------------------ students
def test_shared_student_ids_only_consented_real_students():
    db, key = world()
    assert api(db, key).get(f"/api/partners/eklav/students?tenant_id={T1}").json()["student_ids"] == ["s-yes"]
    assert api(db, key).get(f"/api/partners/eklav/students?tenant_id={T2}").status_code == 404


def test_student_detail_for_consented_student_is_audited():
    db, key = world()
    r = api(db, key).get("/api/partners/eklav/students/s-yes")
    assert r.status_code == 200, r.text
    d = r.json()
    assert (d["full_name"], d["email"], d["program"], d["discipline_code"]) == ("Asha", "asha@cbit.ac.in", "B.Tech", "CSE")
    assert d["latest_assessment"]["scores"]["IQ"] == 80 and d["c2c_user_id"] == "u1"
    a = db.tables["audit_logs"][-1]
    assert a["action"] == "partner.student_read" and a["changes"]["partner_id"] == "eklav"


@pytest.mark.parametrize("sid", ["s-no", "s-fake", "s-other", "does-not-exist"])
def test_unshared_students_look_like_missing(sid):
    db, key = world()
    r = api(db, key).get(f"/api/partners/eklav/students/{sid}")
    assert r.status_code == 404 and r.json()["detail"] == "not_shared"
    assert not db.tables["audit_logs"]


def test_withdrawal_stops_details_immediately():
    db, key = world()
    db.tables["consent_records"].append({"id": 9, "student_id": "s-yes", "partner_id": "eklav", "granted": False,
                                         "age_confirmed": False, "notice_version": V})
    db.tables["consent_records"].sort(key=lambda r: r["id"], reverse=True)   # what ORDER BY id DESC returns
    assert api(db, key).get("/api/partners/eklav/students/s-yes").status_code == 404


# ------------------------------------------------------------------ admin
ADMIN = user()


def test_admin_switches_tenant_on_with_agreement_and_audits():
    db, _ = world(enabled=False)
    c = api(db, who=ADMIN)
    assert c.post(f"/api/tenancy/tenants/{T1}/partners/eklav", json={"enabled": True}).status_code == 400
    r = c.post(f"/api/tenancy/tenants/{T1}/partners/eklav", json={"enabled": True, "agreement_ref": "MSA-EKLAV-1"})
    assert r.status_code == 200 and db.tables["tenant_partner_links"][0]["enabled"] is True
    assert db.tables["audit_logs"][-1]["action"] == "partner.link"
    assert api(db, who=user("tpo-1", "institution")).post(
        f"/api/tenancy/tenants/{T1}/partners/eklav", json={"enabled": False}).status_code == 403


def test_admin_creates_key_shown_once_and_it_works_then_revokes():
    db, _ = world()
    c = api(db, who=ADMIN)
    r = c.post("/api/tenancy/partners/eklav/keys", json={"label": "eklav production"})
    assert r.status_code == 201
    body = r.json()
    stored = db.tables["partner_credentials"][-1]
    assert body["key"] not in str(stored) and stored["key_prefix"] == body["key_prefix"]
    assert api(db, body["key"]).get("/api/partners/eklav/events").status_code == 200
    listing = c.get("/api/tenancy/partners").json()
    assert all("key_hash" not in k and "key" not in k for k in listing["keys"])
    assert c.post(f"/api/tenancy/partners/eklav/keys/{body['id']}/revoke").status_code == 200
    assert api(db, body["key"]).get("/api/partners/eklav/events").status_code == 401
    assert c.post("/api/tenancy/partners/nope/keys", json={"label": "xxx"}).status_code == 404
