# ADR-003 — Tenancy model: university → campus → department → cohort, with memberships

- Status: accepted (2026-11-15). M1–M4 complete and in production (2026-11-16). Runbook: `docs/runbooks/college-onboarding.md`.
- Related: ADR-001 (schemas), ADR-002 (prospects, TPO verification), GO_LIVE B9.

## Context

c2c had two unlinked notions of tenancy (`tenants` from the CRM schema, `institutions`), a
"first tenant" fallback that attached students to whatever tenant came first (in production:
an E2E test tenant), one TPO login per institution (`institutions.auth_id`), access by email
domain (B9), and free-text `students.department`. The downstream partner (eklav) needs a
stable tenant/department scope and a per-tenant opt-in.

A **tenant is the contracting customer: a university or college group** (owner decision,
2026-11-15). Each campus is an institution under it.

## Decision

```
tenant (kind: university | college_group | autonomous_college | operator | test)
 └ institution (status: prospect | active | suspended; affiliating_university)
     ├ institution_domains (verified_at / verified_by)
     └ department ─ discipline (shared taxonomy, 24 codes) ─ department_aliases
         └ cohort (program + graduation_year) └ student (department_id, cohort_id)
memberships (user × tenant × [institution] × [department] × role, status, source, verified_*)
   roles: tenant_admin · tpo · dept_coordinator · faculty_mentor · student
tenant_employer_access (tenant × employer: pending | approved | blocked)
tenant_partner_links  (tenant × partner e.g. eklav: enabled, agreement_ref)
```

- **Reuse `tenants`** (add `kind`) rather than a new table: every existing FK keeps working.
- **Scope rules enforced in the database**: a CHECK ties role to scope (tpo → institution,
  coordinator/mentor → department, tenant_admin → tenant only); a trigger rejects an
  institution outside the tenant or a department outside the institution; a partial unique
  index allows one live membership per scope and role, and re-grant after revoke.
- **Discipline mapping** `map_discipline(text)` turns free-text department names into codes;
  anything it cannot map lands in `department_mapping_review` for a human.
- **Deny-by-default RLS** on all new tables (only `disciplines` is public-readable; a user can
  read their own memberships). Backend reads are scoped in the domain layer (M3); full RLS on
  memberships is Phase 5.

## Backfill (M2) — rules

| Data | Rule |
|---|---|
| Test tenants | slug/name containing test/e2e/debug → `kind = 'test'` |
| Institution → tenant | the one non-test tenant its students already share; else a new `autonomous_college` tenant (admins can later group campuses under a university tenant) |
| Student tenant | always = its institution's tenant (removes the first-tenant fallback damage) |
| Prospect | no owner and no real (non-synthetic) students |
| Departments | one per (institution, discipline); canonical discipline name; every raw spelling kept as an alias |
| Cohorts | discipline's default program (B.Tech, MBA, …) + graduation year |
| Memberships | `institutions.auth_id` → `tpo`; students with logins → `student`; `source = legacy_backfill`, `verified_at = NULL` until an admin verifies (ADR-002 SOP) |

## Verification on `c2c_stg` (2026-11-15)

Fixtures included a college with messy department names ("CSE", "Computer Science & Engg.",
"  cse  ", "AI&DS", "Mtech", "B.Com (Hons)", "Bachelor of Business Administration") whose students
sat on a test tenant, and a prospect college.

| Check | Result |
|---|---|
| Test tenant detected; 0 students left on it; 0 student/institution tenant mismatches | ✅ |
| 3 CSE spellings → 1 department; AI&DS → CSE-AIDS; BBA ≠ MBA; B.Com → BCOM | ✅ |
| "Mtech" → review queue | ✅ |
| Every student linked to department and cohort | ✅ |
| Owned college active; synthetic-only colleges prospect | ✅ |
| Legacy TPO → unverified `tpo` membership | ✅ |
| Membership rules: 8/8 (bad scope, cross-tenant, cross-institution, duplicate rejected; valid, re-grant after revoke accepted) | ✅ |
| M2 re-run is idempotent | ✅ |
| REST (anon): `disciplines` readable; `memberships`, `departments`, `tenant_partner_links` empty | ✅ |
| `map_discipline` on production's real values: 453/454 students mapped; "Mtech" → review | ✅ |

