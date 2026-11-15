-- Production apply record (2026-11-15, owner-approved): ADR-003 M1 + M2 on the
-- production schema `public` (before the N4 move to `c2c`).
--
-- Applied via the Supabase migration API, in this order:
--   backup_before_m1_m2_prod          snapshot: c2c_backup_20261115.{students,institutions,tenants}
--   m1_tenancy_schema_public          = 20261115000400 with `set local search_path = public, extensions;`
--   m2_tenancy_backfill_public        = 20261115000500 with `set local search_path = public, extensions;`
--   m2b_link_demo_students_by_domain  = the block below
--
-- Result: 17 college tenants + 1 test tenant; 15 seeded colleges = prospect, 2 owned = active;
-- 75 departments (all mapped), 200 cohorts; 0 student/institution tenant mismatches;
-- 2 legacy TPO memberships (unverified). Unlinked by design: one personal gmail record and
-- one debugger test record (no institution).
--
-- Rollback for M2 data: restore students/institutions/tenants from c2c_backup_20261115.

-- m2b: link students whose email domain exactly matches an ACTIVE institution's domain
-- (same rule as onboarding); then department, cohort and student membership.
set local search_path = public, extensions;
do $m2b$
declare n int;
begin
  update students s
     set institution_id = d.institution_id, tenant_id = i.tenant_id
    from institution_domains d join institutions i on i.id = d.institution_id
   where s.institution_id is null
     and i.status = 'active'
     and lower(split_part(s.email, '@', 2)) = d.domain
     and d.domain not in ('gmail.com','googlemail.com','yahoo.com','outlook.com','hotmail.com','example.com');
  get diagnostics n = row_count;
  raise notice 'linked % students', n;

  insert into departments (institution_id, name, discipline_code)
  select distinct s.institution_id, dc.name, dc.code
    from students s join disciplines dc on dc.code = map_discipline(s.department)
   where s.institution_id is not null and s.department_id is null
  on conflict do nothing;

  insert into department_aliases (institution_id, alias_norm, department_id)
  select distinct s.institution_id, norm_alias(s.department), d.id
    from students s join departments d on d.institution_id = s.institution_id and d.discipline_code = map_discipline(s.department)
   where s.department_id is null
  on conflict do nothing;

  update students s set department_id = a.department_id
    from department_aliases a
   where s.department_id is null and a.institution_id = s.institution_id and a.alias_norm = norm_alias(s.department);

  insert into cohorts (department_id, program, graduation_year)
  select distinct s.department_id, coalesce(dc.default_program, 'Unspecified'), s.graduation_year
    from students s join departments d on d.id = s.department_id left join disciplines dc on dc.code = d.discipline_code
   where s.cohort_id is null and s.graduation_year is not null
  on conflict do nothing;

  update students s set cohort_id = c.id
    from departments d left join disciplines dc on dc.code = d.discipline_code
    join cohorts c on c.department_id = d.id
   where s.cohort_id is null and d.id = s.department_id
     and c.program = coalesce(dc.default_program, 'Unspecified') and c.graduation_year = s.graduation_year;

  insert into memberships (user_id, tenant_id, institution_id, department_id, role, status, source)
  select s.auth_id, s.tenant_id, s.institution_id, s.department_id, 'student', 'active', 'legacy_backfill'
    from students s
   where s.auth_id is not null and s.institution_id is not null and s.tenant_id is not null
     and exists (select 1 from auth.users u where u.id = s.auth_id)
  on conflict do nothing;
end $m2b$;
