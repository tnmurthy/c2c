# AGENTS.md — notes for AI coding agents

Read this, then `CLAUDE.md` (the phase plan) and `GO_LIVE.md` (current
readiness, blockers and evidence). Update `GO_LIVE.md` when you fix an item.

## Current state (2026-10-26)

- **Not ready to go live.** See `GO_LIVE.md` §1 for blockers B1–B8.
- Production: Vercel project `c2c` → `c2c.mytestbed.tech` (frontend and the
  FastAPI backend as `api/main.py`). Database: Supabase project **Talia**
  (`onsmkbwqucvbzggugmmn`), shared with other apps (`telangana`, `vizag`,
  `tool_hub` schemas). Touch only c2c objects in `public`.
- `.env.local` points at a local Supabase that is another project's stack;
  local supabase-py also has a version mismatch (`verify` kwarg). Use unit tests
  with fakes, or a throwaway database, rather than the local stack.

## Next tasks — pick the top open one

Work top to bottom. One PR per task; update `GO_LIVE.md` and tick the box here
in the same PR. Items marked **human** need the owner (secrets, dashboards,
production database); do not try to work around them.

- [x] **T1 — GO_LIVE B7: no fake `CERTIFIED` result (CLAUDE.md P1-B).** Done in PR `fix/b7-no-fake-certified`.
  `api/routers/assessment_router.py` (around line 19–31) substitutes a stub class
  when `C2C_Orchestrator_V2` fails to import; the stub always returns
  `{"final_status": "CERTIFIED"}`, so students get fake results with no error.
  Do: set `C2C_Orchestrator_V2 = None` and `logger.critical(...)` on ImportError;
  in `run_agent_recruiters()` log an error and return when it is `None` (write
  nothing); add `GET /api/health/agents` returning `{"orchestrator": "ok"}` or
  `{"orchestrator": "unavailable", "error": "import failed"}` (404 live today).
  Tests: import failure → health says unavailable and no `CERTIFIED` row/result
  is produced; import success → ok. Acceptance as in CLAUDE.md P1-B.
- [x] **T2 — human: apply migration `20261026000000_webhook_triggers_vault.sql` to Talia**
  (GO_LIVE B5/B6). Done 2026-10-26; security advisor confirmed.
- [ ] **T3 — human: Vercel production env** — `SUPABASE_SERVICE_ROLE_KEY` (B2;
  CRM/employer/matching/Costs return 503 without it) and `TYPESAFE_API_KEY` (B3).
  Verify: `GET /api/typesafe/status` → `api_key_configured: true`.
- [ ] **T4 — human: real Supabase demo accounts** for sales demos (B8); demo
  sessions are off in production by decision.
- [x] **T5 — Meter Gemini calls.** Done in PR `feat/meter-gemini`. Finding: the
  agent-recruiters orchestrator makes **no** model calls (it is a random-number
  simulation and, called with `audit_gaps=[]`, always returns CERTIFIED — see T9),
  and the item generator never reached Gemini (hyphenated import path). Metered
  now: `gemini_scout` (market-scout Action) and `gemini_item_gen` (admin item
  generator), each claimed per HTTP attempt in `services/market-scout/ai/budget.py`
  with its own cap on `/crm/costs`. **Human:** apply migration
  `20261026010000_meter_gemini.sql`; add `SUPABASE_SERVICE_ROLE_KEY` as a GitHub
  Actions secret (until then the scout stores jobs unscored); set a quota on the
  Gemini key in Google AI Studio.
- [ ] **T6 — Employer screen for ranked candidates** using
  `GET /api/employer/jobs/{job_id}/candidates` (fit, 5Q, per-requirement evidence,
  status). API and tests exist; no UI yet.
- [ ] **T7 — CLAUDE.md P1-A and P1-C:** remove `sys.path.append` hacks
  (`api/main.py`) and the duplicate StreamHandler.
- [ ] **T8 — Run Playwright in CI** so green CI means the journeys work
  (27/27 pass locally as of 2026-10-23).
- [ ] **T9 — CLAUDE.md Phase 2 (agents are simulated today: `scripts/c2c_orchestrator_v2.py` uses `random`):** `development_reports` table, agents webhook →
  report, dashboard card (table does not exist in production yet).

## Rules that are easy to break

- **AI calls are metered.** Every paid TypeSafe call goes through
  `api/services/ai_budget.claim_ai_call` (DB function `claim_ai_call`), which
  refuses over-cap work before it is paid for. New AI features must claim
  against a source in `ai_call_ledger` and get a cap in `ai_settings`, shown on
  `/crm/costs`. Never put prices in the repo.
- **No fake results.** When the model is unavailable, return a labelled
  heuristic (`is_live_api=False`, provider "Heuristic estimate") or nothing —
  never a value presented as an AI judgment. Do not invent default scores.
- **TypeSafe contract:** `POST https://api.typesafe.ai/v1/systemone`,
  `model: "jev-latest"`, each question has `type`, `instructions`, `criteria`.
  Read the live docs (`docs.typesafe.ai/llms.txt`) before changing a call.
- **Demo auth is off in production.** `ALLOW_DEMO_AUTH` (backend) and
  `NEXT_PUBLIC_ALLOW_DEMO_AUTH` (frontend) enable demo/mock sessions for local
  dev and Playwright only. Never set them in Vercel.
- **Matches are not leads.** Job candidate matches live in
  `job_candidate_matches`; `leads` is the CRM sales-lead table.
- **Migrations:** add a file in `supabase/migrations/`, test it in a scratch
  database, keep it re-runnable and backward compatible with the deployed
  backend, then apply to Talia.

## Verification

- Backend: `python -m pytest tests -q --ignore=tests/e2e --ignore=tests/e2e_flow_test.py` (CI runs this).
- Frontend: `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- E2E: `npm run test:e2e` — 27/27 pass on `master` (2026-10-23); compare
  against a `master` baseline before blaming your change.
- CI does not run Playwright; a green CI does not mean the journeys work.
