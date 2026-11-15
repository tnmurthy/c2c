"""Pre-flight check for the scout workflow. Prints only PASS/FAIL facts about each
setting - never a value - and exits 1 if a required one is unusable, so a
misconfigured run fails loudly instead of "succeeding" with nothing written.
"""
import os
import re
import sys

import requests

CHECKS = [
    # name, required, kind
    ("SUPABASE_URL", True, "url"),
    ("SUPABASE_KEY", True, "key"),
    ("SUPABASE_SERVICE_ROLE_KEY", True, "key"),
    ("GEMINI_API_KEY", False, "key"),
    ("C2C_DB_SCHEMA", False, "schema"),
]


def describe(raw: str) -> list:
    notes = []
    if raw.startswith("﻿"):
        notes.append("starts with a BOM")
    if raw != raw.strip():
        notes.append("has leading/trailing whitespace or newline")
    if raw.strip()[:1] in ("'", '"'):
        notes.append("wrapped in quotes")
    if "#" in raw:
        notes.append("contains '#' (comment pasted with the value?)")
    return notes


def main() -> int:
    failed = False
    for name, required, kind in CHECKS:
        raw = os.environ.get(name)
        if not raw:
            status = "MISSING" if required else "not set (optional)"
            print(f"{name:28s} {status}")
            failed |= required
            continue
        clean = raw.strip(" \t\r\n﻿\"'")
        problems = describe(raw)
        ok = True
        if kind == "url":
            ok = bool(re.fullmatch(r"https://[a-z0-9-]+\.supabase\.co/?", clean))
            if not ok:
                problems.append("is not of the form https://<project>.supabase.co")
        elif kind == "key":
            ok = len(clean) >= 20 and not re.search(r"\s", clean)
            if not ok:
                problems.append(f"length {len(clean)} / contains spaces - does not look like a key")
        elif kind == "schema":
            ok = clean in ("public", "c2c", "c2c_stg")
            if not ok:
                problems.append("is not public | c2c | c2c_stg")
        if ok and name == "GEMINI_API_KEY":
            # Free check: listing models costs no tokens and no c2c daily cap.
            try:
                r = requests.get("https://generativelanguage.googleapis.com/v1beta/models",
                                 params={"key": clean, "pageSize": 1}, timeout=15)
                if r.status_code != 200:
                    ok = False
                    reason = "API_KEY_INVALID" if "API_KEY_INVALID" in r.text else f"HTTP {r.status_code}"
                    problems.append(f"Google rejected the key ({reason})")
            except requests.RequestException as e:
                problems.append(f"could not verify with Google ({type(e).__name__})")
        verdict = "OK" if ok and not problems else ("OK after cleanup" if ok else "INVALID")
        print(f"{name:28s} {verdict}" + (f"  ({'; '.join(problems)})" if problems else ""))
        # A Gemini key that is set but rejected also fails the run: it would only
        # burn the daily cap on errors.
        failed |= (not ok) and (required or name == "GEMINI_API_KEY")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
