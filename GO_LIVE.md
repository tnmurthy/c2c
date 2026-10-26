# Go-live checklist

Evaluated **2026-10-23** against the live site (`c2c.mytestbed.tech`), the
production Supabase project (Talia, `onsmkbwqucvbzggugmmn`) and a full
Playwright run. Update the status column as items land; keep the evidence.

**Verdict: not ready.** Two missing production settings and one open security
hole break or expose most of the app, and every main E2E journey fails.

Legend: ✅ done · ⚠️ works with caveats · ❌ broken or missing

## 1. Blockers — before any external user

| # | Item | Status | Evidence / how to verify |
|---|---|---|---|
| B1 | Close the demo-token admin hole — merge PR #33 (`fix/demo-auth-gate`) | ✅ | Merged 2026-10-23. Live `/api/costs/summary` with `Bearer demo-x` → 401 "Demo sessions are disabled"; login page shows no demo panel. |
| B2 | Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel (production) | ❌ | `/api/crm/candidates`, `/api/employer/candidates`, `/api/leads`, `/api/costs/summary` return 503 "SUPABASE_SERVICE_ROLE_KEY ... not configured". |
| B3 | Set `TYPESAFE_API_KEY` in Vercel | ❌ | `/api/typesafe/status` → `api_key_configured: false`; all AI judgments fall back to labelled heuristics. |
| B4 | Fix the 17 failing Playwright tests (every happy path) | ✅ fixed in PR `fix/e2e-journeys` | 27/27 pass locally. Causes: tests hardcoded the Supabase cookie name (app derives it from `NEXT_PUBLIC_SUPABASE_URL` since PR #30); middleware did not decode `@supabase/ssr` `base64-` cookies; portfolio tests targeted UI that never shipped; apply button lost its id. Was: | 17/27 fail on `master` with and without PR #33 (identical set). Typical failure: timeout waiting for `input[name="full_name"]` on onboarding. Likely one shared cause, possibly the login/session changes in PR #30. |
| B5 | Fix or remove the 4 DB webhook triggers | ⚠️ code ready (PR `fix/webhook-auth`) | Triggers now read `c2c_webhook_base_url` and `c2c_webhook_secret` from Supabase Vault and post nothing until both are set. All 5 `/api/webhook/*` endpoints (4 were open to anyone, incl. paid agent runs and the scraper) require `x-webhook-secret`. To do: apply migration `20261026000000_webhook_triggers_vault.sql` to Talia; set `SUPABASE_WEBHOOK_SECRET` in Vercel and both Vault secrets when webhooks should run (meter Gemini first). |
| B6 | Revoke `anon`/`authenticated` EXECUTE on SECURITY DEFINER functions | ⚠️ in the same migration (not yet applied) | Revokes the 4 `webhook_*` trigger functions, `handle_user_signup_role`, `check_whitelist_email` (backend calls it with the service role). `get_auth_tenant_id` stays: 20 RLS policies call it and it returns only the caller's own tenant. |
| B7 | Remove the silent fake `CERTIFIED` result (CLAUDE.md P1-B) | ❌ | `api/routers/assessment_router.py:31` still returns `{"final_status": "CERTIFIED"}` when the orchestrator import fails. `/api/health/agents` does not exist (404 live). |
| B8 | Real demo accounts for sales demos | ❌ | Needed once B1 lands: demo logins are off in production by decision (see `ALLOW_DEMO_AUTH` below). |

## 2. Per workflow / feature

| Workflow / feature | Status | Notes |
|---|---|---|
| Student: onboard → assessment → dashboard → portfolio | ❌ | `student.spec.ts` happy path + 2/4 validation tests fail; unauthenticated redirects pass. |
| Student: AI DevelopmentReport on dashboard (P2-A/B) | ❌ not built | No `development_reports` table in production, no `/api/students/{id}/development-report`, no `agents_router`. Dashboard subscribes to a table that does not exist. |
| Student: assessment evaluation (TypeSafe) | ⚠️ | Contract fixed and tested; live judgments need B3. |
| TPO: onboard → dashboard → verify cohort | ❌ | Both `tpo.spec.ts` flows and the Tier 3/Tier 4 TPO workflows fail. |
| Employer: onboard → post job → talent discovery | ❌ | `employer.spec.ts` happy path + both validation tests fail; live API 503 (B2). |
| Employer: job matching (P3-B) | ⚠️ | Merged (PR #32) with unit tests; needs B2 + B3. Scoring runs as a FastAPI background task on Vercel serverless — verify it completes there. No employer UI for `/api/employer/jobs/{id}/candidates` yet. Tier 4 employer flow fails. |
| Employer: dossier PDF export | ❌ | Tier 4 Scenario 2 fails. |
| Portfolio: public retro page, social badges (P4-B) | ❌ | All 4 `portfolio_social_typesafe.spec.ts` tests fail. `api/routers/portfolio_router.py` is a 421-byte stub. Migration `20261015000000_add_social_media_handles` never applied to production (`github_url`, `x_url`, `meta_url` missing). |
| CV Tailor | ✅ | `cv_tailor_journey.spec.ts` passes. |
| CRM: talent pool, leads, accounts, opportunities | ⚠️ | Built on its own schema (`leads`, `accounts`, `opportunities`), not the CLAUDE.md `crm_leads` design. Live API 503 until B2. Talent-pool NameError fixed; mobile layout fixed. |
| Costs page + AI call caps | ✅ | DB-enforced caps, ledger and `/crm/costs` live; E2E passes. Enter price and budget. Gemini (agent-recruiters) is not metered. |
| Admin root dashboard | ❌ | Happy path fails; RBAC redirects pass. |
| Auth / login | ⚠️ | Works. Supabase leaked-password protection is off. CRM layout treats any `@taliatech.in` email as admin. |
| API health | ✅ | `/api/health` → `{"status":"ok","db":"connected"}`. |

## 3. Should do before launch

- [ ] P1-A: remove `sys.path.append` hacks (`api/main.py:10-12`).
- [ ] P1-C: remove the duplicate StreamHandler (`api/main.py:28`).
- [ ] Set `search_path` on 14 functions flagged by the advisor (includes `ai_day_start`).
- [ ] Enable leaked-password protection in Supabase Auth.
- [ ] Delete test data in production (2 "E2E Test Job" postings, test students).
- [ ] Fix the live URL in CLAUDE.md: `makeover.mytestbed.tech` does not resolve; production is `c2c.mytestbed.tech`.
- [ ] Run Playwright in CI — CI runs only unit tests and the build, so it stays green while journeys fail.
- [ ] Costs page: enter price per call and monthly budget.
- [ ] Vendor spend caps: Vercel Spend Management, Supabase spend cap.
- [ ] Meter Gemini calls in `ai_call_ledger` with their own cap.

## 4. After launch (CLAUDE.md order)

- [ ] P4-A: extract the scoring engine (in progress on `claude/codebase-refactor-5bce8b`).
- [ ] P5: RLS policy audit — every table has RLS on; 12 c2c tables have no policies (fine for backend-only tables, needs review).

## Production configuration reference

| Variable | Vercel production | Purpose |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | **required** (missing) | Backend admin client |
| `TYPESAFE_API_KEY` | **required** (missing) | TypeSafe System One (Jev) |
| `SUPABASE_WEBHOOK_SECRET` | required if DB webhooks are used | Shared secret for `/webhook/*` |
| `ALLOW_DEMO_AUTH` / `NEXT_PUBLIC_ALLOW_DEMO_AUTH` | **must not be set** | Demo sessions; local dev and Playwright only |
| `GEMINI_API_KEY` | set | agent-recruiters |

Suggested order: B1 → B2 → B3 (config and merge) → B4 (shared E2E root cause) → B5–B7 → P2.
