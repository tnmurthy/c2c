"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  Layers,
  Search,
  ShieldCheck,
  Zap,
  Activity,
  ChevronRight,
  Database,
  ArrowRight,
  AlertTriangle,
  Code,
  Users,
  Compass,
  DollarSign,
  Copy,
  Check,
  Server,
  Globe
} from "lucide-react";

interface ProcessItem {
  id: string;
  name: string;
  shortname: string;
  category: "assessment" | "lms" | "matching" | "governance" | "market" | "ingress";
  persona: string;
  lifecyclePhase: string;
  router: string;
  database: string;
  aiQuotaSource: string;
  dailyCap: string;
  fallback: string;
  overview: string;
  endpoints: { method: string; path: string; description: string }[];
  signatures: string[];
  schemaSnippet: string;
  samplePayload: string;
  flowSteps: string[];
}

const PROCESSES: ProcessItem[] = [
  {
    id: "P1",
    name: "Candidate Assessment & 5Q Scoring Engine",
    shortname: "5Q Assessment Engine",
    category: "assessment",
    persona: "Student",
    lifecyclePhase: "Phase 2 & 3 (Audit & The Ordeal)",
    router: "api/routers/assessment_router.py",
    database: "public.psychometric_items, public.assessment_submissions, public.dimension_scores",
    aiQuotaSource: "None (100% Deterministic)",
    dailyCap: "Unlimited (Zero Token)",
    fallback: "Mathematical Likert/SJT parsing with heuristic normalizer",
    overview: "Evaluates candidates across Intelligence (IQ), Adversity (AQ), Emotional (EQ), Social (SQ), and Spiritual (SpQ) quotients, mapping them into cognitive archetypes (THE_BUILDER, THE_LEADER, THE_ANCHOR) and isolating competency gaps under 60%.",
    endpoints: [
      { method: "POST", path: "/api/assessment/submit", description: "Processes 5Q answers, computes scores, and initiates gap enrolment" },
      { method: "GET", path: "/api/assessment/questions", description: "Retrieves active psychometric question items" },
      { method: "GET", path: "/api/health/agents", description: "Health check verifying C2C_Orchestrator_V2 availability" }
    ],
    signatures: [
      "def parse_scoring_logic(logic_str: str, item_type: str) -> Dict[str, Any]",
      "def calculate_5q_scores(responses: List[Dict], items_map: Dict) -> Dict[str, int]",
      "def classify_archetype(scores: Dict[str, int]) -> str",
      "def extract_skill_gaps(responses: List[Dict], items_map: Dict) -> List[str]"
    ],
    schemaSnippet: `CREATE TABLE public.dimension_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.assessment_submissions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    dimension VARCHAR(10) NOT NULL CHECK (dimension IN ('IQ', 'AQ', 'EQ', 'SQ', 'SpQ')),
    score INT NOT NULL CHECK (score BETWEEN 0 AND 100),
    CONSTRAINT uq_submission_dimension UNIQUE (submission_id, dimension)
);`,
    samplePayload: `{
  "submission_id": "a5e8f490-1c32-47d5-86f2-3e28491d90aa",
  "archetype": "THE_BUILDER",
  "scores": { "iq": 84, "aq": 78, "eq": 62, "sq": 55, "spq": 70 },
  "gaps": ["python_async", "sql_window_functions"],
  "remediation_status": "ENROLLED"
}`,
    flowSteps: [
      "Candidate submits SJT, Likert, and cognitive answers via /assessment terminal.",
      "FastAPI parses scoring logic and normalizes 5Q vectors [0-100].",
      "Scores and archetype are upserted into assessment_submissions and dimension_scores.",
      "Gaps under 60% threshold are identified and passed to the Moodle LMS client.",
      "Results render immediately on student dashboard with radar visualizer."
    ]
  },
  {
    id: "P2",
    name: "Automated Gap Remediation & Zero-Token LMS Enrolment",
    shortname: "LMS Auto-Remediation",
    category: "lms",
    persona: "Student",
    lifecyclePhase: "Phase 4 (Refinement & Fix)",
    router: "api/services/moodle_client.py, api/routers/lti_router.py",
    database: "Isolated Docker DB (moodle_c2c, Postgres 17)",
    aiQuotaSource: "Zero Token (Deterministic REST)",
    dailyCap: "Unlimited",
    fallback: "Serves pre-cached curriculum syllabus in /learn terminal",
    overview: "Automatically maps identified student assessment gaps to structured Moodle course IDs and registers candidates via deterministic Moodle REST API (enrol_manual_enrol_users) with zero generative AI tokens.",
    endpoints: [
      { method: "POST", path: "/api/lti/auto-enrol", description: "Binds deficient skill gaps to target Moodle courses" },
      { method: "GET", path: "/lms/*", description: "Transparent Next.js reverse-proxy to internal port 8080" },
      { method: "GET", path: "/learn", description: "Universal remediation terminal displaying active courses" }
    ],
    signatures: [
      "class MoodleClient:",
      "    def call(self, wsfunction: str, params: Dict[str, Any]) -> Any",
      "    def get_course_by_shortname(self, shortname: str) -> Optional[Dict[str, Any]]",
      "    def enrol_user_in_course(self, user_id: int, course_id: int) -> bool",
      "    def auto_remediate_gaps(self, student_email: str, gaps: List[str]) -> List[Dict]"
    ],
    schemaSnippet: `# services/lms/docker-compose.yml configuration
services:
  moodle_db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: moodle_c2c
    networks:
      - c2c-lms-net
  moodle_app:
    image: erseco/alpine-moodle:4.5
    ports:
      - "127.0.0.1:8080:8080"`,
    samplePayload: `{
  "python_async": { "course_code": "C2C-PY-102", "course_id": 102 },
  "sql_window_functions": { "course_code": "C2C-DB-201", "course_id": 201 },
  "git_rebase_conflict": { "course_code": "C2C-GIT-101", "course_id": 105 },
  "eq_peer_feedback": { "course_code": "C2C-EQ-301", "course_id": 301 }
}`,
    flowSteps: [
      "Assessment router triggers MoodleClient.auto_remediate_gaps() with skill tokens.",
      "MoodleClient matches tokens against internal course lookup table.",
      "REST token call executes enrol_manual_enrol_users into Moodle instance.",
      "Student navigates to /learn and directly launches /lms with session cookies preserved.",
      "Zero LLM tokens consumed throughout entire learning journey."
    ]
  },
  {
    id: "P3",
    name: "LTI 1.3 Advantage Gateway & AGS 2.0 Grade Passback",
    shortname: "LTI 1.3 AGS Gateway",
    category: "lms",
    persona: "Student & TPO",
    lifecyclePhase: "Phase 4 (Refinement & Fix)",
    router: "api/routers/lti_router.py, api/services/lti_ags.py",
    database: "public.lti_deployments, public.student_grades",
    aiQuotaSource: "None (Cryptographic RSA256)",
    dailyCap: "Unlimited",
    fallback: "Local session authorization redirect with structured error logging",
    overview: "Provides IMS Global LTI 1.3 Advantage interoperability with rotating RSA256 JWKS keys, OpenID Connect tool launch orchestration, and Assignment and Grade Services (AGS 2.0) score synchronization back into Supabase.",
    endpoints: [
      { method: "GET", path: "/api/lti/jwks", description: "Distributes public RSA keys for token verification" },
      { method: "GET", path: "/api/lti/login", description: "OIDC login initiation endpoint" },
      { method: "POST", path: "/api/lti/launch", description: "Validates LTI JWT id_token and routes user" },
      { method: "POST", path: "/api/lti/grade-passback", description: "Receives AGS 2.0 score payloads" }
    ],
    signatures: [
      "def get_or_generate_key() -> rsa.RSAPrivateKey",
      "def get_jwks() -> Dict[str, Any]",
      "def process_grade_passback(score_payload: Dict[str, Any]) -> bool"
    ],
    schemaSnippet: `CREATE TABLE public.student_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    course_id VARCHAR(50) NOT NULL,
    score NUMERIC(5, 2) NOT NULL,
    max_score NUMERIC(5, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'FullyGraded',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
    samplePayload: `{
  "timestamp": "2026-11-07T08:15:30Z",
  "scoreGiven": 92.0,
  "scoreMaximum": 100.0,
  "comment": "Mastered asynchronous coroutines & event loops with passing unit tests.",
  "activityProgress": "Completed",
  "gradingProgress": "FullyGraded",
  "userId": "usr_99812401-419b-4b2a-a924-f7b5e4088921"
}`,
    flowSteps: [
      "Moodle launches tool via OIDC initiation on /api/lti/login.",
      "FastAPI validates authentication state and returns 302 redirect.",
      "Signed JWT id_token is delivered to /api/lti/launch and verified against JWKS.",
      "Candidate completes course quiz; Moodle dispatches AGS 2.0 grade payload.",
      "student_grades updated in Supabase; deficient skill gap tag is resolved."
    ]
  },
  {
    id: "P4",
    name: "Candidate Matching, 5Q Radar & Employer Decision Engine",
    shortname: "Employer Match & Fit",
    category: "matching",
    persona: "Employer",
    lifecyclePhase: "Phase 5 (Market Deployment & Win)",
    router: "api/routers/employer_router.py, services/matching/scorer.py",
    database: "public.job_postings, public.job_candidate_matches",
    aiQuotaSource: "typesafe_match",
    dailyCap: "200 calls / day",
    fallback: "Deterministic NLP heuristic match (is_live_api: false, provider: Heuristic estimate)",
    overview: "Employs a two-tier matching architecture: Tier-1 deterministically pre-filters the top 40 candidates via role-weighted 5Q quotients; Tier-2 executes deep requirement alignment using TypeSafe Jev guarded by database daily quota caps.",
    endpoints: [
      { method: "POST", path: "/api/employer/jobs", description: "Creates job posting with role profile" },
      { method: "GET", path: "/api/employer/jobs/{id}", description: "Delivers ranked candidates with 5Q & fit vectors" },
      { method: "PATCH", path: "/api/employer/jobs/{id}/candidates/{student_id}", description: "Updates hiring decision status" }
    ],
    signatures: [
      "def calculate_match_score(quotients: Dict[str, int], role_category: str) -> float",
      "def score_candidates_for_job(client, job_id: str) -> List[Dict]",
      "def evaluate_candidate_fit(reqs: str, candidate_data: Dict) -> Dict[str, Any]"
    ],
    schemaSnippet: `CREATE TABLE public.job_candidate_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    fit_score INT NOT NULL,
    quotient_score INT NOT NULL,
    is_live_api BOOLEAN DEFAULT FALSE,
    provider VARCHAR(50) DEFAULT 'Heuristic estimate',
    status VARCHAR(30) DEFAULT 'SHORTLISTED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_job_candidate UNIQUE (job_id, student_id)
);`,
    samplePayload: `{
  "student_id": "usr_99812401-419b-4b2a-a924-f7b5e4088921",
  "name": "Arjun Sharma",
  "fit_score": 87,
  "5q_vector": { "iq": 84, "aq": 78, "eq": 62, "sq": 55, "spq": 70 },
  "is_live_api": true,
  "provider": "TypeSafe Jev",
  "status": "SHORTLISTED"
}`,
    flowSteps: [
      "Employer opens job requisition console on /employer/jobs/[id].",
      "Tier-1 Deterministic Filter ranks all candidates based on role 5Q weights.",
      "Top 40 candidates advance to Tier-2 guarded deep evaluation.",
      "Engine invokes claim_ai_call('typesafe_match', candidate_id) in PostgreSQL.",
      "If quota approved: TypeSafe Jev evaluates fit; else system computes labeled heuristic."
    ]
  },
  {
    id: "P5",
    name: "Deterministic AI Cost Control & Pre-Flight Ledger",
    shortname: "AI Cost Ledger & Governor",
    category: "governance",
    persona: "Admin",
    lifecyclePhase: "Cross-Cutting Platform Governance",
    router: "api/routers/costs_router.py, api/services/ai_budget.py",
    database: "public.ai_settings, public.ai_call_ledger",
    aiQuotaSource: "System Financial Governor",
    dailyCap: "Configurable per source in ai_settings",
    fallback: "Atomic refusal of unmetered calls before HTTP network execution",
    overview: "Enforces strict financial ceilings on all billable LLM calls. No model invocation occurs without an atomic PostgreSQL reservation in ai_call_ledger. Provides real-time spend dashboards, saturation advice, and zero pricing in code.",
    endpoints: [
      { method: "GET", path: "/api/crm/costs/summary", description: "Delivers 30-day spend summary, caps & cost reduction advice" },
      { method: "POST", path: "/api/crm/costs/settings", description: "Configures source-specific daily call ceilings" }
    ],
    signatures: [
      "def claim_ai_call(client, source: str, candidate_id: Optional[str] = None) -> bool",
      "def build_advice(summary_data: Dict[str, Any]) -> List[Dict]",
      "def suggested_account_cap(summary_data: Dict[str, Any]) -> int"
    ],
    schemaSnippet: `CREATE OR REPLACE FUNCTION public.claim_ai_call(
    p_source VARCHAR(50),
    p_candidate_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_daily_cap INT;
    v_daily_spent INT;
BEGIN
    EXECUTE format('SELECT %I_max_calls_per_day FROM public.ai_settings LIMIT 1', p_source)
    INTO v_daily_cap;
    IF v_daily_cap IS NOT NULL THEN
        SELECT COUNT(*) INTO v_daily_spent FROM public.ai_call_ledger 
        WHERE source = p_source AND created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC');
        IF v_daily_spent >= v_daily_cap THEN RETURN FALSE; END IF;
    END IF;
    INSERT INTO public.ai_call_ledger (source, candidate_id) VALUES (p_source, p_candidate_id);
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`,
    samplePayload: `{
  "days": 30,
  "total_calls": 412,
  "sources": {
    "typesafe_match": { "calls_today": 142, "cap": 200, "saturated": false },
    "gemini_scout": { "calls_today": 48, "cap": 60, "saturated": false },
    "gemini_item_gen": { "calls_today": 12, "cap": 50, "saturated": false }
  },
  "advice": ["typesafe_match usage is healthy at 71% of daily cap."]
}`,
    flowSteps: [
      "Any billable model service calls claim_ai_call(source, candidate_id).",
      "PostgreSQL function checks daily source cap and account-wide ceiling atomically.",
      "If approved, claim is written to ai_call_ledger and returns True.",
      "If ceiling reached, function immediately returns False without initiating HTTP call.",
      "Platform executes labeled fallback heuristic with zero token expense."
    ]
  },
  {
    id: "P6",
    name: "Market Scout Headless Scraping & Sourcing Pipeline",
    shortname: "Market Scout Pipeline",
    category: "market",
    persona: "Student & Admin",
    lifecyclePhase: "Phase 1 (Discovery & Signal)",
    router: "services/market-scout/scraper/main.py",
    database: "public.jobs, public.market_entities",
    aiQuotaSource: "gemini_scout",
    dailyCap: "60 calls / day",
    fallback: "Regex requirement parser with neutral opportunity score (50)",
    overview: "Autonomous background scraping engine monitoring HackerNews Hiring and RemoteOK. Applies SHA256 content deduplication, claims quota via gemini_scout, extracts 5Q role requirements, and synchronizes live vacancies into Supabase.",
    endpoints: [
      { method: "POST", path: "/api/employer/market/scrape", description: "Triggers headless scraper daemon manually" },
      { method: "GET", path: "/api/student/opportunities", description: "Delivers matched live job vacancies to student dashboard" }
    ],
    signatures: [
      "def run_scraper_pipeline() -> None",
      "def deduplicate_job_listings(raw_jobs: List[Dict]) -> List[Dict]",
      "def score_job_opportunity(job: Dict) -> Dict[str, Any]"
    ],
    schemaSnippet: `CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    source VARCHAR(50) NOT NULL,
    raw_text TEXT,
    opportunity_score INT DEFAULT 50,
    required_5q JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`,
    samplePayload: `{
  "title": "Full-Stack Distributed Systems Engineer",
  "company": "Supabase Partner Network",
  "source": "hn_hiring",
  "opportunity_score": 92,
  "required_5q": { "iq": 40, "aq": 30, "eq": 20, "sq": 5, "spq": 5 }
}`,
    flowSteps: [
      "Scheduled daemon triggers headless scraping against HN Hiring & RemoteOK.",
      "Deduplication engine hashes URL and title against existing jobs in Supabase.",
      "Unique jobs claim quota via claim_ai_call('gemini_scout').",
      "Gemini Flash extracts skill requirements and computes opportunity score.",
      "Scored jobs sync to public.jobs and alert matching candidates on dashboard."
    ]
  },
  {
    id: "P7",
    name: "Assessment Item Generation & Admin Curriculum Authoring",
    shortname: "Item Generation Engine",
    category: "assessment",
    persona: "Admin",
    lifecyclePhase: "Platform Operations & Authoring",
    router: "api/item_generator.py, scripts/generate_bank_llm.py",
    database: "public.psychometric_items",
    aiQuotaSource: "gemini_item_gen",
    dailyCap: "50 calls / day",
    fallback: "Curated static fallback question bank (api/fallback_bank.json)",
    overview: "Allows platform administrators to generate and calibrate psychometric and technical evaluation questions using Gemini Flash with strict quota limits and schema validation.",
    endpoints: [
      { method: "POST", path: "/api/admin/items/generate", description: "Generates new 5Q test items via Gemini" },
      { method: "GET", path: "/api/admin/items", description: "Lists psychometric items with difficulty calibration" }
    ],
    signatures: [
      "def generate_psychometric_items(dimension: str, count: int) -> List[Dict]",
      "def validate_item_schema(item_data: Dict) -> bool"
    ],
    schemaSnippet: `CREATE TABLE public.psychometric_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dimension VARCHAR(20) NOT NULL CHECK (dimension IN ('IQ', 'AQ', 'EQ', 'SQ', 'SpQ')),
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('likert', 'sjt', 'cognitive')),
    stem TEXT NOT NULL,
    options JSONB,
    scoring_logic TEXT NOT NULL,
    skill_tag VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE
);`,
    samplePayload: `{
  "dimension": "AQ",
  "item_type": "sjt",
  "stem": "Your production deployment encounters a critical deadlock 10 minutes prior to client presentation. What is your immediate action?",
  "options": {
    "A": "Roll back to last stable release and notify stakeholders.",
    "B": "Attempt live container debugging.",
    "C": "Postpone meeting citing internet failure."
  },
  "scoring_logic": "A: 5, B: 3, C: 1",
  "skill_tag": "incident_triage"
}`,
    flowSteps: [
      "Admin requests new assessment items for specific 5Q quotient.",
      "Item generator reserves quota via claim_ai_call('gemini_item_gen').",
      "Gemini Flash generates stem, multiple-choice options, and scoring logic.",
      "Response validated against strict Pydantic JSON schema.",
      "If API offline or capped, static fallback items from fallback_bank.json injected."
    ]
  },
  {
    id: "P8",
    name: "Student Retro Dossier, MS-DOS Terminal & PDF Generator",
    shortname: "Retro Portfolio & Dossier",
    category: "market",
    persona: "Student",
    lifecyclePhase: "Phase 5 (Market Deployment & Win)",
    router: "api/routers/portfolio_router.py, api/pdf_generator.py",
    database: "public.students, Supabase Storage",
    aiQuotaSource: "None (Deterministic ReportLab)",
    dailyCap: "Unlimited",
    fallback: "Plain text résumé stream and JSON profile export",
    overview: "Delivers an interactive, high-converting retro Windows 95 desktop portfolio at /portfolio/[id] equipped with cognitive radar charts, live credentials, interactive MS-DOS terminal emulator, and cryptographically signed PDF dossier generation.",
    endpoints: [
      { method: "GET", path: "/api/portfolio/{student_id}", description: "Delivers retro portfolio metadata and cogmatrix" },
      { method: "GET", path: "/api/student/{student_id}/export", description: "Generates signed verification PDF dossier" }
    ],
    signatures: [
      "def generate_candidate_dossier_pdf(student_data: Dict) -> bytes",
      "def build_portfolio_view(student_id: str) -> Dict[str, Any]"
    ],
    schemaSnippet: `# Next.js Route: src/app/portfolio/[id]/page.tsx
