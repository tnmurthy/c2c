"""CSV roster import (ADR-003 M4-3, G7): parse and check a college's student list.

No I/O here. The API looks up departments, aliases and existing emails, calls
check_rows(), stores the result as a preview, and the database function
commit_roster_import() writes it in one transaction.

Row actions: new | update | error. Errors are skipped at commit; warnings are not blocking.
"""
import csv
import io
import re
from datetime import date
from typing import Any, Callable, Dict, Iterable, List, Optional, Tuple

from api.domain.departments import norm_alias

MAX_BYTES = 2 * 1024 * 1024
MAX_ROWS = 5000
TEMPLATE_HEADERS = ["full_name", "email", "department", "graduation_year", "phone", "roll_no"]

# accepted header spellings -> field
HEADER_ALIASES = {
    "full_name": {"full name", "name", "student name", "full_name", "student"},
    "email": {"email", "email id", "email address", "mail", "e mail", "student email"},
    "department": {"department", "dept", "branch", "stream", "course", "programme", "program", "discipline"},
    "graduation_year": {"graduation year", "graduation_year", "year of passing", "passing year", "batch",
                        "pass out year", "passout year", "yop", "year"},
    "phone": {"phone", "mobile", "mobile number", "phone number", "contact", "contact number", "mobile no"},
    "roll_no": {"roll no", "roll number", "roll_no", "hall ticket", "hall ticket number", "htno", "ht no",
                "register number", "registration number", "reg no", "usn", "enrollment number", "admission number"},
}
REQUIRED = ("full_name", "email", "graduation_year")
EMAIL = re.compile(r"^[^@\s,;<>]+@[^@\s,;<>]+\.[a-z]{2,}$")
FORMULA_START = ("=", "+", "-", "@", "\t", "\r")


class RosterError(ValueError):
    """The whole file is unusable; message is safe to show."""


def template_csv() -> str:
    return ",".join(TEMPLATE_HEADERS) + "\r\n" + \
        "Asha Reddy,asha.reddy@college.ac.in,Computer Science & Engineering,2027,9876543210,21B81A0501\r\n"


def _header_key(h: str) -> Optional[str]:
    k = " ".join(re.sub(r"[^a-z0-9]+", " ", (h or "").lower()).split())
    for field, names in HEADER_ALIASES.items():
        if k in names:
            return field
    return None


