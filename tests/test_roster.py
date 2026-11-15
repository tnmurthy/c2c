"""M4-3: CSV roster import (parse, check, preview, commit, discard), admin switch, sign-up claim."""
from datetime import date
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.deps import get_current_user, require_admin_supabase
from api.domain.roster import (
    DepartmentResolver, RosterError, check_rows, clean_phone, parse_csv, stored_row, template_csv,
)
from api.domain.students.claim import ClaimError, claim_roster_record
from api.routers.roster_router import router as roster_router
from api.routers.tenancy_router import router as tenancy_router
from test_invites import FakeDB, T1, base_tables, tpo_membership, user

TODAY = date(2026, 11, 16)
DEPTS = [{"id": "dep-cse", "name": "Computer Science & Engineering", "short_code": "CSE", "discipline_code": "CSE"},
         {"id": "dep-ece", "name": "ECE", "short_code": None, "discipline_code": "ECE"}]
ALIASES = [{"alias_norm": "cs", "department_id": "dep-cse"}]
MAPPING = {"Electronics and Communication": "ECE", "Information Technology": "IT"}


def resolver():
    return DepartmentResolver(DEPTS, ALIASES, lambda raw: MAPPING.get(raw))


# ------------------------------------------------------------------ parsing
def test_template_round_trips():
    cols, rows = parse_csv(template_csv())
    assert set(cols) >= {"full_name", "email", "graduation_year"} and len(rows) == 1


def test_header_aliases_bom_and_semicolons():
    text = "﻿Student Name;Email ID;Branch;Year of Passing;Mobile;Hall Ticket\nAsha;a@x.ac.in;CSE;2027;+91 98765 43210;21B81\n"
    cols, rows = parse_csv(text)
    assert cols["roll_no"] == "Hall Ticket" and rows[0]["department"] == "CSE" and rows[0]["_line"] == 2


@pytest.mark.parametrize("text,msg", [
    ("", "empty"), ("name,email\nA,a@x.in\n", "graduation_year"), ("name,email,year\n", "no students"),
])
def test_unusable_files(text, msg):
    with pytest.raises(RosterError, match=msg):
        parse_csv(text)


def test_size_and_row_limits():
    big = "name,email,year\n" + "x" * (2 * 1024 * 1024)
    with pytest.raises(RosterError, match="2 MB"):
        parse_csv(big)
    many = "name,email,year\n" + "".join(f"S{i},s{i}@x.ac.in,2027\n" for i in range(5001))
    with pytest.raises(RosterError, match="5000"):
        parse_csv(many)


@pytest.mark.parametrize("raw,out", [
    ("9876543210", "9876543210"), ("+91 98765-43210", "9876543210"), ("09876543210", "9876543210"),
    ("12345", None), ("", None),
])
def test_phone(raw, out):
    assert clean_phone(raw)[0] == out


# ------------------------------------------------------------------ checking
def test_department_resolution_order():
    r = resolver()
    assert r.resolve("Computer Science & Engineering") == "dep-cse"   # name
    assert r.resolve("cse") == "dep-cse"                                # short code
    assert r.resolve(" cs ") == "dep-cse"                               # remembered spelling
    assert r.resolve("Electronics and Communication") == "dep-ece"      # discipline, one match
    assert r.resolve("Information Technology") is None                  # no such department -> review


