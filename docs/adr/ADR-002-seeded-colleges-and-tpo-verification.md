# ADR-002 — Seeded colleges are prospects; TPOs are invited and verified, never self-claimed

- Status: accepted (2026-11-15). T1, T2, T4 done (T4: M4-1, 2026-11-16); T3, T5, T6 pending.
- Related: GO_LIVE B9 (institution takeover fix), tenancy model M1–M3.

## Context

Production holds 15 real college names (institutions 5–19: JNTUH, CBIT, IIIT-H, …) with
450 students seeded on 2026-11-04 — no logins, created within one second, all marked
`is_verified = true`. Until B9, any signed-in user could claim these colleges as TPO.
A tenant is a **university or college group**; each campus is an institution under it.

## Decision

| # | Rule | Status |
|---|---|---|
| T1 | Seeded colleges get `status = 'prospect'`: not claimable, not offered in onboarding, excluded from employer search | pending (with N4) |
| T2 | Seeded students flagged `is_synthetic = true`, `is_verified = false` | ✅ migration `20261115000000` applied 2026-11-15 (guarded: exactly 450 rows) |
| T3 | Each prospect college added to the CRM pipeline (`leads`) | pending |
| T4 | On a signed LoI/MSA: admin creates the tenant (university), activates its institutions, and **invites** the TPO — single-use invite, 72 h expiry, official-domain address only. Acceptance creates a `tpo` membership with `verified_by` / `verified_at` | ✅ M4-1: `/admin/tenancy` (activate with agreement ref → invite TPO), `/invite/[token]`; table `invites` stores only sha256(token); migration `20261116000100` |
| T5 | Admin verification SOP (below), logged in `audit_logs` | adopt now |
| T6 | When the real roster arrives (CSV import), delete that college's synthetic students | first real college |

Synthetic students (`is_synthetic = true`) must be excluded from employer search, matching,
exports and any partner (eklav) sync.

## TPO verification SOP (admin)

1. Take the TPO's name and email **only** from the signed LoI/MSA or the college's official website — never from the requester.
2. Email must be on the institution's verified domain (no webmail).
3. Call the placement cell via the college's official switchboard number to confirm the person and role.
4. Activate the college with its agreement reference, then send the invite from `/admin/tenancy`. Activation, invite, revoke, accept and verify are written to `audit_logs` automatically (`changes.actor` = admin login); note the switchboard call (caller, date, outcome) in the CRM lead.
6. Legacy (unverified) TPOs: verify from `/admin/tenancy` only after steps 1–3; otherwise invite the right person.
5. Re-verify when a TPO changes; revoke the old membership the same day.

## Board review (2026-11-15)

| Reviewer | Finding | Applied |
|---|---|---|
| Systems Architect | `is_verified` was doing double duty (real + verified) | Separate `is_synthetic` flag |
| Cost Engineer | No cost | — |
| Security Reviewer | Self-claim of seeded colleges was a live takeover path | B9 + invite-only T4 |
| Product Engineer | Fake "verified" students under real names in demos | T2 applied; demos use "Demo Institute of Technology" |
