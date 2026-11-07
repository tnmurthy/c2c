# Campus-to-Corporate (C2C) — High-Level Design (HLD)

---

## 1. Executive Summary & Design Principles

The **Campus-to-Corporate (C2C)** platform is a unified, multi-tenant talent evaluation, developmental remediation, and placement platform. It bridges candidates, educational institutions (TPOs), and enterprise employers through psychometric and technical assessments, automated gap remediation, and weighted candidate-job matching.

### Core Architectural Axioms
1. **Zero AI Token Waste**: Deterministic logic handles routing, matching heuristics, and LMS course enrolments. Every external AI model call (TypeSafe Jev, Google Gemini) is strictly metered, pre-claimed, and capped in the database before execution.
2. **Unified Surface Area**: All user-facing capabilities—including the co-located Moodle Learning Management System—are consolidated under the single primary domain (`c2c.mytestbed.tech` in production, `localhost:3030` in development). No external or orphaned subdomains.
3. **Database Isolation & Integrity**: Moodle operates inside an isolated PostgreSQL instance (`moodle_c2c`). The primary Supabase cluster (`Talia`) remains clean and exclusively dedicated to core C2C entities.
4. **Resilient Degradation**: If an upstream AI provider or microservice is unreachable or quota-capped, the platform falls back to labeled heuristic estimates (`is_live_api=False`) without failing user workflows.

---

## 2. End-to-End System Block Diagram

