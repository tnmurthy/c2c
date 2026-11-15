"""M4-2: department list/edit/merge, review queue, manage vs read rights."""
from types import SimpleNamespace

import pytest

from api.domain.departments import (
    DepartmentError, clean_name, clean_short_code, department_rows, norm_alias, review_queue,
)
from test_invites import FakeDB, T1, base_tables, client_for, tpo_membership, user


class RpcDB(FakeDB):
    def __init__(self, tables, fail=None):
        super().__init__(tables)
        self.calls, self.fail = [], fail

    def rpc(self, name, params):
        self.calls.append((name, params))

        def execute():
            if self.fail:
                raise RuntimeError(self.fail)
            return SimpleNamespace(data={"ok": True, "fn": name})
        return SimpleNamespace(execute=execute)


def tables():
    t = base_tables()
    t["disciplines"] = [{"code": "CSE", "name": "Computer Science & Engineering"},
                        {"code": "ECE", "name": "Electronics & Communication Engineering"}]
    t["departments"] = [
        {"id": "dep-cse", "institution_id": 7, "name": "CSE", "short_code": "CSE", "discipline_code": "CSE"},
        {"id": "dep-cs2", "institution_id": 7, "name": "Computer Science", "short_code": None, "discipline_code": "CSE"},
        {"id": "dep-new", "institution_id": 7, "name": "Mtech", "short_code": None, "discipline_code": None},
        {"id": "dep-oth", "institution_id": 9, "name": "CSE", "short_code": None, "discipline_code": "CSE"},
    ]
    t["students"] = [
        {"id": "s1", "institution_id": 7, "department_id": "dep-cse", "department": "CSE"},
        {"id": "s2", "institution_id": 7, "department_id": "dep-cse", "department": "cse"},
        {"id": "s3", "institution_id": 7, "department_id": None, "department": "M.Tech (VLSI)"},
        {"id": "s4", "institution_id": 7, "department_id": None, "department": "m tech vlsi"},
        {"id": "s5", "institution_id": 7, "department_id": None, "department": None},
    ]
    t["memberships"] = [tpo_membership(),
                        dict(tpo_membership("legacy-tpo", verified=False), source="legacy_backfill"),
                        {"user_id": "hod-1", "tenant_id": T1, "institution_id": 7, "department_id": "dep-cse",
                         "role": "dept_coordinator", "status": "active", "verified_at": "x"}]
    return t


TPO = user("tpo-1", "institution", email="tpo@cbit.ac.in")
LEGACY = user("legacy-tpo", "institution")
HOD = user("hod-1", "institution")
OTHER = user("other", "institution")


# ------------------------------------------------------------------ pure
@pytest.mark.parametrize("raw,key", [
    ("  CSE  ", "cse"), ("Computer Science & Engg.", "computer science engg"), ("AI&DS", "ai ds"),
    ("M.Tech (VLSI)", "m tech vlsi"), ("", None), (None, None), ("--", None),
])
def test_norm_alias_matches_sql(raw, key):
    assert norm_alias(raw) == key


def test_clean_inputs():
    assert clean_name("  Computer   Science ") == "Computer Science"
    assert clean_short_code(" ai&ds ") == "AI&DS"
    assert clean_short_code("") is None
    with pytest.raises(DepartmentError):
        clean_name("x")
    with pytest.raises(DepartmentError):
        clean_short_code("<script>")


def test_review_queue_groups_spellings():
    q = review_queue([s for s in tables()["students"] if not s["department_id"]])
    assert q["blank"] == 1
    assert q["groups"] == [{"alias_norm": "m tech vlsi", "students": 2,
                            "examples": ["M.Tech (VLSI)", "m tech vlsi"]}]


def test_department_rows_counts_and_flags():
    t = tables()
    rows = department_rows(t["departments"][:3], t["students"], {"CSE": "Computer Science & Engineering"})
    by = {r["id"]: r for r in rows}
    assert by["dep-cse"]["students"] == 2 and by["dep-cse"]["discipline_name"].startswith("Computer")
    assert by["dep-new"]["needs_mapping"] is True and by["dep-cs2"]["students"] == 0


# ------------------------------------------------------------------ rights
def test_me_reports_scope_and_rights():
    db = RpcDB(tables())
    me = client_for(db, TPO).get("/api/tenancy/institutions/7/me").json()
    assert me["scope"] == "college" and me["can_manage"] and me["can_invite"]
    legacy = client_for(db, LEGACY).get("/api/tenancy/institutions/7/me").json()
    assert legacy["scope"] == "college" and legacy["can_manage"] is False
    hod = client_for(db, HOD).get("/api/tenancy/institutions/7/me").json()
    assert hod["scope"] == "departments" and hod["department_ids"] == ["dep-cse"] and not hod["can_manage"]
    assert client_for(db, OTHER).get("/api/tenancy/institutions/7/me").status_code == 403