# Interactive Windows 95 Desktop with MS-DOS Terminal
# Capabilities:
# - My Computer (Archetype details)
# - Competencies (Verified skill badges)
# - CogMatrix (Radar quotient comparison)
# - DOS Terminal (Interactive query engine: 'scores', 'radar', 'dossier')`,
    samplePayload: `> scores
IQ: 84 | AQ: 78 | EQ: 62 | SQ: 55 | SpQ: 70
Archetype: THE_BUILDER (Engineering & Systems Architecture)

> dossier
Downloading cryptographic verification dossier... [OK]`,
    flowSteps: [
      "Student or recruiter navigates to /portfolio/[id].",
      "Frontend initializes Windows 95 desktop environment with draggable windows.",
      "MS-DOS terminal emulator accepts queries ('scores', 'radar', 'skills').",
      "User clicks Export Dossier; FastAPI executes ReportLab PDF builder.",
      "High-fidelity PDF dossier generated and delivered via streaming response."
    ]
  },
  {
    id: "P9",
    name: "Multi-Tenant Role Ingress, Auth Guard & Demo Mode Isolation",
    shortname: "Multi-Tenant Ingress Guard",
    category: "ingress",
    persona: "All Personas",
    lifecyclePhase: "System Entry & Security Boundary",
    router: "api/deps.py, src/app/auth",
    database: "auth.users, public.students, public.employers, public.institutions, public.admins",
    aiQuotaSource: "None (Supabase JWT / RLS)",
    dailyCap: "Unlimited",
    fallback: "Redirect to /login with structured authentication notification",
    overview: "Enforces enterprise access controls via Supabase JWT validation, role-based dependencies (require_role), and tenant Row-Level Security (RLS) while isolating demo auth via strictly enforced environment flags.",
    endpoints: [
      { method: "POST", path: "/auth/v1/token", description: "Supabase authentication exchange" },
      { method: "GET", path: "/api/health", description: "Verifies database connectivity and API uptime" }
    ],
    signatures: [
      "def get_current_user(request: Request, authorization: Optional[str]) -> UserPayload",
      "def require_role(roles: List[str]) -> Callable",
      "def require_admin_supabase() -> Client"
    ],
    schemaSnippet: `CREATE POLICY tenant_isolation_policy ON public.assessment_submissions
    FOR ALL
    USING (auth.uid() = student_id OR EXISTS (
        SELECT 1 FROM public.admins WHERE auth_id = auth.uid()
    ));`,
    samplePayload: `{
  "sub": "usr_99812401-419b-4b2a-a924-f7b5e4088921",
  "email": "student@c2c.demo",
  "app_metadata": { "role": "student" },
  "exp": 1731000000
}`,
    flowSteps: [
      "Client presents Bearer token in HTTP Authorization header.",
      "If ALLOW_DEMO_AUTH is true and token begins with 'demo-', mock user injected.",
      "In production, ALLOW_DEMO_AUTH is strictly false; RS256 JWT signature verified.",
      "User role checked against route role dependencies (require_role).",
      "Database queries execute with Postgres Row-Level Security policies active."
    ]
  }
];

