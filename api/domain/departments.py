"""Department tools (ADR-003 M4-2): names, the review queue, merges.

norm_alias mirrors the SQL function c2c.norm_alias exactly, so a spelling grouped
here is the same key the database uses for department_aliases.
"""
import re
from collections import Counter
from typing import Any, Dict, Iterable, List, Optional

_NON_ALNUM = re.compile(r"[^a-z0-9]+")
SHORT_CODE = re.compile(r"^[A-Z0-9&.\-]{1,12}$")


class DepartmentError(ValueError):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def norm_alias(raw: Optional[str]) -> Optional[str]:
    s = _NON_ALNUM.sub(" ", (raw or "").lower()).strip()
    return s or None


def clean_name(name: Optional[str]) -> str:
    n = " ".join((name or "").split())
    if not 2 <= len(n) <= 120:
        raise DepartmentError("Department name must be 2-120 characters.")
    return n


def clean_short_code(code: Optional[str]) -> Optional[str]:
    if code is None or not code.strip():
        return None
    c = code.strip().upper()
    if not SHORT_CODE.match(c):
        raise DepartmentError("Short code: up to 12 letters, digits or & . - (e.g. CSE, AI&DS).")
    return c


def review_queue(students: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    """Group a college's students that have no department by how they spelled it.

    Returns {"groups": [{"alias_norm", "examples", "students"}], "blank": n}, biggest first.
    """
    counts: Counter = Counter()
    examples: Dict[str, Counter] = {}
    blank = 0
    for s in students:
        raw = s.get("department")
        key = norm_alias(raw)
        if key is None:
            blank += 1
            continue
        counts[key] += 1
        examples.setdefault(key, Counter())[(raw or "").strip()] += 1
    groups = [{"alias_norm": k, "students": n,
               "examples": [e for e, _ in examples[k].most_common(3)]}
              for k, n in counts.most_common()]
    return {"groups": groups, "blank": blank}


def department_rows(departments: List[Dict[str, Any]], students: Iterable[Dict[str, Any]],
                    disciplines: Dict[str, str]) -> List[Dict[str, Any]]:
    per_dept = Counter(str(s.get("department_id")) for s in students if s.get("department_id"))
    out = []
    for d in departments:
        code = d.get("discipline_code")
        out.append(dict(d, students=per_dept.get(str(d["id"]), 0),
                        discipline_name=disciplines.get(code) if code else None,
                        needs_mapping=code is None))
    return out
