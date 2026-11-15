# c2c → eklav: event feed contract (R3, draft v1)

Status: **draft for review with eklav**. Events are recorded in c2c from R3 onward; **nothing is delivered**
until the partner API (R4) ships and a tenant has opted in (`tenant_partner_links.enabled`). Student
details are only released for students who have consented (R5).

## Principles

| Rule | Why |
|---|---|
| **Thin events** — ids and non-personal fields only | No names, emails, phone numbers or scores travel in the feed. eklav fetches details through the partner API, which applies consent at read time |
| **Per tenant** | A partner only ever sees events for tenants (university / college group) that enabled it |
| **At-least-once, ordered by `id`** | Use `event_id` to de-duplicate. Apply events in `id` order |
| **No gaps** | The feed only returns events from transactions that have finished, so a slow write can never appear behind your cursor |
| **Seeded/demo students never appear** | `is_synthetic` students emit nothing |

## Envelope

```json
{
  "id": 1042,
  "event_id": "5b0d4c2e-7c1f-4c64-9d2a-1d3f6a2b9e10",
  "type": "student.upserted",
  "schema_version": 1,
  "occurred_at": "2026-11-16T09:30:12.512Z",
  "tenant_id": "6f1c…",
  "subject_id": "a3e9…",
  "payload": { … }
}
```

`id` is the cursor (monotonic, may skip numbers). `subject_id` is the id of the thing that changed.

## Event types (v1)

| Type | When | Payload |
|---|---|---|
| `institution.upserted` / `.deleted` | College created, renamed, activated/suspended, moved tenant | `institution_id`, `name`, `status` (`prospect`/`active`/`suspended`), `affiliating_university` |
| `department.upserted` / `.deleted` | Department created, renamed, mapped to a discipline; `.deleted` after a merge | `department_id`, `institution_id`, `name`, `short_code`, `discipline_code` |
| `cohort.upserted` / `.deleted` | Program + graduation-year group created or moved | `cohort_id`, `department_id`, `program`, `graduation_year` |
| `student.upserted` / `.deleted` | Student added (sign-up or roster), moved department/cohort/year, or linked a login | `student_id`, `institution_id`, `department_id`, `cohort_id`, `graduation_year`, `has_login` |
| `membership.upserted` / `.deleted` | Staff role granted, verified or revoked | `membership_id`, `user_id` (c2c `sub`, same as SSO), `role`, `institution_id`, `department_id`, `status`, `verified` |
| `assessment.completed` | A student finished an assessment attempt | `attempt_id`, `student_id`, `attempt_number` |
| `consent.upserted` | A student turned sharing with a partner on or off (R5, ADR-004) | `student_id`, `partner_id`, `granted`, `notice_version`. **On `granted: false` for eklav: stop using and delete that student's personal data** |

`discipline_code` uses the shared taxonomy (`CSE`, `CSE-AIML`, `ECE`, `MBA`, …) — see `GET /api/tenancy/disciplines`.

Profile-only edits (bio, links, skills) do **not** emit events.

## How eklav will read it (R4, planned)

```
GET /api/partners/eklav/events?after=<id>&limit=500      → { "events": [...], "next_cursor": <id> }
GET /api/partners/eklav/students/{student_id}             → details, only if the student has consented
```

Authenticated with a partner credential (not a user login). Store `next_cursor` after applying a batch;
on restart, resume from it. If `events` is empty, poll again later (suggested every 1–5 minutes).

## Versioning

New event types and new payload fields may be added at any time — ignore what you don't recognise.
Removing or changing the meaning of a field bumps `schema_version` and is announced in advance.
