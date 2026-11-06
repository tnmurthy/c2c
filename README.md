# Campus to Corporate (C2C) 👔
## Unified AI-First Talent Evaluation, Remediation & Placement Suite

> **"Bridging technical competence, 5Q developmental readiness, and automated career placement with deterministic AI cost controls."**

---

### 📂 Architecture & Service Directory

```text
┌─────────────────────────────────┬────────────────────────────────────┬──────────────────────────────────────┐
│ Service Unit                    │ Business Vision                    │ Technical Stack & Capabilities       │
├─────────────────────────────────┼────────────────────────────────────┼──────────────────────────────────────┤
│ Web Application (Next.js 14)    │ Multi-Persona Unified Experience   │ React 18, Tailwind CSS, Lucide Icons │
│ API Backend (FastAPI)           │ High-Performance Core Engine       │ Python 3.12, Uvicorn, Pydantic v2    │
│ Learning Subsystem (Moodle LMS) │ Zero-Token Remediation Academy     │ Docker, Alpine Moodle, Postgres 17   │
│ Assessment & 5Q Match Engine    │ Holistic Candidate Evaluation      │ 5Q Psychometric + Role Weighting     │
│ LTI 1.3 Advantage Gateway       │ Standardized Interoperability      │ IMS Global LTI 1.3 AGS 2.0, RSA JWKS │
│ AI Cost Ledger & Metering       │ Budget-Capped Model Controls       │ DB-level claim_ai_call, TypeSafe/Gemini│
│ Market Intelligence Desk        │ Real-Time Opportunity Sourcing     │ Headless Scraping, Job Enrichment    │
└─────────────────────────────────┴────────────────────────────────────┴──────────────────────────────────────┘
```

---

### 🏗️ Monorepo Structure

*   **/src/app**: Next.js 14 App Router (Student, Employer, TPO, Admin, Academy, and Assessment portals).
*   **/api**: FastAPI REST backend:
    *   `/api/routers/assessment_router.py`: Assessment submission, dimension scoring, and remediation sync.
    *   `/api/routers/lti_router.py`: LTI 1.3 Advantage endpoints (`/jwks`, `/config`, `/login`, `/launch`, `/auto-enrol`).
    *   `/api/routers/employer_router.py`: Job management and candidate fit evaluation.
    *   `/api/routers/costs_router.py`: AI call budget enforcement and administrative ledger.
    *   `/api/services/ai_budget.py`: Pre-call quota reservation preventing unmetered consumption.
    *   `/api/services/lti_ags.py`: LTI Assignment and Grade Services 2.0 grade passback engine.
    *   `/api/services/moodle_client.py`: Moodle REST API client for automated course enrolment.
*   **/services/lms**: Containerized Moodle LMS environment (`docker-compose.yml`, custom Nginx and PHP configuration).
*   **/services/market-scout**: Automated job scraping and opportunity enrichment daemon.
*   **/supabase/migrations**: Versioned database schemas, RLS policies, and Postgres functions.

---

### 🧠 5Q Developmental Matching Model

The C2C evaluation engine assesses candidates across five developmental quotients:
*   **IQ (Intelligence Quotient)**: Technical problem solving, algorithmic ability, and core concepts.
*   **AQ (Adversity Quotient)**: Resilience under debugging constraints and system failures.
*   **EQ (Emotional Quotient)**: Collaboration, constructive communication, and feedback handling.
*   **SQ (Social Quotient)**: Team dynamics, leadership presence, and peer negotiation.
*   **SpQ (Spiritual / Purpose Quotient)**: Alignment with organizational ethics, values, and long-term vision.

| Role Profile | IQ Weight | AQ Weight | EQ Weight | SQ Weight | SpQ Weight |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Technical / Engineering** | 40% | 30% | 20% | 5% | 5% |
| **Sales & Business Dev** | 10% | 20% | 35% | 35% | 0% |
| **Operations & Delivery** | 30% | 25% | 25% | 15% | 5% |
| **Leadership / Management** | 20% | 20% | 30% | 25% | 5% |

---

### 🛡️ Deterministic AI Cost Controls

No third-party LLM call is executed without a pre-allocated quota claim in PostgreSQL:
*   **Pre-Execution Lock**: Every billable model invocation calls `claim_ai_call(source, candidate_id)`.
*   **Hard Budget Caps**: Strict daily limits configured in `ai_settings` (`candidate_features`, `typesafe_evaluate`, `typesafe_match`, `gemini_scout`, `gemini_item_gen`).
*   **Graceful Degradation**: When quotas are exhausted or credentials unavailable, the system fails closed to verified heuristics (`is_live_api=False`) without blocking platform journeys.
*   **Audit Ledger**: Every consumed token event is tracked in `ai_call_ledger`. Zero pricing details are persisted in code.

---

### 🎓 LMS & Remediation Academy (/lms & /learn)

C2C features a unified, zero-token learning management architecture:
1. **Unified Routing**: Next.js proxies `/lms/*` to internal container port `8080` transparently, retaining the master domain `c2c.mytestbed.tech/lms`.
2. **Automated Gap Remediation**: Student assessment deficiencies automatically register curriculum tracks in Moodle via deterministic REST calls.
3. **LTI 1.3 AGS Passback**: Course completion and quiz evaluations synchronize back to the candidate's development report.
4. **Data Isolation**: Moodle operates on an isolated PostgreSQL instance (`moodle_c2c`), guaranteeing zero schema pollution on the primary Supabase cluster (`Talia`).

---

### 💻 Local Development Setup

#### 1. Prerequisites
*   Node.js 18+ and npm
*   Python 3.12+ with virtual environment
*   Docker Desktop (for LMS co-location)
*   PowerShell 7 / Bash

#### 2. Start LMS Infrastructure
```bash
cd services/lms
docker compose up -d
cd ../..
```

#### 3. Start C2C Web & API Services
```bash
# Installs dependencies & runs Next.js (port 3030) + FastAPI (port 8000) concurrently
npm run start:c2c
```

Access the development interfaces:
*   **Web Portal**: [http://localhost:3030](http://localhost:3030)
*   **Remediation Terminal**: [http://localhost:3030/learn](http://localhost:3030/learn)
*   **Embedded LMS**: [http://localhost:3030/lms](http://localhost:3030/lms)
*   **FastAPI Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 🚀 Production Deployment (Vercel + Supabase)

*   **Frontend**: Deployed via Vercel with automatic App Router edge optimization.
*   **Backend Serverless**: `api/main.py` runs as a high-efficiency Vercel Serverless Function via `vercel.json` rewrites.
*   **Database**: Supabase PostgreSQL with connection pooling via port `6543` (transaction mode) for serverless handlers.
*   **Environment Flags**: `ALLOW_DEMO_AUTH=false` and `NEXT_PUBLIC_ALLOW_DEMO_AUTH=false` are enforced in production environments.
