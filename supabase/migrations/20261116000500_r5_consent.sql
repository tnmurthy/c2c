-- R5 (2026-11-16, ADR-004): student consent for sharing data with a partner (eklav).
--
--   consent_records    append-only: every grant and withdrawal, with the notice version the
--                      student saw and their 18+ confirmation. Never updated or deleted by the app.
--   student_consents   current decision per student and partner (latest record).
--   consent.upserted   partner event on every decision (needs R3's partner_events); on
--                      granted=false the partner must stop using and delete the student's data.
--
-- Schema-agnostic: the target schema is set ONCE below (c2c_stg first, then c2c). Apply after R3.

set local search_path = c2c_stg, extensions;

create table if not exists consent_records (
  id             bigint generated always as identity primary key,
  student_id     uuid not null references students(id) on delete cascade,
  partner_id     text not null check (partner_id ~ '^[a-z0-9_-]+$'),
  granted        boolean not null,
  notice_version text not null check (length(notice_version) between 1 and 40),
  age_confirmed  boolean not null default false,
  actor          uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  constraint consent_grant_needs_adult check (not granted or age_confirmed)
);
create index if not exists consent_records_student_idx on consent_records (student_id, partner_id, id desc);
comment on table consent_records is
  'R5: append-only record of student consent decisions per partner (DPDP). Latest row wins. Backend only.';

create or replace view student_consents with (security_invoker = on) as
  select distinct on (student_id, partner_id)
         student_id, partner_id, granted, notice_version, age_confirmed, created_at as decided_at
    from consent_records
   order by student_id, partner_id, id desc;

alter table consent_records enable row level security;
revoke all on consent_records from anon, authenticated;
revoke all on student_consents from anon, authenticated;

-- Append-only: block edits and deletes from anything but cascades from a deleted student.
create or replace function consent_records_immutable() returns trigger
language plpgsql set search_path from current as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'consent_records is append-only: insert a new decision instead';
  end if;
  return old;
end $$;
drop trigger if exists consent_records_immutable on consent_records;
create trigger consent_records_immutable before update on consent_records
  for each row execute function consent_records_immutable();
revoke execute on function consent_records_immutable() from public, anon, authenticated;

-- Partner event for each decision (R3 outbox), if the outbox exists in this schema.
create or replace function emit_consent_event() returns trigger
language plpgsql set search_path from current as $$
declare v_tenant uuid;
begin
  if to_regclass(current_schema() || '.partner_events') is null then return null; end if;
  select coalesce(s.tenant_id, i.tenant_id) into v_tenant
    from students s left join institutions i on i.id = s.institution_id where s.id = new.student_id;
  insert into partner_events (tenant_id, type, subject_id, payload)
  values (v_tenant, 'consent.upserted', new.student_id::text,
          jsonb_build_object('student_id', new.student_id, 'partner_id', new.partner_id,
                             'granted', new.granted, 'notice_version', new.notice_version));
  return null;
end $$;
drop trigger if exists consent_records_event on consent_records;
create trigger consent_records_event after insert on consent_records
  for each row execute function emit_consent_event();
revoke execute on function emit_consent_event() from public, anon, authenticated;