def parse_csv(text: str) -> Tuple[Dict[str, str], List[Dict[str, Any]]]:
    """-> (column map field->original header, rows as {field: value, '_line': n})."""
    if text is None or not text.strip():
        raise RosterError("The file is empty.")
    if len(text.encode("utf-8")) > MAX_BYTES:
        raise RosterError("The file is larger than 2 MB. Split it into smaller files.")
    text = text.lstrip("﻿")
    try:
        dialect = csv.Sniffer().sniff(text[:4096], delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel
    reader = csv.reader(io.StringIO(text), dialect)
    try:
        headers = next(reader)
    except StopIteration:
        raise RosterError("The file is empty.")
    colmap: Dict[int, str] = {}
    found: Dict[str, str] = {}
    for i, h in enumerate(headers):
        f = _header_key(h)
        if f and f not in found:
            colmap[i], found[f] = f, h.strip()
    missing = [f for f in REQUIRED if f not in found]
    if missing:
        raise RosterError("Missing column(s): " + ", ".join(missing) +
                          ". Download the template to see the expected columns.")
    rows: List[Dict[str, Any]] = []
    for line_no, cells in enumerate(reader, start=2):
        if not any((c or "").strip() for c in cells):
            continue
        if len(rows) >= MAX_ROWS:
            raise RosterError(f"More than {MAX_ROWS} students. Split the file by department or year.")
        row: Dict[str, Any] = {"_line": line_no}
        for i, f in colmap.items():
            row[f] = (cells[i] if i < len(cells) else "").strip()
        rows.append(row)
    if not rows:
        raise RosterError("The file has a header but no students.")
    return found, rows


def clean_phone(raw: str) -> Tuple[Optional[str], Optional[str]]:
    """-> (phone or None, warning or None). Indian mobiles normalised to 10 digits."""
    if not raw:
        return None, None
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if len(digits) == 10 and digits[0] in "6789":
        return digits, None
    return None, "Phone number not recognised; left blank"


class DepartmentResolver:
    """Raw department text -> department id of this college, or None (goes to the review queue).

    Order: remembered spelling (aliases) -> department name -> short code ->
    discipline (via map_discipline) when exactly one department has it.
    """

    def __init__(self, departments: Iterable[Dict[str, Any]], aliases: Iterable[Dict[str, Any]],
                 map_discipline: Callable[[str], Optional[str]]):
        self.by_alias = {a["alias_norm"]: str(a["department_id"]) for a in aliases}
        self.by_name: Dict[str, str] = {}
        self.by_code: Dict[str, str] = {}
        self.by_discipline: Dict[str, List[str]] = {}
        self.names: Dict[str, str] = {}
        for d in departments:
            did = str(d["id"])
            self.names[did] = d["name"]
            if norm_alias(d.get("name")):
                self.by_name[norm_alias(d["name"])] = did
            if norm_alias(d.get("short_code")):
                self.by_code[norm_alias(d["short_code"])] = did
            if d.get("discipline_code"):
                self.by_discipline.setdefault(d["discipline_code"], []).append(did)
        self.map_discipline = map_discipline
        self._cache: Dict[str, Optional[str]] = {}

    def resolve(self, raw: str) -> Optional[str]:
        key = norm_alias(raw)
        if key is None:
            return None
        if key in self._cache:
            return self._cache[key]
        did = self.by_alias.get(key) or self.by_name.get(key) or self.by_code.get(key)
        if did is None:
            code = self.map_discipline(raw)
            matches = self.by_discipline.get(code or "", [])
            did = matches[0] if len(matches) == 1 else None
        self._cache[key] = did
        return did


def check_rows(rows: List[Dict[str, Any]], *, institution_id, resolver: DepartmentResolver,
               existing: Dict[str, Any], today: Optional[date] = None) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
    """existing: lowercased email -> institution_id of an existing student with that email."""
    year_now = (today or date.today()).year
    seen: Dict[str, int] = {}
    out: List[Dict[str, Any]] = []
    for r in rows:
        errors: List[str] = []
        warnings: List[str] = []
        name = " ".join((r.get("full_name") or "").split())
        email = (r.get("email") or "").strip().lower()
        dept_raw = " ".join((r.get("department") or "").split())
        roll = (r.get("roll_no") or "").strip()[:40] or None

        if not name:
            errors.append("Name is missing")
        elif name.startswith(FORMULA_START) or len(name) > 120:
            errors.append("Name looks wrong (starts with a formula character or is too long)")
        if dept_raw.startswith(FORMULA_START):
            errors.append("Department starts with a formula character")
            dept_raw = ""
        if not EMAIL.match(email):
            errors.append("Email is missing or not valid")
        elif email in seen:
            errors.append(f"Same email as line {seen[email]}")
        else:
            seen[email] = r["_line"]

        year: Optional[int] = None
        y = re.sub(r"\D", "", r.get("graduation_year") or "")
        if len(y) == 4:
            year = int(y)
        if year is None or not 2000 <= year <= 2100:
            errors.append("Graduation year must be a 4-digit year, e.g. 2027")
            year = None
        elif not year_now - 2 <= year <= year_now + 6:
            warnings.append(f"Graduation year {year} is unusual for a current student")

        phone, pw = clean_phone(r.get("phone") or "")
        if pw:
            warnings.append(pw)

        dept_id = resolver.resolve(dept_raw) if dept_raw else None
        if not dept_raw:
            warnings.append("No department; the student will appear in the review queue")
        elif dept_id is None:
            warnings.append(f'Department "{dept_raw}" not recognised; it will appear in the review queue')

        action = "new"
        if not errors and email in existing:
            if str(existing[email]) != str(institution_id):
                errors.append("This email is already registered at another college")
            else:
                action = "update"
        if errors:
            action = "error"

        out.append({
            "line": r["_line"], "action": action, "full_name": name, "email": email,
            "graduation_year": year, "department": dept_raw, "department_id": dept_id,
            "department_name": resolver.names.get(dept_id) if dept_id else None,
            "phone": phone, "roll_no": roll, "errors": errors, "warnings": warnings,
        })

    summary = {"rows": len(out), "new": 0, "update": 0, "error": 0,
               "warnings": sum(1 for r in out if r["warnings"]),
               "unresolved_department": sum(1 for r in out if r["action"] != "error" and not r["department_id"])}
    for r in out:
        summary[r["action"]] += 1
    return out, summary


def stored_row(r: Dict[str, Any]) -> Dict[str, Any]:
    """What is kept in roster_imports.rows (what commit_roster_import reads)."""
    return {k: r.get(k) for k in ("action", "email", "full_name", "graduation_year", "department",
                                  "department_id", "phone", "roll_no")}