def test_summary_is_scoped():
    db = RpcDB(tables())
    full = client_for(db, TPO).get("/api/tenancy/institutions/7/departments/summary").json()
    assert {r["id"] for r in full} == {"dep-cse", "dep-cs2", "dep-new"}
    own = client_for(db, HOD).get("/api/tenancy/institutions/7/departments/summary").json()
    assert [r["id"] for r in own] == ["dep-cse"]


@pytest.mark.parametrize("who", [LEGACY, HOD, OTHER])
def test_only_verified_tpo_or_admin_can_change(who):
    db = RpcDB(tables())
    c = client_for(db, who)
    assert c.patch("/api/tenancy/departments/dep-cse", json={"name": "CSE Dept"}).status_code == 403
    assert c.post("/api/tenancy/institutions/7/departments", json={"name": "Physics"}).status_code == 403
    assert c.post("/api/tenancy/departments/dep-cs2/merge", json={"into_department_id": "dep-cse"}).status_code == 403
    assert not db.calls


# ------------------------------------------------------------------ edits
def test_rename_and_map_discipline_with_audit():
    db = RpcDB(tables())
    r = client_for(db, TPO).patch("/api/tenancy/departments/dep-new",
                                  json={"name": "M.Tech VLSI", "short_code": "mtech", "discipline_code": "ECE"})
    assert r.status_code == 200, r.text
    d = next(x for x in db.tables["departments"] if x["id"] == "dep-new")
    assert (d["name"], d["short_code"], d["discipline_code"]) == ("M.Tech VLSI", "MTECH", "ECE")
    a = db.tables["audit_logs"][-1]
    assert a["action"] == "department.update" and a["changes"]["before"]["name"] == "Mtech"


def test_rename_to_existing_name_says_merge():
    r = client_for(RpcDB(tables()), TPO).patch("/api/tenancy/departments/dep-cs2", json={"name": "cse"})
    assert r.status_code == 409 and "Merge" in r.json()["detail"]


def test_unknown_discipline_rejected():
    r = client_for(RpcDB(tables()), TPO).patch("/api/tenancy/departments/dep-new", json={"discipline_code": "XYZ"})
    assert r.status_code == 400


def test_create_department():
    db = RpcDB(tables())
    r = client_for(db, TPO).post("/api/tenancy/institutions/7/departments",
                                 json={"name": "Electronics & Communication", "short_code": "ece", "discipline_code": "ECE"})
    assert r.status_code == 201 and r.json()["short_code"] == "ECE"
    assert db.tables["audit_logs"][-1]["action"] == "department.create"


def test_merge_calls_one_transaction_and_audits():
    db = RpcDB(tables())
    r = client_for(db, TPO).post("/api/tenancy/departments/dep-cs2/merge", json={"into_department_id": "dep-cse"})
    assert r.status_code == 200
    assert db.calls == [("merge_departments", {"p_src": "dep-cs2", "p_dst": "dep-cse"})]
    assert db.tables["audit_logs"][-1]["action"] == "department.merge"


def test_merge_across_colleges_rejected_before_db():
    db = RpcDB(tables())
    r = client_for(db, user()).post("/api/tenancy/departments/dep-oth/merge", json={"into_department_id": "dep-cse"})
    assert r.status_code == 400 and not db.calls


def test_merge_db_error_is_clean():
    db = RpcDB(tables(), fail="merge: department not found")
    r = client_for(db, TPO).post("/api/tenancy/departments/dep-cs2/merge", json={"into_department_id": "dep-cse"})
    assert r.status_code == 400 and not db.tables["audit_logs"]


# ------------------------------------------------------------------ review queue
def test_review_queue_endpoint():
    db = RpcDB(tables())
    q = client_for(db, TPO).get("/api/tenancy/institutions/7/review-queue").json()
    assert q["groups"][0]["alias_norm"] == "m tech vlsi" and q["blank"] == 1
    assert [d["id"] for d in q["unmapped_departments"]] == ["dep-new"]
    assert client_for(db, HOD).get("/api/tenancy/institutions/7/review-queue").status_code == 403


def test_assign_group():
    db = RpcDB(tables())
    r = client_for(db, TPO).post("/api/tenancy/institutions/7/review-queue/assign",
                                 json={"alias_norm": "m tech vlsi", "department_id": "dep-new"})
    assert r.status_code == 200
    assert db.calls == [("assign_department_alias", {"p_institution": 7, "p_alias": "m tech vlsi", "p_dept": "dep-new"})]
    assert db.tables["audit_logs"][-1]["action"] == "department.alias_assign"


@pytest.mark.parametrize("payload", [
    {"alias_norm": "M.Tech (VLSI)", "department_id": "dep-new"},   # not normalised
    {"alias_norm": "m tech vlsi", "department_id": "dep-oth"},     # other college's department
])
def test_assign_rejections(payload):
    db = RpcDB(tables())
    assert client_for(db, TPO).post("/api/tenancy/institutions/7/review-queue/assign", json=payload).status_code == 400
    assert not db.calls
