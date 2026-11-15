-- R3 (2026-11-16): partner event log (transactional outbox) for downstream partners (eklav).
--
--   partner_events   append-only log of changes to the tenancy graph and assessments.
--                    THIN events: ids + non-personal fields only. Names, emails and scores are
--                    fetched by the partner through the consent-gated partner API (R4/R5).
--   emit_partner_event()  one trigger function on institutions, departments, cohorts, students,
--                    memberships, assessment_attempts - written in the same transaction as the change,
--                    so an event exists if and only if the change committed.
--
-- Reading rule for R4 (no gaps): ids come from a sequence, so a slow transaction can commit an
-- event with a LOWER id after a reader already moved past it. Readers therefore only return rows
-- whose tx is older than every running transaction:
--     where id > :cursor and tx < pg_snapshot_xmin(pg_current_snapshot())  order by id
-- Delivery is at-least-once; event_id is the idempotency key.
--
-- Nothing is sent anywhere by this migration. Seeded students (is_synthetic) emit nothing.
-- Schema-agnostic: the target schema is set ONCE below (c2c_stg first, then c2c).

set local search_path = c2c_stg, extensions;

create table if not exists partner_events (
  id             bigint generated always as identity primary key,
  event_id       uuid not null unique default gen_random_uuid(),
  tx             xid8 not null default pg_current_xact_id(),
  occurred_at    timestamptz not null default now(),
  tenant_id      uuid,                       -- null only if the subject has no tenant yet
  type           text not null check (type ~ '^[a-z_]+\.(upserted|deleted|completed)$'),
  subject_id     text not null,
  schema_version int  not null default 1,
  payload        jsonb not null default '{}'::jsonb
);
create index if not exists partner_events_tenant_id_idx on partner_events (tenant_id, id);
create index if not exists partner_events_occurred_idx on partner_events (occurred_at);
comment on table partner_events is
  'R3 outbox for partners (eklav). Thin events (ids, no names/emails/scores). Read with tx < pg_snapshot_xmin(pg_current_snapshot()) to avoid gaps. Backend only.';

alter table partner_events enable row level security;
revoke all on partner_events from anon, authenticated;

create or replace function emit_partner_event() returns trigger
language plpgsql set search_path from current as $$
declare
  rec       record;
  v_type    text;
  v_kind    text := case when tg_op = 'DELETE' then 'deleted' else 'upserted' end;
  v_tenant  uuid;
  v_payload jsonb;
begin
  rec := case when tg_op = 'DELETE' then old else new end;

  if tg_table_name = 'institutions' then
    v_type := 'institution'; v_tenant := rec.tenant_id;
    v_payload := jsonb_build_object('institution_id', rec.id, 'name', rec.name, 'status', rec.status,
                                    'affiliating_university', rec.affiliating_university);

  elsif tg_table_name = 'departments' then
    v_type := 'department';
    select tenant_id into v_tenant from institutions where id = rec.institution_id;
    v_payload := jsonb_build_object('department_id', rec.id, 'institution_id', rec.institution_id,
                                    'name', rec.name, 'short_code', rec.short_code, 'discipline_code', rec.discipline_code);

  elsif tg_table_name = 'cohorts' then
    v_type := 'cohort';
    select i.tenant_id into v_tenant
      from departments d join institutions i on i.id = d.institution_id where d.id = rec.department_id;
    v_payload := jsonb_build_object('cohort_id', rec.id, 'department_id', rec.department_id,
                                    'program', rec.program, 'graduation_year', rec.graduation_year);

  elsif tg_table_name = 'students' then
    if rec.is_synthetic then return null; end if;            -- seeded/demo data never flows
    if tg_op = 'UPDATE' and (old.institution_id, old.department_id, old.cohort_id, old.graduation_year,
                             old.auth_id is null, old.tenant_id, old.is_synthetic)
                       is not distinct from
                            (new.institution_id, new.department_id, new.cohort_id, new.graduation_year,
                             new.auth_id is null, new.tenant_id, new.is_synthetic) then
      return null;                                           -- profile-only edits: nothing a partner syncs
    end if;
    v_type := 'student';
    v_tenant := coalesce(rec.tenant_id, (select tenant_id from institutions where id = rec.institution_id));
    v_payload := jsonb_build_object('student_id', rec.id, 'institution_id', rec.institution_id,
                                    'department_id', rec.department_id, 'cohort_id', rec.cohort_id,
                                    'graduation_year', rec.graduation_year, 'has_login', rec.auth_id is not null);

  elsif tg_table_name = 'memberships' then
    if rec.role = 'student' then return null; end if;        -- students are covered by student.*
    v_type := 'membership'; v_tenant := rec.tenant_id;
    v_payload := jsonb_build_object('membership_id', rec.id, 'user_id', rec.user_id, 'role', rec.role,
                                    'institution_id', rec.institution_id, 'department_id', rec.department_id,
                                    'status', rec.status, 'verified', rec.verified_at is not null);

  elsif tg_table_name = 'assessment_attempts' then
    if tg_op <> 'INSERT' then return null; end if;
    if exists (select 1 from students s where s.id = rec.student_id and s.is_synthetic) then return null; end if;
    v_type := 'assessment'; v_kind := 'completed';
    select coalesce(s.tenant_id, i.tenant_id) into v_tenant
      from students s left join institutions i on i.id = s.institution_id where s.id = rec.student_id;
    v_payload := jsonb_build_object('attempt_id', rec.id, 'student_id', rec.student_id,
                                    'attempt_number', rec.attempt_number);
  else
    return null;
  end if;

  insert into partner_events (tenant_id, type, subject_id, payload)
  values (v_tenant, v_type || '.' || v_kind,
          coalesce(v_payload->>(v_type || '_id'), v_payload->>'attempt_id', rec.id::text), v_payload);
  return null;
end $$;

revoke execute on function emit_partner_event() from public, anon, authenticated;

do $do$
declare t text;
begin
  foreach t in array array['institutions', 'departments', 'cohorts', 'students', 'memberships', 'assessment_attempts'] loop
    if to_regclass(current_schema() || '.' || t) is not null then
      execute format('drop trigger if exists partner_events_emit on %I.%I', current_schema(), t);
      execute format('create trigger partner_events_emit after insert or update or delete on %I.%I '
                     'for each row execute function %I.emit_partner_event()', current_schema(), t, current_schema());
    end if;
  end loop;
end
$do$;
