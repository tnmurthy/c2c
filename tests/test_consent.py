"""R5: student consent for partner data sharing (notice, grant, withdraw, SSO gate)."""
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.deps import get_current_user, require_admin_supabase
from api.domain.consent import (
    NOTICES, ConsentError, check_grant, decision_is_valid, has_consent, notice,
)
from api.routers.consent_router import router
from test_invites import FakeDB, T1, T2, base_tables

V = NOTICES["eklav"]["version"]


def tables(enabled=True, tenant=T1):
    t = base_tables()
    t["students"] = [{"id": "s1", "auth_id": "u-asha", "tenant_id": tenant, "institution_id": 7, "is_synthetic": False}]
    t["tenant_partner_links"] = [{"tenant_id": T1, "partner_id": "eklav", "enabled": enabled}]
    t["consent_records"] = []
    return t


class ConsentDB(FakeDB):
    def table(self, name):
        q = super().table(name)
        if name == "consent_records":  # emulate identity ids so "latest" works
            orig = q.insert

            def insert(row):
                row = dict(row, id=len(self.tables["consent_records"]) + 1)
                return orig(row)
            q.insert = insert

            def order(col, desc=False):  # the real query sorts newest first before LIMIT 1
                self.tables["consent_records"].sort(key=lambda r: r.get(col) or 0, reverse=desc)
                return q
            q.order = order
        return q


def student(uid="u-asha", role="student"):
    return SimpleNamespace(id=uid, email="asha@cbit.ac.in", app_metadata={"role": role})


def api(db, who):
    app = FastAPI()
    app.include_router(router, prefix="/api")
    app.dependency_overrides[require_admin_supabase] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: who
    return TestClient(app)


# ------------------------------------------------------------------ rules
def test_notice_lists_what_is_and_is_not_shared():
    n = notice("eklav")
    assert n["version"] == V and n["data_shared"] and n["not_shared"] and "optional" in n["voluntary"].lower()
    assert "accepted_versions" not in n and notice("nope") is None


@pytest.mark.parametrize("d,ok", [
    ({"granted": True, "age_confirmed": True, "notice_version": V}, True),
    ({"granted": False, "age_confirmed": True, "notice_version": V}, False),
    ({"granted": True, "age_confirmed": False, "notice_version": V}, False),
    ({"granted": True, "age_confirmed": True, "notice_version": "2020-old"}, False),   # notice changed
    (None, False),
])
def test_decision_validity(d, ok):
    assert decision_is_valid(d, "eklav") is ok


@pytest.mark.parametrize("kw,status", [
    (dict(notice_version=V, age_confirmed=True, partner_enabled=False), 409),
    (dict(notice_version="old", age_confirmed=True, partner_enabled=True), 409),
    (dict(notice_version=V, age_confirmed=False, partner_enabled=True), 400),
])
def test_grant_rules(kw, status):
    with pytest.raises(ConsentError) as e:
        check_grant("eklav", **kw)
    assert e.value.status == status


def test_has_consent_fails_closed():
    broken = SimpleNamespace(table=lambda n: (_ for _ in ()).throw(RuntimeError("no table")))
    assert has_consent(broken, "s1", "eklav") is False
    assert has_consent(ConsentDB(tables()), None, "eklav") is False


# ------------------------------------------------------------------ API
def test_grant_then_withdraw_latest_wins_and_audited():
    db = ConsentDB(tables())
    c = api(db, student())
    me = c.get("/api/consent/me").json()
    assert me["partners"][0]["offered"] and not me["partners"][0]["sharing"]

    r = c.post("/api/consent/eklav", json={"granted": True, "notice_version": V, "age_confirmed": True})
    assert r.status_code == 200 and has_consent(db, "s1", "eklav")
    assert c.get("/api/consent/me").json()["partners"][0]["sharing"] is True

    assert c.post("/api/consent/eklav", json={"granted": False}).status_code == 200
    assert has_consent(db, "s1", "eklav") is False
    assert [r["granted"] for r in sorted(db.tables["consent_records"], key=lambda r: r["id"])] == [True, False]   # history kept
    assert [a["action"] for a in db.tables["audit_logs"]] == ["consent.grant", "consent.withdraw"]


@pytest.mark.parametrize("payload,code", [
    ({"granted": True, "notice_version": V, "age_confirmed": False}, 400),
    ({"granted": True, "notice_version": "old", "age_confirmed": True}, 409),
    ({"granted": True, "age_confirmed": True}, 409),
])
def test_grant_rejections(payload, code):
    db = ConsentDB(tables())
    assert api(db, student()).post("/api/consent/eklav", json=payload).status_code == code
    assert not db.tables["consent_records"]


def test_cannot_grant_when_college_has_not_enabled_partner_but_can_withdraw():
    db = ConsentDB(tables(enabled=False))
    c = api(db, student())
    assert c.get("/api/consent/me").json()["partners"] == []        # not offered, never decided
    assert c.post("/api/consent/eklav", json={"granted": True, "notice_version": V,
                                              "age_confirmed": True}).status_code == 409
    assert c.post("/api/consent/eklav", json={"granted": False}).status_code == 200


def test_only_students_decide_for_themselves():
    db = ConsentDB(tables())
    assert api(db, student("tpo", "institution")).post("/api/consent/eklav", json={"granted": False}).status_code == 403
    assert api(db, student("admin", "admin")).post("/api/consent/eklav", json={"granted": False}).status_code == 403
    assert api(db, student("u-nobody")).get("/api/consent/me").status_code == 404
    assert api(db, student()).post("/api/consent/unknown", json={"granted": False}).status_code == 404
