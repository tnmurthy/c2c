# ADR-004 — Student consent before any data reaches a partner

- Status: accepted (2026-11-16). Code: R5. Database: migration `20261116000500` (after R3 `20261116000400`).
- Related: ADR-003 (tenancy, `tenant_partner_links`), `docs/integrations/eklav/EVENTS.md`, `SSO.md`.

## Context

c2c is upstream of eklav. A college opting in (`tenant_partner_links.enabled`) is the college's decision;
sharing a student's personal data with another company also needs the **student's** consent under the
DPDP Act 2023: specific, informed, free, unambiguous, and as easy to withdraw as to give. Students
are mostly adults, but some first-years are 17.

## Decision

| # | Rule |
|---|---|
| C1 | Consent is per student **and** per partner, recorded append-only in `consent_records` (latest row wins); `student_consents` view gives the current state |
| C2 | The student sees a versioned notice: purpose, exactly what is shared, what is never shared, retention, that it is optional. Grant must quote the current `notice_version`; a material change drops old versions from `accepted_versions` and everyone re-consents |
| C3 | Online consent only with an explicit "I am 18 or older" confirmation (DB check). Under-18: parent/guardian route, not built — those students simply don't share |
| C4 | Free: refusing changes nothing in c2c (no feature, assessment or placement depends on it) |
| C5 | Withdrawal any time, one click, even if the college has turned the partner off; emits `consent.upserted` (granted=false) so the partner deletes |
| C6 | Every partner path checks consent at the moment of use, failing closed: SSO launch (students), partner API student details (R4) |
| C7 | Only the student decides; staff and admins cannot grant on a student's behalf |

## Consequences

- R4 releases student details only when `has_consent()` is true at read time; events stay thin (ids).
- TPOs will want adoption numbers (aggregate counts only) — later.
- Under-18 consent is a known gap; flag to colleges at onboarding.

## Board review (2026-11-16)

| Reviewer | Finding | Applied |
|---|---|---|
| Systems Architect | Mutable consent rows lose history | Append-only table + update blocked by trigger; latest-row view |
| Systems Architect | Checking consent when events are written goes stale | Checked at read/launch time (C6) |
| Cost Engineer | No new services; one small table | — |
| Security Reviewer | Staff or admin could "consent" for students | Only the student's own session (C7); admin role refused |
| Security Reviewer | Consent lookup errors | Fail closed |
| Product Engineer | Legal text students won't read | Short plain-language notice with shared / never-shared lists |
| Product Engineer | 17-year-old first-years | 18+ confirmation; under-18 route flagged |