## Next

| Step | What |
|---|---|
| M3 | ✅ code (PR): `api/domain/tenancy.py`; `authorize_student_read` uses memberships, email-domain rule removed, unknown students denied (not revealed); `resolve_tenant_id` uses student → institution tenant, no first-tenant fallback; SSO claims carry tenant/institution/department/discipline; eklav launch requires `tenant_partner_links.enabled`. **Deploy only after M1–M2 are applied to the production schema** — before that, students without a tenant cannot start assessments and staff fall back to the legacy TPO rule. |
| M4-1 | ✅ (2026-11-16) College activation (agreement ref), staff invites (single use, 72 h, official domain, hash-only storage) and acceptance → verified membership; admin verification of legacy TPOs; `institution_access()` now scopes `/cohort/{id}`, `/institution/{id}/cohort` and `/verify` to the college's staff (coordinators see their departments only — previously any TPO could read any college). API `api/routers/tenancy_router.py`; UI `/admin/tenancy`, `/invite/[token]` |
| M4-2 | ✅ (2026-11-16) `/tpo-dashboard/[id]/departments`: rename, short code, discipline, add, merge (DB function `merge_departments`, one transaction: students, cohorts, staff, invites, aliases; old name kept as alias); review queue groups unlinked students by spelling → `assign_department_alias` links them and their cohorts and remembers the spelling; verified TPO invites coordinators/mentors. Changes need a verified TPO, group admin or c2c admin (`can_manage_college`); unverified TPOs are read-only; coordinators see only their departments. Migration `20261116000200` |
| M4-3 | ✅ (2026-11-16) CSV roster import (G7) at `/tpo-dashboard/[id]/roster`: upload → check (no writes) → confirm → `commit_roster_import` writes in one transaction (sign-up webhook skipped for the import). Off by default; c2c admin switches it on per college on `/admin/tenancy` with the agreement clause covering student data (`roster_dpa_ref`). Imported students have no login: they claim their record at sign-up (same, confirmed email; never a record linked to another login) and stay hidden from employers until then (`real_students_only` also requires `auth_id`). Previews keep student rows ≤ 24 h; commit/discard clear them. Migration `20261116000300` |
| M4-4 | ✅ (2026-11-16) `tests/test_m4_journey.py` runs the whole journey through the real app in CI (activate → invite → accept → coordinator → department edit → roster on → preview → commit → scoped reads → employer can't see → squatter blocked → student claims → employer sees → audit trail); it found B12 (coordinators widened to the whole college by the legacy TPO rule), fixed. Playwright `tests/e2e/college_onboarding.spec.ts` covers the four screens (local; CI doesn't run Playwright). Runbook `docs/runbooks/college-onboarding.md` |
| Prod | ✅ Applied to `public` 2026-11-15 (owner-approved) after a snapshot to `c2c_backup_20261115`; see `20261115000600_m_prod_apply_record.sql`. 17 college tenants + 1 test; 15 prospects, 2 active; 75 departments all mapped; 200 cohorts; demo student linked to Demo Institute |

## Board review (2026-11-15)

| Reviewer | Finding | Applied |
|---|---|---|
| Systems Architect | A separate `organizations` table would duplicate every tenant FK | Reused `tenants` + `kind` |
| Systems Architect | Scope consistency left to app code drifts | CHECK + trigger + partial unique index in the DB |
| Cost Engineer | No new services; taxonomy is 24 rows | — |
| Security Reviewer | New tables auto-exposed via Data API | RLS on, deny-by-default; verified over REST |
| Security Reviewer | Legacy TPOs were never verified | Backfilled as `verified_at = NULL`; verification is an explicit admin act |
| Product Engineer | Colleges name departments differently | Canonical names + aliases + review queue; colleges can rename |