```mermaid
graph TB
    %% ==========================================
    %% CLIENT TIER
    %% ==========================================
    subgraph CLIENT["🌐 Client Layer (User Personas)"]
        direction LR
        STU["🎓 Student / Candidate\n(/dashboard, /learn, /assessment, /portfolio)"]
        TPO["🏫 Training & Placement Officer\n(/tpo-dashboard)"]
        EMP["🏢 Enterprise Employer\n(/employer/jobs, /employer/candidates)"]
        ADM["⚙️ Platform Administrator\n(/crm/costs, /admin)"]
    end

    %% ==========================================
    %% EDGE & PROXY TIER
    %% ==========================================
    subgraph EDGE["⚡ Edge, Routing & Ingress Gateway"]
        direction TB
        NEXT_ROUTER["Next.js 14 App Router & Ingress Proxy\n(Port 3030 / Vercel Edge)"]
        REWRITE_LMS["Next.js Rewrites Engine\n/lms/:path* ➔ http://127.0.0.1:8080/lms/:path*\n(skipTrailingSlashRedirect: true)"]
        REWRITE_API["Serverless API Rewrites\n/api/:path* ➔ FastAPI Backend"]
        NEXT_ROUTER --> REWRITE_LMS
        NEXT_ROUTER --> REWRITE_API
    end

    CLIENT -->|"HTTPS / Localhost Requests"| NEXT_ROUTER

    %% ==========================================
    %% APPLICATION & SERVICE TIER
    %% ==========================================
    subgraph BACKEND["🐍 Core Application Backend (FastAPI - Port 8000)"]
        direction TB
        API_MAIN["api/main.py\n(FastAPI Gateway & Route Registry)"]
        
        ROUTER_ASSESS["Assessment Router\n(/api/assessment)"]
        ROUTER_LTI["LTI 1.3 Advantage Router\n(/api/lti/*)"]
        ROUTER_EMP["Employer Router\n(/api/employer/*)"]
        ROUTER_COST["AI Cost Ledger Router\n(/api/crm/costs)"]
        ROUTER_PORT["Portfolio & Export Router\n(/api/portfolio, /api/student)"]

        API_MAIN --> ROUTER_ASSESS
        API_MAIN --> ROUTER_LTI
        API_MAIN --> ROUTER_EMP
        API_MAIN --> ROUTER_COST
        API_MAIN --> ROUTER_PORT

        ENGINE_5Q["5Q Match Engine\n(IQ, AQ, EQ, SQ, SpQ Deterministic Scorer)"]
        ENGINE_AGS["LTI AGS 2.0 Engine\n(Assignment & Grade Passback Service)"]
        CLIENT_MOODLE["Moodle REST Client\n(Gap-Driven Auto-Enrolment)"]
        ITEM_GEN["Assessment Item Generator\n(api/item_generator.py)"]
        
        ROUTER_ASSESS --> ENGINE_5Q
        ROUTER_ASSESS --> CLIENT_MOODLE
        ROUTER_LTI --> ENGINE_AGS
        ROUTER_ASSESS --> ITEM_GEN
    end

    REWRITE_API -->|"Direct / Proxy Route"| API_MAIN

    %% ==========================================
    %% LEARNING MANAGEMENT SUBSYSTEM (CONTAINERIZED)
    %% ==========================================
    subgraph LMS_SUBSYSTEM["🎓 LMS Subsystem (Docker Containerized)"]
        direction TB
        NGINX_LMS["Moodle Nginx Front\n(Port 8080, absolute_redirect: off)"]
        MOODLE_CORE["Alpine Moodle 4.5+ Core\n(PHP-FPM 8.4, config.php proxy-decoded)"]
        LMS_DB[("Moodle Postgres 17\n(Isolated DB: moodle_c2c)")]

        NGINX_LMS --> MOODLE_CORE
        MOODLE_CORE --> LMS_DB
    end

    REWRITE_LMS -->|"Local Reverse Proxy"| NGINX_LMS
    CLIENT_MOODLE -->|"Deterministic REST Token Call"| MOODLE_CORE
    MOODLE_CORE -.->|"LTI 1.3 AGS Passback"| ROUTER_LTI

    %% ==========================================
    %% MARKET SCOUT SUBSYSTEM
    %% ==========================================
    subgraph MARKET_SCOUT["🔎 Market Scout Pipeline (Daemon / Actions)"]
        direction TB
        SCOUT_SCRAPER["Headless Job Scraper\n(HN Hiring + RemoteOK)"]
        SCOUT_PIPE["AI Opportunity Scorer\n(services/market-scout/ai/pipeline.py)"]
        SCOUT_SYNC["Supabase Sync Engine\n(services/market-scout/storage)"]
        
        SCOUT_SCRAPER --> SCOUT_PIPE
        SCOUT_PIPE --> SCOUT_SYNC
    end

    %% ==========================================
    %% AI COST CONTROL & EXTERNAL PROVIDERS
    %% ==========================================
    subgraph AI_SUBSYSTEM["🛡️ AI Cost Controls & Intelligence Providers"]
        direction TB
        BUDGET_SVC["api/services/ai_budget.py\n(Pre-Flight Quota Allocator)"]
        LEDGER_GATE["PostgreSQL claim_ai_call()\n(Atomic Daily Limit Check)"]
        
        PROVIDER_TYPESAFE["TypeSafe AI (Jev Engine)\nCandidate Featurization & Match"]
        PROVIDER_GEMINI["Google Gemini Flash\nMarket Scout & Item Generator"]

        BUDGET_SVC --> LEDGER_GATE
        LEDGER_GATE -->|"Approved Call"| PROVIDER_TYPESAFE
        LEDGER_GATE -->|"Approved Call"| PROVIDER_GEMINI
        LEDGER_GATE -.->|"Exhausted / Blocked"| FALLBACK["Verified Heuristic Fallback\n(is_live_api: false)"]
    end

    ROUTER_ASSESS --> BUDGET_SVC
    ROUTER_EMP --> BUDGET_SVC
    SCOUT_PIPE --> BUDGET_SVC

    %% ==========================================
    %% PERSISTENCE & DATA BACKBONE
    %% ==========================================
    subgraph PERSISTENCE["🗄️ Primary Data Backbone (Supabase Talia Cluster)"]
        direction TB
        SUPA_AUTH["Supabase Auth\n(JWT, Role Metadata, Demo Bypass)"]
        SUPA_DB[("PostgreSQL Talia Cluster\n(Schema: public)\nstudents · institutions · employers\nassessment_submissions · job_matches\nai_settings · ai_call_ledger · jobs")]
        SUPA_STORE["Supabase Storage\n(Portfolios · Resumes · Reports)"]
    end

    API_MAIN <-->|"JWT Validation & RLS Queries"| PERSISTENCE
    LEDGER_GATE <-->|"Atomic Ledger Claims"| SUPA_DB
    SCOUT_SYNC -->|"Upsert Scored Jobs"| SUPA_DB
```

---

## 3. Tiered System Architecture

