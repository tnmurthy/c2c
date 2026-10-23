# AGENTS.md — notes for AI coding agents

Read this, then `CLAUDE.md` (the phase plan) and `GO_LIVE.md` (current
readiness, blockers and evidence). Update `GO_LIVE.md` when you fix an item.

## Current state (2026-10-23)

- **Not ready to go live.** See `GO_LIVE.md` §1 for blockers B1–B8.
- Production: Vercel project `c2c` → `c2c.mytestbed.tech` (frontend and the
  FastAPI backend as `api/main.py`). Database: Supabase project **Talia**
  (`onsmkbwqucvbzggugmmn`), shared with other apps (`telangana`, `vizag`,
  `tool_hub` schemas). Touch only c2c objects in `public`.
- `.env.local` points at a local Supabase that is another project's stack;
  local supabase-py also has a version mismatch (`verify` kwarg). Use unit tests
  with fakes, or a throwaway database, rather than the local stack.

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
- E2E: `npm run test:e2e` — 17/27 currently fail on `master` (GO_LIVE.md B4);
  compare against a `master` baseline before blaming your change.
- CI does not run Playwright; a green CI does not mean the journeys work.