def test_check_rows_actions_errors_warnings():
    text = ("name,email,department,year,phone\n"
            "Asha,ASHA@cbit.ac.in,CSE,2027,9876543210\n"
            "Ravi,ravi@cbit.ac.in,Information Technology,2027,123\n"
            "Dup,asha@cbit.ac.in,CSE,2027,\n"
            "=HYPERLINK(\"x\"),evil@cbit.ac.in,CSE,2027,\n"
            "Old,old@cbit.ac.in,CSE,27,\n"
            "Moved,moved@other.edu,CSE,2027,\n"
            "Back,back@cbit.ac.in,,2027,\n"
            "Mine,mine@cbit.ac.in,CSE,2027,\n")
    _, rows = parse_csv(text)
    out, summary = check_rows(rows, institution_id=7, resolver=resolver(),
                              existing={"moved@other.edu": 9, "mine@cbit.ac.in": 7}, today=TODAY)
    by = {r["line"]: r for r in out}
    assert by[2]["action"] == "new" and by[2]["email"] == "asha@cbit.ac.in" and by[2]["department_id"] == "dep-cse"
    assert by[3]["action"] == "new" and by[3]["department_id"] is None and len(by[3]["warnings"]) == 2
    assert by[4]["action"] == "error" and "line 2" in by[4]["errors"][0]
    assert by[5]["action"] == "error"                                  # formula
    assert by[6]["action"] == "error"                                  # 2-digit year
    assert by[7]["action"] == "error" and "another college" in by[7]["errors"][0]
    assert by[8]["action"] == "new" and "review queue" in by[8]["warnings"][0]
    assert by[9]["action"] == "update"
    assert summary == {"rows": 8, "new": 3, "update": 1, "error": 4, "warnings": 2, "unresolved_department": 2}
    assert set(stored_row(by[2])) == {"action", "email", "full_name", "graduation_year", "department",
                                      "department_id", "phone", "roll_no"}


# ------------------------------------------------------------------ API
class RosterDB(FakeDB):
    def __init__(self, tables, rpc_result=None, rpc_fail=None):
        super().__init__(tables)
        self.calls, self.rpc_result, self.rpc_fail = [], rpc_result, rpc_fail

    def rpc(self, name, params):
        self.calls.append((name, params))

        def execute():
            if name == "map_discipline":
                return SimpleNamespace(data=MAPPING.get(params["raw"]))
            if self.rpc_fail:
                raise RuntimeError(self.rpc_fail)
            return SimpleNamespace(data=self.rpc_result or {"created": 1, "updated": 0, "skipped_errors": 0, "conflicts": 0})
        return SimpleNamespace(execute=execute)


def tables(enabled=True):
    t = base_tables()
    t["institutions"][0].update(roster_import_enabled=enabled, roster_dpa_ref="MSA-001 cl.9" if enabled else None)
    t["departments"] = [dict(d, institution_id=7) for d in DEPTS]
    t["department_aliases"] = [dict(a, institution_id=7) for a in ALIASES]
    t["students"] = [{"id": "s-other", "email": "moved@other.edu", "institution_id": 9}]
    t["memberships"] = [tpo_membership(), dict(tpo_membership("legacy"), verified_at=None)]
    t["roster_imports"] = []
    return t


def api(db, who):
    app = FastAPI()
    app.include_router(roster_router, prefix="/api")
    app.include_router(tenancy_router, prefix="/api")
    app.dependency_overrides[require_admin_supabase] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: who
    return TestClient(app)


TPO = user("tpo-1", "institution", email="tpo@cbit.ac.in")
CSV = "name,email,department,year\nAsha,asha@cbit.ac.in,CSE,2027\nMoved,moved@other.edu,CSE,2027\n"


def test_preview_stores_checked_rows_and_audits_counts_only():
    db = RosterDB(tables())
    r = api(db, TPO).post("/api/roster/7/preview", json={"filename": "cse.csv", "csv_text": CSV})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["summary"]["new"] == 1 and body["summary"]["error"] == 1
    imp = db.tables["roster_imports"][0]
    assert imp["status"] == "preview"
    assert [x["email"] for x in imp["rows"]] == ["asha@cbit.ac.in", "moved@other.edu"]
    audit = db.tables["audit_logs"][-1]
    assert audit["action"] == "roster.preview" and "asha" not in str(audit)


@pytest.mark.parametrize("enabled,who,code", [
    (False, TPO, 409),                                   # college not switched on
    (True, user("legacy", "institution"), 403),          # unverified TPO
    (True, user("x", "institution"), 403),               # other person
])
def test_preview_rights(enabled, who, code):
    db = RosterDB(tables(enabled))
    assert api(db, who).post("/api/roster/7/preview", json={"csv_text": CSV}).status_code == code
    assert not db.tables["roster_imports"]