### 3.1. Presentation Tier (Next.js 14)
*   **App Router Structure**: Modular route grouping under `src/app/(main)` for students, employers, institutions, administrators, and the C2C Academy.
*   **Universal Remediation Terminal (`/learn`)**: Embedded learning track viewer parsing student assessment gaps and rendering curated curriculum modules directly inside the platform.
*   **Interactive Retro Portfolio (`/portfolio/[id]`)**: Gamified Windows 95 desktop environment visualizing cognitive radar charts, live credentials, and an interactive DOS terminal.
*   **Passwordless Fast Authentication**: Zero-friction demo switcher on `/login` supported by `ALLOW_DEMO_AUTH` for local and staging workflows while enforcing strict production guards.

### 3.2. Edge & Routing Ingress
*   **Subpath Co-Location (`next.config.js`)**: Routes `/lms/*` to internal port `8080`, preserving domain cookies and sessions.
*   **Trailing-Slash Normalization**: Configured `skipTrailingSlashRedirect: true` in Next.js paired with `absolute_redirect off;` in Nginx to prevent redirect loops between Next.js and Moodle.
*   **Proxy Parameter Transparency**: In-container `config.php` automatically decodes URL-encoded `%2F` query strings forwarded by edge proxies.

### 3.3. Application Core (FastAPI)
*   **Unified Python Backend**: Runs co-located in development and serverless on Vercel via `api/main.py`.
*   **5Q Deterministic Scoring Engine**: Evaluates Intelligence (IQ), Adversity (AQ), Emotional (EQ), Social (SQ), and Spiritual (SpQ) dimensions against role-specific requirement profiles.
*   **LTI 1.3 Advantage Suite**:
    *   `GET /api/lti/jwks`: Exposes public RSA256 keys for cryptographic signature validation.
    *   `GET /api/lti/config`: Delivers OpenID Connect tool registration specifications.
    *   `GET /api/lti/login`: Initiates OIDC login flow.
    *   `POST /api/lti/launch`: Validates incoming LTI launch tokens, auto-provisions candidate accounts, and redirects to target learning objects.
    *   `POST /api/lti/grade-passback`: Receives AGS 2.0 evaluation scores and updates the student development record.
    *   `POST /api/lti/auto-enrol`: Deterministically binds identified assessment gaps to remediation courses.

### 3.4. Learning Subsystem (Moodle LMS)
*   **Container Architecture**: Co-located Alpine Moodle (`erseco/alpine-moodle`) and PostgreSQL 17 Alpine communicating across a private Docker bridge (`c2c-lms-net`).
*   **Zero Token Remediation**: Course assignments and gap remediations execute via deterministic Moodle REST endpoints (`enrol_manual_enrol_users`), entirely independent of generative AI models.

### 3.5. AI Cost Control Subsystem
*   **Atomic Quota Claims**: No model invocation occurs without an atomic record in `ai_call_ledger` verified by the database function `claim_ai_call()`.
*   **Enforced Quota Caps**: Daily limits enforced per service category:
    *   `candidate_features`: Daily limit 300
    *   `typesafe_evaluate`: Daily limit 200
    *   `typesafe_match`: Daily limit 200
    *   `gemini_scout`: Daily limit 60
    *   `gemini_item_gen`: Daily limit 50
*   **Heuristic Guarantee**: In the event of network disruption, key expiration, or exhausted budget, verified mathematical and NLP heuristics generate valid results without breaking user journeys.

---

## 4. Comprehensive Process & Workflow Architecture

The C2C platform organizes all capabilities into 9 standard processes:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 C2C PROCESS ARCHITECTURE                               │
├─────────────────────────┬───────────────────────────────┬──────────────────────────────┤
│ 1. 5Q Assessment Engine │ 2. Zero-Token LMS Remediation │ 3. LTI 1.3 Advantage Gateway │
│ 4. Employer Match & Fit │ 5. AI Cost Control & Ledger   │ 6. Market Scout Pipeline     │
│ 7. Item Generation Bank │ 8. Retro Portfolio & Dossier  │ 9. Multi-Tenant Role Ingress │
└─────────────────────────┴───────────────────────────────┴──────────────────────────────┘
```

### 4.1. Process 1: Candidate Assessment & 5Q Psychometric Scoring Flow

```mermaid
sequenceDiagram
    autonumber
    actor Candidate as 🎓 Candidate
    participant Web as 🌐 Next.js (/assessment)
    participant API as 🐍 FastAPI Backend
    participant DB as 🗄️ Supabase Talia
    participant Moodle as 🎓 Moodle LMS (/lms)

    Candidate->>Web: Submits 5Q & Technical Responses
    Web->>API: POST /api/assessment/submit
    API->>API: Compute 5Q Scores (IQ, AQ, EQ, SQ, SpQ)
    API->>DB: Upsert assessment_submissions & dimension_scores
    
    alt Candidate Has Skill Gaps
        API->>API: Identify Deficient Competencies (e.g., Python, SQL)
        API->>Moodle: Deterministic REST Enrol (auto_remediate_gaps)
        Moodle-->>API: Enrolment Confirmation (Course IDs)
        API->>DB: Record Active Remediation Tracks
    end

    API-->>Web: Return Assessment Result & Remediation Plan
    Candidate->>Web: Navigates to /learn (Academy)
    Web->>Candidate: Renders Target Remediation Modules & Direct /lms Links
