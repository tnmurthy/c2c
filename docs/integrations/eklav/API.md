# c2c → eklav: partner API (R4, v1)

Base URL: `https://c2c.mytestbed.tech/api/partners/eklav` · Events: see `EVENTS.md` · SSO: see `SSO.md`.

## Authentication

Every call sends a partner key issued by c2c:

```
Authorization: Bearer c2c_eklav_<prefix>_<secret>
```

Keys are created by a c2c admin, handed over through a secure channel, shown once, and can be rotated
(create a new key, switch, then ask c2c to revoke the old one). Wrong, revoked or missing key → `401`.

## What eklav can see

| Scope | Rule |
|---|---|
| Tenants | Only tenants (university / college group) where c2c switched eklav **on** under their agreement |
| Structure | Colleges, departments, cohorts of those tenants — no people |
| Students | Ids of students who turned on sharing with eklav themselves; details only for them, checked on every call |
| Never | Seeded/demo students, phone numbers, individual answers, employer applications |

A student who is not shared (no consent, consent withdrawn, tenant off, demo, or unknown id) always returns
the same `404 {"detail": "not_shared"}` — the API does not reveal which.

## Endpoints

### `GET /events?after=<cursor>&limit=<1..1000>`
```json
{ "events": [ { "id": 1042, "event_id": "…", "type": "student.upserted", "schema_version": 1,
                "occurred_at": "…", "tenant_id": "…", "subject_id": "…", "payload": { … } } ],
  "next_cursor": 1042 }
```
Store `next_cursor` after applying a batch; resume from it. Empty `events` → poll again later (1–5 min).
Ordered by `id`, at-least-once (de-duplicate on `event_id`), never skips a slow write.

### `GET /tenants`
Opted-in tenants with `institutions[] → departments[] → cohorts[]`. Use for the first sync and to rebuild.

### `GET /students?tenant_id=<id>`
`{ "tenant_id": "…", "student_ids": ["…"] }` — students currently sharing with eklav. Use for the first sync.

### `GET /students/{student_id}`
```json
{ "student_id": "…", "c2c_user_id": "…", "tenant_id": "…",
  "full_name": "…", "email": "…",
  "institution_id": 7, "department_id": "…", "department_name": "…", "discipline_code": "CSE",
  "cohort_id": "…", "program": "B.Tech", "graduation_year": 2027,
  "latest_assessment": { "attempt_id": "…", "attempt_number": 2, "completed_at": "…",
                         "primary_profile": "Builder", "scores": { "IQ": 80, "EQ": 70, "SQ": 60, "AQ": 75, "SpQ": 65 } } }
```
`c2c_user_id` equals the SSO token's `sub` once the student has a login (null before), so eklav can link
SSO sessions to synced students. Every read is recorded in c2c's audit log.

## Sync recipe

1. `GET /tenants` and, per tenant, `GET /students?tenant_id=` → `GET /students/{id}` for each.
2. Remember the latest event id at that time; then loop `GET /events?after=<cursor>`.
3. On `student.*` / `assessment.completed`: re-fetch `GET /students/{id}`; on `404 not_shared`, delete your copy.
4. On `consent.upserted` with `granted: false`: delete that student's personal data.
5. On `*.deleted`: remove the record.

## Limits and errors

| Code | Meaning |
|---|---|
| 401 | Bad, revoked or missing key |
| 404 `not_shared` | Student not available to eklav |
| 404 `Unknown tenant` | Tenant not opted in |
| 422 | Bad parameters (e.g. `limit` > 1000) |
| 5xx | Retry with backoff; requests are read-only and safe to repeat |
