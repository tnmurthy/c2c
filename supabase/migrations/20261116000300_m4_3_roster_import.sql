-- M4-3 (2026-11-16, ADR-003 G7): CSV roster import.
--
--   institutions.roster_import_*  - off by default; a c2c admin switches it on per college once
--                                   its agreement covers student data (DPDP processor clause).
--   students.roll_no              - college roll / hall-ticket number (optional).
--   roster_imports                - an uploaded file: checked rows (preview) -> committed or discarded.
--   commit_roster_import()        - writes the checked rows in ONE transaction; the per-student
--                                   sign-up webhook is skipped for the import's own inserts.
-- Imported students have no login until they sign up and claim their record (same email,
-- confirmed); until then they are hidden from employers (api/synthetic.real_students_only).
--
-- Schema-agnostic: the target schema is set ONCE below (c2c_stg first, then c2c).

set local search_path = c2c_stg, extensions;

-- ---------------------------------------------------------------- switches
alter table institutions
  add column if not exists roster_import_enabled boolean not null default false,
  add column if not exists roster_dpa_ref        text,
  add column if not exists roster_enabled_at     timestamptz,
  add column if not exists roster_enabled_by     uuid references auth.users(id) on delete set null;
comment on column institutions.roster_import_enabled is
  'CSV roster import allowed (M4-3). Switched on by c2c admin with roster_dpa_ref = the agreement clause covering student data.';

alter table students add column if not exists roll_no text;

-- ---------------------------------------------------------------- imports
create table if not exists roster_imports (
  id             uuid primary key default gen_random_uuid(),
  institution_id bigint not null references institutions(id) on delete cascade,
  uploaded_by    uuid references auth.users(id) on delete set null,
  filename       text,
  status         text not null default 'preview' check (status in ('preview', 'committed', 'discarded')),
  rows           jsonb not null default '[]'::jsonb check (jsonb_typeof(rows) = 'array' and jsonb_array_length(rows) <= 5000),
  summary        jsonb not null default '{}'::jsonb,
  result         jsonb,
  created_at     timestamptz not null default now(),
  committed_at   timestamptz,
  committed_by   uuid references auth.users(id) on delete set null
);
create index if not exists roster_imports_inst_idx on roster_imports (institution_id, created_at desc);
comment on table roster_imports is 'CSV roster uploads (M4-3). rows = checked rows from the API; contains student PII - backend access only.';

alter table roster_imports enable row level security;
revoke all on roster_imports from anon, authenticated;

-- ---------------------------------------------------------------- commit
-- Row keys (written by the API's checker): action new|update|error, email, full_name,
-- graduation_year, department (raw text), department_id (or null), phone, roll_no.
create or replace function commit_roster_import(p_import uuid, p_actor uuid) returns jsonb
language plpgsql set search_path from current as $$
declare
  imp roster_imports%rowtype;
  inst institutions%rowtype;
  r jsonb;
  v_dept uuid;
  v_prog text;
  v_cohort uuid;
  v_year int;
  n_new int := 0; n_upd int := 0; n_skip int := 0; n_conflict int := 0;
  existing students%rowtype;
begin
  select * into imp from roster_imports where id = p_import for update;
  if imp.id is null then raise exception 'roster: import not found'; end if;
  if imp.status <> 'preview' then raise exception 'roster: import already %', imp.status; end if;
  if imp.created_at < now() - interval '24 hours' then raise exception 'roster: preview expired, upload the file again'; end if;
  select * into inst from institutions where id = imp.institution_id;
  if not inst.roster_import_enabled then raise exception 'roster: import is not enabled for this college'; end if;

  -- The sign-up webhook (AFTER INSERT on students) is for real sign-ups, not bulk loads.
  perform set_config('c2c.bulk_import', 'on', true);

  for r in select value from jsonb_array_elements(imp.rows) loop
    if r->>'action' = 'error' then n_skip := n_skip + 1; continue; end if;
    v_year := (r->>'graduation_year')::int;

    -- department chosen at preview may have been merged/removed since: fall back to review queue
    v_dept := nullif(r->>'department_id', '')::uuid;
    if v_dept is not null and not exists (select 1 from departments where id = v_dept and institution_id = inst.id) then
      v_dept := null;
    end if;
    v_cohort := null;
    if v_dept is not null then
      select coalesce(di.default_program, 'Unspecified') into v_prog
        from departments d left join disciplines di on di.code = d.discipline_code where d.id = v_dept;
      insert into cohorts (department_id, program, graduation_year) values (v_dept, v_prog, v_year)
        on conflict (department_id, program, graduation_year) do nothing;
      select id into v_cohort from cohorts where department_id = v_dept and program = v_prog and graduation_year = v_year;
    end if;

    select * into existing from students where lower(email) = lower(r->>'email') limit 1;
    if existing.id is not null and existing.institution_id is distinct from inst.id then
      n_conflict := n_conflict + 1;   -- registered at another college since the preview: never move it
      existing := null;
      continue;
    end if;

    if existing.id is null then
      insert into students (full_name, email, graduation_year, department, institution_id, tenant_id,
                            department_id, cohort_id, phone, roll_no, is_verified, is_synthetic)
      values (r->>'full_name', lower(r->>'email'), v_year, coalesce(r->>'department', ''), inst.id, inst.tenant_id,
              v_dept, v_cohort, nullif(r->>'phone', ''), nullif(r->>'roll_no', ''), true, false);
      n_new := n_new + 1;
    else
      update students set
        full_name       = r->>'full_name',
        graduation_year = v_year,
        department      = coalesce(r->>'department', department),
        department_id   = coalesce(v_dept, department_id),
        cohort_id       = coalesce(v_cohort, cohort_id),
        phone           = coalesce(nullif(r->>'phone', ''), phone),
        roll_no         = coalesce(nullif(r->>'roll_no', ''), roll_no),
        tenant_id       = coalesce(tenant_id, inst.tenant_id),
        is_verified     = true,
        is_synthetic    = false
      where id = existing.id;
      n_upd := n_upd + 1;
    end if;
    existing := null;
  end loop;

  -- rows held student PII only for the preview; the students table is now the record.
  update roster_imports set status = 'committed', committed_at = now(), committed_by = p_actor, rows = '[]'::jsonb,
         result = jsonb_build_object('created', n_new, 'updated', n_upd, 'skipped_errors', n_skip,
                                     'conflicts', n_conflict)
   where id = p_import;
  return jsonb_build_object('created', n_new, 'updated', n_upd, 'skipped_errors', n_skip, 'conflicts', n_conflict);
end $$;

revoke execute on function commit_roster_import(uuid, uuid) from public, anon, authenticated;
grant execute on function commit_roster_import(uuid, uuid) to service_role;

-- ---------------------------------------------------------------- sign-up webhook: skip bulk loads
-- Only where the trigger function exists in this schema (production has it; staging does not).
do $do$
begin
  if to_regprocedure(current_schema() || '.webhook_student_onboarded()') is not null then
    execute format($f$
      create or replace function %I.webhook_student_onboarded() returns trigger
      language plpgsql security definer set search_path = c2c, extensions as $b$
      begin
        if coalesce(current_setting('c2c.bulk_import', true), '') = 'on' then
          return new;  -- roster import (M4-3): no per-student webhook
        end if;
        perform c2c.c2c_post_webhook('/webhook/student-onboarded', jsonb_build_object('record', jsonb_build_object('id', new.id)));
        return new;
      end;
      $b$;$f$, current_schema());
  end if;
end
$do$;