```

### 4.2. Process 2 & 3: LTI 1.3 Advantage Launch & AGS Grade Passback

```mermaid
sequenceDiagram
    autonumber
    participant Moodle as 🎓 Moodle LMS
    participant LTI as 🐍 LTI Router (/api/lti/*)
    participant AGS as 📊 LTI AGS Service
    participant DB as 🗄️ Supabase Talia

    Moodle->>LTI: GET /api/lti/login (OIDC Launch Initiation)
    LTI-->>Moodle: 302 Redirect to Authentication URL
    Moodle->>LTI: POST /api/lti/launch (JWT Signed Launch Token)
    LTI->>LTI: Verify Token Signature via RSA JWKS Key
    LTI->>DB: Sync Candidate Profile & LTI Context
    LTI-->>Moodle: 302 Redirect to Embedded Assessment / Track
    
    Note over Moodle,LTI: Candidate completes assignment / quiz in Moodle
    
    Moodle->>LTI: POST /api/lti/grade-passback (Score, MaxScore, Evaluation)
    LTI->>AGS: Process Assignment & Grade Services Request
    AGS->>DB: Update student developmental report & verified competencies
    AGS-->>Moodle: 200 OK (Grade Synchronized)
```

### 4.3. Process 4 & 5: Employer Candidate Matching & Cost Enforcement

```mermaid
sequenceDiagram
    autonumber
    actor Employer as 🏢 Employer
    participant Web as 🌐 Next.js (/employer/jobs/:id)
    participant API as 🐍 FastAPI Backend
    participant Ledger as 🛡️ DB claim_ai_call()
    participant TypeSafe as 🤖 TypeSafe Jev AI
    participant DB as 🗄️ Supabase Talia

    Employer->>Web: Opens Job Candidates View
    Web->>API: GET /api/employer/jobs/{id}
    API->>DB: Fetch Active Candidates & 5Q Profiles
    API->>API: Filter Top 40 Candidates by Deterministic 5Q Fit
    
    API->>Ledger: claim_ai_call('typesafe_match', candidate_id)
    alt Daily Cap Remaining & API Configured
        Ledger-->>API: Quota Approved
        API->>TypeSafe: Evaluate Deep Requirement Alignment
        TypeSafe-->>API: Qualitative Match Analysis
    else Quota Exceeded or Key Missing
        Ledger-->>API: Quota Refused
        API->>API: Compute Labeled Heuristic Match (is_live_api: false)
    end

    API->>DB: Upsert job_candidate_matches
    API-->>Web: Deliver Ranked Candidates with 5Q & Match Evidence
    Web-->>Employer: Render Visual Breakdown, Decision Cards & Fit Matrix
```

### 4.4. Process 6: Market Intelligence Desk & Opportunity Sourcing

```mermaid
sequenceDiagram
    autonumber
    participant Daemon as ⏱️ Market Scout Daemon
    participant Scraper as 🌐 Scrapers (HN/RemoteOK)
    participant Budget as 🛡️ claim_ai_call('gemini_scout')
    participant Gemini as 🤖 Google Gemini Flash
    participant DB as 🗄️ Supabase Talia (public.jobs)

    Daemon->>Scraper: Execute Periodic Scrape
    Scraper-->>Daemon: Raw Job Postings
    Daemon->>Daemon: Hash Deduplication against stored jobs
    
    Daemon->>Budget: claim_ai_call('gemini_scout')
    alt Quota Approved & Key Present
        Budget-->>Daemon: Quota Approved
        Daemon->>Gemini: Parse Requirements & Opportunity Score
        Gemini-->>Daemon: Structured Fit Vector
    else Quota Refused or Unmetered
        Budget-->>Daemon: Quota Refused
        Daemon->>Daemon: Apply Regex Extraction (Default Score 50)
    end
    
    Daemon->>DB: Upsert into public.jobs
```

---

## 5. Security Architecture & Access Control

| Domain | Mechanism | Implementation Guarantee |
|---|---|---|
| **Authentication** | Supabase Auth + JWT | Strict RS256 token verification on all protected API routes |
| **Data Isolation** | PostgreSQL Row-Level Security (RLS) | Tenants access only their respective organization rows |
| **LMS Isolation** | Docker Network Boundary | Moodle DB unreachable from host network; only Moodle app can query it |
| **LTI 1.3 Advantage** | Asymmetric Cryptography | RSA256 private/public key pairs rotated via `/api/lti/jwks` |
| **Secrets Governance** | Environment Isolation | Secrets loaded via `.env.local` / Vercel Vault; zero secrets in codebase |
| **Demo Access Guard** | Conditional Guard | `ALLOW_DEMO_AUTH` disabled by default in production |

---

## 6. Mandatory 4-Reviewer Architecture Board Review

Following the architecture standard (`04_playbooks/REVIEW_BOARD.md`), this design has undergone rigorous inspection across four distinct review disciplines:

### 1. Systems Architect Review
*   **Assessment**: The decision to keep Moodle inside an isolated container while proxying through Next.js prevents domain fragmentation and retains single sign-on simplicity.
*   **Resolution**: Implemented `skipTrailingSlashRedirect: true` in Next.js and `absolute_redirect off;` in Nginx to eliminate reverse proxy trailing-slash ping-pong loops. All 9 platform processes have strictly decoupled boundaries.
*   **Verdict**: **APPROVED**

### 2. Cost Engineer Review
*   **Assessment**: High-volume candidate onboarding risks runaway token expense if LLMs are used for grading or routing.
*   **Resolution**: 100% of remediation routing and 5Q initial matching is mathematically deterministic. All generative model invocations (TypeSafe, Gemini) are guarded by database-level daily limits (`claim_ai_call`) with heuristic fallback. AI token consumption for LMS is zero.
*   **Verdict**: **APPROVED**

### 3. Security Reviewer Review
*   **Assessment**: Subpath proxying must not expose internal container ports or leak administrative database tables.
*   **Resolution**: Container port `8080` binds strictly to `127.0.0.1`. The Moodle database runs on a private Docker bridge with no host port mapping. Primary Supabase Talia cluster tables are guarded by RLS policies. Demo auth is strictly gated by environment flags.
*   **Verdict**: **APPROVED**

### 4. Product Engineer Review
*   **Assessment**: Students and employers must have a seamless, single-window journey without jarring login screens or disconnected URLs.
*   **Resolution**: The `/learn` terminal allows students to view curriculum roadmaps and launch directly into `/lms` with guest auto-access. Employers review candidate fit directly inside `/employer/jobs/[id]`. Candidates share high-converting retro portfolios on `/portfolio/[id]`.
*   **Verdict**: **APPROVED**

---

## 7. Implementation Tracker & Roadmap

| Workstream | Milestone / Capability | Status | Target Timeline |
|---|---|:---:|:---:|
| **Edge Routing** | Unified Next.js reverse proxy for `/lms/*` and `/api/*` | **Done** | Current |
| **LMS Integration** | Co-located Alpine Moodle + Postgres 17 on Docker | **Done** | Current |
| **LTI 1.3 Advantage** | JWKS, OIDC initiation, AGS 2.0 grade passback engine | **Done** | Current |
| **5Q Match Engine** | Role-weighted psychometric and technical fit engine | **Done** | Current |
| **AI Cost Ledger** | Pre-flight quota reservation (`claim_ai_call`) & daily caps | **Done** | Current |
| **Low-Level Design** | Full technical LLD covering all 9 processes (`c2c_lld.md`) | **Done** | Current |
| **Demo Auth Engine** | Passwordless 1-click switcher for local and test runs | **Done** | Current |
| **Playwright in CI** | Comprehensive E2E test automation in GitHub Actions | Open | Next 14 Days |
| **Production Secrets** | Vercel configuration for `SUPABASE_SERVICE_ROLE_KEY` | Open (Human) | Next 7 Days |