export default function WikiPortal() {
  const [activeTab, setActiveTab] = useState<"portal" | "process" | "hld" | "sops" | "blockers">("portal");
  const [selectedProcessId, setSelectedProcessId] = useState<string>("P1");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [processDetailTab, setProcessDetailTab] = useState<"overview" | "contracts" | "governance">("overview");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedProcess = useMemo(() => {
    return PROCESSES.find((p) => p.id === selectedProcessId) || PROCESSES[0];
  }, [selectedProcessId]);

  const filteredProcesses = useMemo(() => {
    if (!searchQuery.trim()) return PROCESSES;
    const q = searchQuery.toLowerCase();
    return PROCESSES.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.shortname.toLowerCase().includes(q) ||
        p.router.toLowerCase().includes(q) ||
        p.persona.toLowerCase().includes(q) ||
        p.database.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Banner & Health Badges */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight text-white">C2C Enterprise Wiki</h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                Confluence Space Key: C2C
              </span>
            </div>
            <p className="text-xs text-slate-400">Single Source of Truth for Architecture, LLD Specifications & Governance</p>
          </div>
        </div>

        {/* Live Platform Health Indicators */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Production: c2c.mytestbed.tech
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/80 border border-blue-800/60 text-blue-300">
            <Database className="w-3 h-3" />
            Supabase Talia: RLS Active
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-950/80 border border-purple-800/60 text-purple-300">
            <Server className="w-3 h-3" />
            Moodle LMS: Port 8080
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-800/60 text-amber-300">
            <ShieldCheck className="w-3 h-3" />
            AI Budget: Capped
          </span>
        </div>
      </header>

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <aside className="w-72 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter processes or schemas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Navigation Category Links */}
          <div className="p-3 space-y-1 text-xs font-medium">
            <button
              onClick={() => setActiveTab("portal")}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                activeTab === "portal" ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40" : "text-slate-300 hover:bg-slate-800/60"
              }`}
            >
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-400" />
                00. Master Home Portal
              </span>
              <ChevronRight className="w-3 h-3 opacity-60" />
            </button>

            <button
              onClick={() => setActiveTab("hld")}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                activeTab === "hld" ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40" : "text-slate-300 hover:bg-slate-800/60"
              }`}
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                02. System Topology (HLD)
              </span>
              <ChevronRight className="w-3 h-3 opacity-60" />
            </button>

            <button
              onClick={() => setActiveTab("sops")}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                activeTab === "sops" ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40" : "text-slate-300 hover:bg-slate-800/60"
              }`}
            >
              <span className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                04. Master SOPs & Lifecycle
              </span>
              <ChevronRight className="w-3 h-3 opacity-60" />
            </button>

            <button
              onClick={() => setActiveTab("blockers")}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                activeTab === "blockers" ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40" : "text-slate-300 hover:bg-slate-800/60"
              }`}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                06. Go-Live Blocker Status
              </span>
              <ChevronRight className="w-3 h-3 opacity-60" />
            </button>
          </div>

          {/* Process Tree List (03. LLD Specifications) */}
          <div className="px-4 py-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>03. LLD Specifications</span>
              <span className="text-[10px] text-slate-500">P1 - P9</span>
            </div>
            <div className="space-y-1">
              {filteredProcesses.map((proc) => (
                <button
                  key={proc.id}
                  onClick={() => {
                    setSelectedProcessId(proc.id);
                    setActiveTab("process");
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between ${
                    activeTab === "process" && selectedProcessId === proc.id
                      ? "bg-indigo-600 text-white font-medium shadow-sm"
                      : "text-slate-300 hover:bg-slate-800/60"
                  }`}
                >
                  <span className="truncate">
                    <span className="font-mono font-bold mr-1.5 opacity-80">{proc.id}:</span>
                    {proc.shortname}
                  </span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                      proc.aiQuotaSource.includes("None") || proc.aiQuotaSource.includes("Zero")
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {proc.id}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content Pane */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* TAB 1: MASTER HOME PORTAL */}
          {activeTab === "portal" && (
            <div className="max-w-6xl mx-auto space-y-8">
              {/* Hero Banner */}
              <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-950 p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    Campus-to-Corporate (C2C) Hub
                  </span>
                  <span className="text-xs text-slate-400">v2.1 Production Verified</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
                  Unified AI-First Talent Evaluation, Remediation & Placement Suite
                </h2>
                <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
                  Bridging technical competence, 5Q developmental readiness, and automated career placement with deterministic AI cost controls. All components operate under a single unified domain without orphaned subdomains.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => setActiveTab("hld")}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
                  >
                    <Layers className="w-4 h-4" />
                    Explore System Topology (HLD)
                  </button>
                  <button
                    onClick={() => {
                      setSelectedProcessId("P1");
                      setActiveTab("process");
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700"
                  >
                    <Code className="w-4 h-4 text-emerald-400" />
                    Browse 9 Technical LLD Specs
                  </button>
                  <Link
                    href="/crm/costs"
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700"
                  >
                    <DollarSign className="w-4 h-4 text-amber-400" />
                    Live AI Budget & Costs Console
                  </Link>
                </div>
              </div>

              {/* Persona Navigation Cards */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                  Persona Command Hubs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Student Card */}
                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-indigo-500/40 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3">
                      <Users className="w-4 h-4" />
                    </div>
                    <h4 className="font-semibold text-sm text-white mb-1">🎓 Student Experience</h4>
                    <p className="text-xs text-slate-400 mb-4">
                      Terminal onboarding, 5Q psychometric assessment, radar CogMatrix, retro Win95 portfolio, and Moodle auto-remediation.
                    </p>
                    <Link
                      href="/assessment"
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      Launch /assessment <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  {/* Employer Card */}
                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-indigo-500/40 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                      <Compass className="w-4 h-4" />
                    </div>
                    <h4 className="font-semibold text-sm text-white mb-1">🏢 Employer Console</h4>
                    <p className="text-xs text-slate-400 mb-4">
                      Role requisitions, Tier-1 deterministic 5Q pre-filtering, TypeSafe Jev deep evaluations, and candidate hiring decisions.
                    </p>
                    <Link
                      href="/employer/jobs"
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      View /employer/jobs <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  {/* TPO Card */}
                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-indigo-500/40 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3">
                      <Activity className="w-4 h-4" />
                    </div>
                    <h4 className="font-semibold text-sm text-white mb-1">🏫 TPO Command Center</h4>
                    <p className="text-xs text-slate-400 mb-4">
                      Cohort-level analytics, national 5Q benchmarks, student intervention triggers, and automated institutional passback.
                    </p>
                    <Link
                      href="/tpo-dashboard"
                      className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      Open /tpo-dashboard <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* 5-Phase Lifecycle & Process Grid */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                  Core Process Specifications (LLD Index)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {PROCESSES.map((proc) => (
                    <button
                      key={proc.id}
                      onClick={() => {
                        setSelectedProcessId(proc.id);
                        setActiveTab("process");
                      }}
                      className="text-left p-4 rounded-xl border border-slate-800 bg-slate-900/30 hover:bg-slate-800/40 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {proc.id}
                        </span>
                        <span className="text-[10px] text-slate-400">{proc.persona}</span>
                      </div>
                      <h4 className="font-semibold text-xs text-white mb-1 truncate">{proc.shortname}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">{proc.overview}</p>
                      <div className="text-[10px] font-mono text-slate-400 truncate">{proc.router}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DETAILED PROCESS LLD SPECIFICATION */}
          {activeTab === "process" && (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Header Card */}
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-lg text-sm font-mono font-bold bg-indigo-600 text-white shadow-sm">
                      {selectedProcess.id}
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-white">{selectedProcess.name}</h2>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span>Primary Persona: <strong className="text-slate-200">{selectedProcess.persona}</strong></span>
                        <span>•</span>
                        <span>Lifecycle: <strong className="text-slate-200">{selectedProcess.lifecyclePhase}</strong></span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                      {selectedProcess.aiQuotaSource}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{selectedProcess.overview}</p>

                {/* Sub-Tabs for Deep Inspection */}
                <div className="mt-6 flex border-b border-slate-800 gap-6 text-xs font-semibold">
                  <button
                    onClick={() => setProcessDetailTab("overview")}
                    className={`pb-2.5 border-b-2 transition-colors ${
                      processDetailTab === "overview" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    1. Flow & Execution Steps
                  </button>
                  <button
                    onClick={() => setProcessDetailTab("contracts")}
                    className={`pb-2.5 border-b-2 transition-colors ${
                      processDetailTab === "contracts" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    2. API Contracts & Signatures
                  </button>
                  <button
                    onClick={() => setProcessDetailTab("governance")}
                    className={`pb-2.5 border-b-2 transition-colors ${
                      processDetailTab === "governance" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    3. AI Cost & Daily Caps
                  </button>
                </div>
              </div>

              {/* Sub-Tab 1: Flow & Steps */}
              {processDetailTab === "overview" && (
                <div className="space-y-4">
                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Step-by-Step Execution Sequence
                    </h3>
                    <ol className="space-y-2 text-xs text-slate-300">
                      {selectedProcess.flowSteps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-indigo-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Resilient Fallback Policy
                    </h3>
                    <p className="text-xs text-slate-300">{selectedProcess.fallback}</p>
                  </div>
                </div>
              )}

              {/* Sub-Tab 2: API Contracts & Schemas */}
              {processDetailTab === "contracts" && (
                <div className="space-y-4">
                  {/* Endpoints Table */}
                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Registered FastAPI Endpoints
                    </h3>
                    <div className="space-y-2">
                      {selectedProcess.endpoints.map((ep, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 font-mono">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ep.method === "POST" ? "bg-blue-500/20 text-blue-300" : ep.method === "GET" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                            }`}>
                              {ep.method}
                            </span>
                            <span className="text-slate-200">{ep.path}</span>
                          </div>
                          <span className="text-slate-400 text-[11px]">{ep.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Schema DDL */}
                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        PostgreSQL Schema & Tables
                      </h3>
                      <button
                        onClick={() => copyToClipboard(selectedProcess.schemaSnippet, "schema")}
                        className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-mono"
                      >
                        {copiedKey === "schema" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        {copiedKey === "schema" ? "Copied!" : "Copy DDL"}
                      </button>
                    </div>
                    <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto">
                      {selectedProcess.schemaSnippet}
                    </pre>
                  </div>

                  {/* Sample JSON Payload */}
                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Sample Protocol Payload
                    </h3>
                    <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-sky-300 overflow-x-auto">
                      {selectedProcess.samplePayload}
                    </pre>
                  </div>
                </div>
              )}

              {/* Sub-Tab 3: Governance & AI Cost */}
              {processDetailTab === "governance" && (
                <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block mb-1">AI Quota Source:</span>
                      <strong className="text-indigo-400 font-mono text-sm">{selectedProcess.aiQuotaSource}</strong>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block mb-1">Enforced Daily Cap:</span>
                      <strong className="text-emerald-400 font-mono text-sm">{selectedProcess.dailyCap}</strong>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
                    <strong className="text-white block mb-1">Pre-Flight Reservation Gate:</strong>
                    Every invocation executes <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">claim_ai_call(&apos;{selectedProcess.id.toLowerCase()}&apos;)</code> in PostgreSQL. If budget is saturated, the process gracefully degrades to labeled heuristics with zero token cost.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SYSTEM TOPOLOGY (HLD) */}
          {activeTab === "hld" && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
                <h2 className="text-lg font-bold text-white mb-2">High-Level Design: Unified System Topology</h2>
                <p className="text-xs text-slate-300 leading-relaxed mb-6">
                  C2C runs on a single ingress point (<code className="text-indigo-300">c2c.mytestbed.tech</code>) with Next.js edge rewrites forwarding <code className="text-emerald-300">/lms/*</code> to container port 8080 and <code className="text-sky-300">/api/*</code> to FastAPI port 8000.
                </p>

                {/* ASCII Topology Diagram */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 leading-relaxed overflow-x-auto">
                  <pre>{`+------------------------------------------------------------------------+
|             INGRESS: https://c2c.mytestbed.tech (Port 3030)            |
+-----------------------------------+------------------------------------+
                                    |
       +----------------------------+----------------------------+
       |                                                         |
       v                                                         v
+------------------+       +------------------+       +------------------+
| /lms/* Rewrites  |       | /api/* Rewrites  |       | Main Next.js App |
| (Port 8080)      |       | (Port 8000)      |       | (Port 3030)      |
| Alpine Moodle    |       | FastAPI Backend  |       | /dashboard /learn|
+--------+---------+       +--------+---------+       +------------------+
         |                          |
         v                          v
+------------------+       +---------------------------------------------+
| moodle_c2c DB    |       | Supabase Talia Cluster (Port 6543)          |
| (Postgres 17)    |       | public.students . public.job_candidate_matches
+------------------+       | public.ai_settings . public.ai_call_ledger  |
                           +---------------------------------------------+`}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MASTER SOPS */}
          {activeTab === "sops" && (
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 mb-4">
                <h2 className="text-lg font-bold text-white mb-1">Master Standard Operating Procedures (SOPs)</h2>
                <p className="text-xs text-slate-400">End-to-end procedural workflows governing candidate progression across all gates.</p>
              </div>

              {[
                { title: "SOP-01: Candidate Sourcing & Assessment Ingress", desc: "From student registration to psychometric submission and baseline radar computation." },
                { title: "SOP-02: Psychometric Audit to LMS Auto-Remediation", desc: "Automated gap extraction (<60%) triggering deterministic Moodle REST enrolment." },
                { title: "SOP-03: LTI 1.3 Course Completion to Record Passback", desc: "AGS 2.0 grade synchronization into student development records upon quiz completion." },
                { title: "SOP-04: Employer Job Posting, Tier-1 Filtering & Match Evaluation", desc: "Deterministic 5Q role weighting followed by guarded TypeSafe deep requirement matching." },
                { title: "SOP-05: AI Quota Exhaustion & Heuristic Fallback Handlers", desc: "System failover behavior when daily caps are reached or API keys are unavailable." }
              ].map((sop, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-white mb-0.5">{sop.title}</h4>
                    <p className="text-slate-400 text-[11px]">{sop.desc}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    ACTIVE SOP
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: GO-LIVE BLOCKERS */}
          {activeTab === "blockers" && (
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
                <h2 className="text-lg font-bold text-white mb-1">Production Release Readiness Tracker</h2>
                <p className="text-xs text-slate-400 mb-4">Current blocker status referenced against GO_LIVE.md verification audit.</p>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/60 flex items-center justify-between">
                    <span className="text-emerald-300 font-medium">B1: Staging & Dev Environment Isolation Audit</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">RESOLVED</span>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/60 flex items-center justify-between">
                    <span className="text-amber-300 font-medium">B2: Production SUPABASE_SERVICE_ROLE_KEY Configuration (Human Task)</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">PENDING OWNER</span>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/60 flex items-center justify-between">
                    <span className="text-amber-300 font-medium">B3: Production TYPESAFE_API_KEY Configuration (Human Task)</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">PENDING OWNER</span>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/60 flex items-center justify-between">
                    <span className="text-emerald-300 font-medium">B5 & B6: Database Webhook Vault Migration applied to Talia Cluster</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">RESOLVED</span>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/60 flex items-center justify-between">
                    <span className="text-emerald-300 font-medium">B7: Elimination of Fake CERTIFIED Stub in assessment_router.py</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">RESOLVED</span>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/60 flex items-center justify-between">
                    <span className="text-emerald-300 font-medium">B8: Real Talia Supabase Demo Accounts Provisioned</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">RESOLVED</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
