-- M4-1 (2026-11-16, ADR-002 T4 / ADR-003 M4): college activation + staff invites.
--
--   institutions.agreement_ref / activated_at / activated_by  - prospect -> active is an
--     explicit admin act tied to a signed LoI/MSA (ADR-002).
--   invites - single-use, 72 h, official-domain staff invites. Only the SHA-256 of the
--     invite token is stored; the token itself exists only in the link given to the inviter.
--     Accepting creates a verified membership (verified_by = inviter).
--
-- Schema-agnostic: the target schema is set ONCE below. Applied to c2c_stg first,
-- then to c2c with only that line changed. Additive only.

set local search_path = c2c_stg, extensions;

-- ---------------------------------------------------------------- activation
alter table institutions
  add column if not exists agreement_ref text,
  add column if not exists activated_at  timestamptz,
  add column if not exists activated_by  uuid references auth.users(id) on delete set null;
comment on column institutions.agreement_ref is 'LoI/MSA reference recorded when the college was activated (ADR-002). Required before staff invites.';

-- ---------------------------------------------------------------- invites
create table if not exists invites (
  id             uuid primary key default gen_random_uuid(),
  token_hash     text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  email          text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  tenant_id      uuid not null references tenants(tenant_id) on delete cascade,
  institution_id bigint references institutions(id) on delete cascade,
  department_id  uuid references departments(id) on delete cascade,
  role           text not null check (role in ('tenant_admin', 'tpo', 'dept_coordinator', 'faculty_mentor')),
  agreement_ref  text,
  invited_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null,
  accepted_at    timestamptz,
  accepted_by    uuid references auth.users(id) on delete set null,
  membership_id  uuid references memberships(id) on delete set null,
  revoked_at     timestamptz,
  revoked_by     uuid references auth.users(id) on delete set null,
  constraint invites_scope_by_role check (
    (role = 'tenant_admin' and institution_id is null and department_id is null)
    or (role = 'tpo' and institution_id is not null and department_id is null)
    or (role in ('dept_coordinator', 'faculty_mentor') and institution_id is not null and department_id is not null)
  ),
  constraint invites_ttl check (expires_at > created_at and expires_at <= created_at + interval '72 hours'),
  constraint invites_single_outcome check (not (accepted_at is not null and revoked_at is not null))
);
comment on table invites is 'Staff invites (ADR-002 T4). token_hash = sha256(token); the token is never stored.';

-- At most one open invite per person and scope; the API revokes the old one before re-inviting.
create unique index if not exists invites_open_uq on invites
  (email, tenant_id, coalesce(institution_id, 0), coalesce(department_id, '00000000-0000-0000-0000-000000000000'::uuid), role)
  where accepted_at is null and revoked_at is null;
create index if not exists invites_tenant_idx on invites (tenant_id);
create index if not exists invites_inst_idx on invites (institution_id);

create or replace function invites_check_scope() returns trigger
language plpgsql set search_path from current as $$
begin
  if new.institution_id is not null and not exists (
       select 1 from institutions i where i.id = new.institution_id and i.tenant_id = new.tenant_id) then
    raise exception 'invite: institution % is not in tenant %', new.institution_id, new.tenant_id;
  end if;
  if new.department_id is not null and not exists (
       select 1 from departments d where d.id = new.department_id and d.institution_id = new.institution_id) then
    raise exception 'invite: department % is not in institution %', new.department_id, new.institution_id;
  end if;
  return new;
end $$;
drop trigger if exists invites_check_scope on invites;
create trigger invites_check_scope before insert or update on invites
  for each row execute function invites_check_scope();

-- ---------------------------------------------------------------- RLS
-- Deny-by-default for API roles: invites are read and written only by the backend (service role).
alter table invites enable row level security;
revoke all on invites from anon, authenticated;
revoke execute on function invites_check_scope() from public, anon, authenticated;