def test_preview_bad_file_is_400():
    r = api(RosterDB(tables()), TPO).post("/api/roster/7/preview", json={"csv_text": "a,b\n1,2\n"})
    assert r.status_code == 400 and "Missing column" in r.json()["detail"]


def test_commit_calls_one_transaction():
    db = RosterDB(tables())
    imp_id = api(db, TPO).post("/api/roster/7/preview", json={"csv_text": CSV}).json()["id"]
    r = api(db, TPO).post(f"/api/roster/imports/{imp_id}/commit")
    assert r.status_code == 200 and r.json()["created"] == 1
    assert ("commit_roster_import", {"p_import": imp_id, "p_actor": "tpo-1"}) in db.calls
    assert db.tables["audit_logs"][-1]["action"] == "roster.commit"


def test_commit_db_rule_error_is_409():
    db = RosterDB(tables(), rpc_fail="roster: preview expired, upload the file again")
    imp_id = api(db, TPO).post("/api/roster/7/preview", json={"csv_text": CSV}).json()["id"]
    r = api(db, TPO).post(f"/api/roster/imports/{imp_id}/commit")
    assert r.status_code == 409 and "expired" in r.json()["detail"]


def test_discard_clears_rows():
    db = RosterDB(tables())
    imp_id = api(db, TPO).post("/api/roster/7/preview", json={"csv_text": CSV}).json()["id"]
    assert api(db, TPO).post(f"/api/roster/imports/{imp_id}/discard").status_code == 200
    imp = db.tables["roster_imports"][0]
    assert imp["status"] == "discarded" and imp["rows"] == []
    assert api(db, TPO).post(f"/api/roster/imports/{imp_id}/commit").status_code == 409


def test_admin_switch_requires_agreement_clause():
    db = RosterDB(tables(enabled=False))
    admin = api(db, user())
    assert admin.post("/api/tenancy/institutions/7/roster-access", json={"enabled": True}).status_code == 400
    r = admin.post("/api/tenancy/institutions/7/roster-access", json={"enabled": True, "dpa_ref": "MSA-001 cl.9"})
    assert r.status_code == 200 and db.tables["institutions"][0]["roster_import_enabled"] is True
    assert db.tables["audit_logs"][-1]["action"] == "institution.roster_access"
    assert api(db, TPO).post("/api/tenancy/institutions/7/roster-access",
                             json={"enabled": False}).status_code == 403


# ------------------------------------------------------------------ sign-up claim
def claim_db(auth_id=None):
    return FakeDB({"students": [{"id": "s1", "email": "asha@cbit.ac.in", "auth_id": auth_id,
                                 "institution_id": 7, "phone": "9876543210"}]})


def stud(uid="u-asha", email="Asha@cbit.ac.in", confirmed=True):
    return SimpleNamespace(id=uid, email=email, email_confirmed_at="2026-11-16T00:00:00Z" if confirmed else None)


def test_claim_links_imported_record():
    db = claim_db()
    out = claim_roster_record(db, stud(), "u-asha", {"bio": "hi", "phone": "9999999999", "full_name": "Hacker"})
    row = db.tables["students"][0]
    assert out and row["auth_id"] == "u-asha" and row["bio"] == "hi"
    assert row["phone"] == "9876543210"          # the college's phone is kept
    assert "full_name" not in row                # name stays the college's (not taken from the form)


def test_claim_none_when_not_imported():
    assert claim_roster_record(claim_db(), stud(email="new@cbit.ac.in"), "u-new", {}) is None


def test_claim_requires_confirmed_email():
    with pytest.raises(ClaimError) as e:
        claim_roster_record(claim_db(), stud(confirmed=False), "u-asha", {})
    assert e.value.status == 403


def test_claim_never_takes_over_linked_record():
    with pytest.raises(ClaimError) as e:
        claim_roster_record(claim_db(auth_id="someone-else"), stud(), "u-asha", {})
    assert e.value.status == 409
    assert claim_roster_record(claim_db(auth_id="u-asha"), stud(), "u-asha", {})  # idempotent for the owner
