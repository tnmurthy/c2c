# WORKFLOW INTEGRATION: campus2corporate (c2c) 👔
## Master Standard Operating Procedure (SOP) & Process Workflows

This document establishes the Master Standard Operating Procedure (SOP) connecting the core engines, services, and subsystems of the **Campus-to-Corporate (C2C)** platform into an automated, AI-first talent evaluation, developmental remediation, and placement pipeline.

---

### 1. Architectural Foundation & References

This SOP is grounded in the formal system design documents:
*   🏛️ **High-Level Design**: [`c2c_hld.md`](file:///C:/tt-ai-stack/01_projects/active/makeover-talent-agency/c2c_hld.md)
*   🔬 **Low-Level Design**: [`c2c_lld.md`](file:///C:/tt-ai-stack/01_projects/active/makeover-talent-agency/c2c_lld.md)
*   📋 **System README**: [`README.md`](file:///C:/tt-ai-stack/01_projects/active/makeover-talent-agency/README.md)

---

### 2. The Integrated 5-Phase Candidate Lifecycle

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 5-PHASE CANDIDATE PIPELINE                             │
├───────────────────┬───────────────────┬───────────────────┬──────────────┬─────────────┤
│ Phase 1: Signal   │ Phase 2: Audit    │ Phase 3: Ordeal   │ Phase 4: Fix │ Phase 5: Win│
│ Opportunity Match │ Tech Competence   │ 5Q Psychometric   │ LMS Academy  │ Dossier/Job │
└───────────────────┴───────────────────┴───────────────────┴──────────────┴─────────────┘
```

| Phase | Service / Module | Core Functionality | Primary Technical Output |
|:---|---|---|---|
| **1. Signal & Sourcing** | `services/market-scout` | Headless scraping of market demand (HN/RemoteOK) with Gemini enrichment | Active job entries in `public.jobs` with 5Q requirement vectors |
| **2. Technical Audit** | `api/routers/assessment_router.py` | Cognitive & technical evaluation across targeted skill domains | Verified competency scores & deficient gap tokens |
| **3. The Ordeal (5Q)** | `api/routers/assessment_router.py` | Situational Judgment (SJT) & Likert psychometric assessment | Normalized IQ, AQ, EQ, SQ, SpQ scores + cognitive archetype |
| **4. Gap Remediation** | `services/lms` (Moodle) + `/learn` | Deterministic course auto-enrolment via REST and LTI 1.3 AGS passback | Zero-token course completion & mastery grade update |
| **5. Market Deployment** | `/employer/jobs/[id]` & `/portfolio/[id]` | Top-40 5Q pre-filtering + TypeSafe Jev deep match evaluation | Employer introductions, candidate hiring, & interactive Win95 portfolio |

---

### 3. Detailed Process SOPs & Inter-Service Handshakes

#### SOP 1: Sourcing to Assessment Trigger (Signal ➔ Ingress)
*   **Trigger**: Candidate registers via `/login` or is onboarded through institutional TPO batch ingestion.
*   **Data Flow**:
    1. Candidate account created in Supabase Auth.
    2. Profile linked in `public.students` with educational institution domain association.
    3. Live Market Scout alerts match regional/role opportunities based on candidate department.
    4. Student prompted to complete assessment at `/assessment`.

#### SOP 2: Assessment to Automated Remediation (Audit & Ordeal ➔ Fix)
*   **Trigger**: Candidate clicks "Submit Assessment" on `/assessment`.
*   **Execution**:
    1. Next.js dispatches payload to `POST /api/assessment/submit`.
    2. FastAPI runs `parse_scoring_logic()` and `calculate_5q_scores()`.
    3. Scores are persisted in `public.assessment_submissions` and `public.dimension_scores`.
    4. Gaps under 60% threshold are identified (e.g. `python_async`, `sql_window_functions`).
    5. **Deterministic Handshake**: FastAPI calls `MoodleClient.auto_remediate_gaps()`.
    6. Moodle auto-enrols the student in `C2C-PY-102` using internal REST tokens (**Zero AI token expense**).
    7. Next.js renders the `/learn` terminal displaying active remedial modules.

#### SOP 3: Moodle Completion to Developmental Record Sync (Fix ➔ Verification)
*   **Trigger**: Candidate finishes remediation course or passes module quiz in Moodle (`/lms`).
*   **Execution**:
    1. Moodle invokes LTI 1.3 AGS 2.0 passback endpoint `POST /api/lti/grade-passback`.
    2. FastAPI validates cryptographic signature against JWKS endpoint (`GET /api/lti/jwks`).
    3. Grade score is saved to `public.student_grades`.
    4. Candidate developmental report is updated; previously flagged skill gaps are resolved.

#### SOP 4: Employer Job Posting to Candidate Match & Hiring (Deployment ➔ Win)
*   **Trigger**: Employer posts vacancy or opens `/employer/jobs/[id]`.
*   **Execution**:
    1. FastAPI executes **Tier-1 Deterministic Filter**: all candidate 5Q profiles are scored against the job's role weights (Technical, Sales, Operations, or Leadership).
    2. The top 40 candidates advance to **Tier-2 Deep Evaluation**.
    3. FastAPI checks the database quota governor: `claim_ai_call('typesafe_match', candidate_id)`.
    4. **If quota approved**: TypeSafe Jev model evaluates deep requirements (`is_live_api=True`).
    5. **If quota exhausted or key unset**: System applies deterministic NLP heuristic match (`is_live_api=False`, provider "Heuristic estimate").
    6. Ranked candidate cards display fit percentage, 5Q radar, and requirement breakdown.
    7. Employer issues interview requests or updates status (`SHORTLISTED` ➔ `INTERVIEWING` ➔ `OFFERED`).

---

### 4. Deterministic Cost & Governance Standard

*   **No Unmetered Calls**: Any service invoking external models (TypeSafe, Gemini) MUST invoke `claim_ai_call()` before initiating HTTP requests.
*   **Zero-Token LMS Guarantee**: Course enrolments, progress tracking, and grade passbacks operate exclusively over deterministic REST and LTI 1.3 protocols.
*   **Administrative Oversight**: Real-time spend, quota limits, and cost reduction directives are monitored live at `/crm/costs`.

---

### 5. Verification & Service Health Checks

```bash
# 1. Run Complete Backend Router & Engine Tests
python -m pytest tests -q --ignore=tests/e2e --ignore=tests/e2e_flow_test.py

# 2. Check TypeScript & Frontend Build
npx tsc --noEmit && npm run build

# 3. Verify LTI & Moodle Service Ingress
curl -s http://localhost:8000/api/lti/jwks
curl -s -I http://localhost:3030/lms/
```
