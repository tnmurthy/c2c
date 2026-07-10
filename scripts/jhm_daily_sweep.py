"""
market_daily_sweep.py — Native Market Intelligence Cron
=========================================================
Runs daily (or on-demand) to:
  1. Fetch all active jobs from Supabase `jobs` table
  2. Fetch all assessed students from Supabase `students` table
  3. Call the native score_job_fit() function for each (job × student) pair
  4. Write qualified matches back to Supabase `leads` table

No JustHireMe sidecar. No httpx. No external service required.

Triggered by: cron (6AM daily) or manual `python scripts/market_daily_sweep.py`

Env vars needed (in .env.local):
  SUPABASE_URL  (or NEXT_PUBLIC_SUPABASE_URL)
  SUPABASE_SERVICE_ROLE_KEY
"""

from __future__ import annotations

import os
import sys
import time
import logging
from datetime import datetime, timezone

# Reconfigure stdout/stderr to support Unicode in Windows terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Add project root to sys.path to resolve services imports
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from dotenv import load_dotenv
from supabase import Client, create_client

from services.market_intelligence.fit_scorer import score_job_fit

# ─── Config ────────────────────────────────────────────────────────────────────

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
MIN_SCORE = int(os.getenv("MARKET_SWEEP_MIN_SCORE", "60"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [market-sweep] %(levelname)s: %(message)s",
)
log = logging.getLogger(__name__)


# ─── Profile mapper ────────────────────────────────────────────────────────────

def student_to_candidate(assessment: dict) -> dict:
    """Map C2C assessment & student data → native score_job_fit candidate schema."""
    student = assessment.get("students") or {}
    scores = assessment.get("dimension_scores") or {}
    return {
        "full_name": student.get("full_name", ""),
        "skills": student.get("skills") or [],
        "department": student.get("department", ""),
        "target_roles": [],
        "location": "",
        "experience_years": 0,  # fresh graduates
        "iq_score": scores.get("IQ"),
        "eq_score": scores.get("EQ"),
        "aq_score": scores.get("AQ"),
        "archetype": assessment.get("primary_profile"),
    }


# ─── Core sweep ────────────────────────────────────────────────────────────────

def run_sweep(supabase: Client) -> dict:
    """
    Execute the full job × student scoring matrix and upsert qualified leads.

    Returns a stats dict: {jobs, students, pairs_evaluated, leads_upserted, errors}
    """
    stats = {"jobs": 0, "students": 0, "pairs_evaluated": 0, "leads_upserted": 0, "errors": 0}

    # 1. Fetch active jobs
    log.info("Fetching active jobs from Supabase…")
    jobs_res = supabase.table("job_postings").select(
        "id, title, description, employer_id, location, requirements"
    ).eq("status", "active").execute()
    jobs = jobs_res.data or []
    stats["jobs"] = len(jobs)
    log.info("Found %d active jobs", stats["jobs"])

    # 2. Fetch assessed students via assessments table
    log.info("Fetching completed assessments from Supabase…")
    assessments_res = supabase.table("assessments").select(
        "student_id, primary_profile, dimension_scores, students (id, tenant_id, full_name, skills, department)"
    ).execute()
    assessments = assessments_res.data or []
    stats["students"] = len(assessments)
    log.info("Found %d assessed students", stats["students"])

    if not jobs or not assessments:
        log.warning("Nothing to process — stopping early")
        return stats

    # 3. Score each (job × student) pair using native fit scorer
    leads_to_upsert: list[dict] = []
    for job in jobs:
        posting_text = (
            f"{job.get('title', '')} "
            f"{job.get('description', '')} "
            f"{job.get('requirements', '')}"
        )
        for assessment in assessments:
            student = assessment.get("students")
            if not student:
                continue
            stats["pairs_evaluated"] += 1
            try:
                data = score_job_fit(posting_text, student_to_candidate(assessment))
                score = data.get("score", 0)

                if score >= MIN_SCORE:
                    leads_to_upsert.append({
                        "student_id": student["id"],
                        "job_id": job["id"],
                        "tenant_id": student["tenant_id"],
                        "fit_score": score,
                        "status": "new",
                        "source": "market_daily_sweep",
                        "score_breakdown": data.get("breakdown"),
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    })

            except Exception as exc:
                log.warning(
                    "Pair evaluation error job=%s student=%s: %s",
                    job["id"], student["id"], exc,
                )
                stats["errors"] += 1

    log.info(
        "Evaluated %d pairs → %d leads qualify (score ≥ %d)",
        stats["pairs_evaluated"], len(leads_to_upsert), MIN_SCORE,
    )

    # 4. Upsert qualified leads into Supabase in chunks of 50
    if leads_to_upsert:
        chunk_size = 50
        total_chunks = -(-len(leads_to_upsert) // chunk_size)  # ceiling division
        for i in range(0, len(leads_to_upsert), chunk_size):
            chunk = leads_to_upsert[i : i + chunk_size]
            try:
                supabase.table("leads").upsert(
                    chunk,
                    on_conflict="student_id,job_id",  # deduplicate
                ).execute()
                stats["leads_upserted"] += len(chunk)
                log.info(
                    "Upserted chunk %d/%d (%d leads)",
                    i // chunk_size + 1, total_chunks, len(chunk),
                )
            except Exception as exc:
                log.error("Upsert failed for chunk %d: %s", i // chunk_size, exc)
                stats["errors"] += 1

    return stats


# ─── Entry point ───────────────────────────────────────────────────────────────

def main():
    """Run the native market intelligence daily sweep."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        log.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local")
        raise SystemExit(1)

    log.info("═══════════════════════════════════════════")
    log.info("Market Intelligence Daily Sweep — %s", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"))
    log.info("Min score: %d | Mode: native (no sidecar)", MIN_SCORE)
    log.info("═══════════════════════════════════════════")

    t_start = time.monotonic()

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    stats = run_sweep(supabase)

    elapsed = time.monotonic() - t_start
    log.info("Sweep complete in %.1fs", elapsed)
    log.info(
        "Results: jobs=%d | students=%d | pairs=%d | leads_upserted=%d | errors=%d",
        stats["jobs"], stats["students"], stats["pairs_evaluated"],
        stats["leads_upserted"], stats["errors"],
    )


if __name__ == "__main__":
    main()
