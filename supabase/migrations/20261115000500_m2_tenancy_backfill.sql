-- M2 (2026-11-15, ADR-003): fill the tenancy model from existing data.
-- Schema-agnostic (set once below). Idempotent: safe to re-run.
--   1. tenant kind: E2E/test tenants -> 'test'
--   2. affiliating university parsed from "College (X University)" names
--   3. every institution gets a tenant: the single tenant its students already
--      share (if any, non-test), else a new 'autonomous_college' tenant
--      (admins can later merge campuses under a college_group tenant)
--   4. students.tenant_id := their institution's tenant (fixes the old
--      "first tenant" fallback that attached students to a test tenant)
--   5. prospect status: no owner and no real (non-synthetic) students
--   6. institution_domains from institutions.domain (unverified)
--   7. departments + aliases from students.department via map_discipline()
--   8. cohorts (discipline default program + graduation year)
--   9. memberships: legacy TPO owners (institutions.auth_id) and students with logins

set local search_path = c2c_stg, extensions;

do $m2$
declare
  r record; v_tenant uuid; n int;
begin
  -- 1
  update tenants set kind = 'test'
   where kind <> 'test' and (slug ~* '(^|-)(test|e2e|debug)' or name ~* '\m(test|e2e|debugger)\M');

  -- 2
  update institutions
     set affiliating_university = substring(name from '\(([^()]*University[^()]*)\)\s*$')
   where affiliating_university is null and name ~ '\([^()]*University[^()]*\)\s*$';

  -- 3
  for r in select i.id, i.name from institutions i where i.tenant_id is null loop
    v_tenant := null;
    select s.tenant_id into v_tenant
      from students s join tenants t on t.tenant_id = s.tenant_id
     where s.institution_id = r.id and t.kind <> 'test'
     group by s.tenant_id
     order by count(*) desc limit 1;
    if v_tenant is null or (select count(distinct s.tenant_id) from students s
                             join tenants t on t.tenant_id = s.tenant_id
                             where s.institution_id = r.id and t.kind <> 'test') > 1 then
      insert into tenants (name, slug, kind, status)
      values (trim(regexp_replace(r.name, '\s*\([^()]*\)\s*$', '')),
              'inst-' || r.id || '-' || left(trim(both '-' from regexp_replace(lower(r.name), '[^a-z0-9]+', '-', 'g')), 40),
              'autonomous_college', 'active')
      returning tenant_id into v_tenant;
    end if;
    update institutions set tenant_id = v_tenant where id = r.id;
  end loop;

  -- 4
  update students s set tenant_id = i.tenant_id
    from institutions i
   where i.id = s.institution_id and s.tenant_id is distinct from i.tenant_id;

  -- 5
  update institutions i set status = 'prospect'
   where i.status = 'active' and i.auth_id is null
     and not exists (select 1 from students s where s.institution_id = i.id and not s.is_synthetic);

  -- 6
  insert into institution_domains (domain, institution_id)
  select lower(trim(i.domain)), i.id from institutions i
   where i.domain is not null and lower(trim(i.domain)) ~ '\.'
  on conflict (domain) do nothing;

  -- 7 departments: one per (institution, discipline) or per unmapped raw name
  -- Mapped departments take the canonical discipline name (colleges can rename
  -- later); unmapped keep the most common raw spelling, whitespace-normalised.
  insert into departments (institution_id, name, discipline_code)
  select x.institution_id, coalesce(dc.name, x.name), x.code
  from (
    select s.institution_id,
           map_discipline(s.department) as code,
           coalesce(map_discipline(s.department), 'raw:' || norm_alias(s.department)) as k,
           mode() within group (order by trim(regexp_replace(s.department, '\s+', ' ', 'g'))) as name
      from students s
     where s.institution_id is not null and norm_alias(s.department) is not null
     group by s.institution_id, 2, 3
  ) x
  left join disciplines dc on dc.code = x.code
  on conflict do nothing;

  insert into department_aliases (institution_id, alias_norm, department_id)
  select distinct s.institution_id, norm_alias(s.department), d.id
    from students s
    join departments d on d.institution_id = s.institution_id
     and ((d.discipline_code is not null and d.discipline_code = map_discipline(s.department))
       or (d.discipline_code is null and map_discipline(s.department) is null
           and norm_alias(d.name) = norm_alias(s.department)))
   where norm_alias(s.department) is not null
  on conflict do nothing;

  update students s set department_id = a.department_id
    from department_aliases a
   where a.institution_id = s.institution_id and a.alias_norm = norm_alias(s.department)
     and s.department_id is distinct from a.department_id;

  -- 8 cohorts
  insert into cohorts (department_id, program, graduation_year)
  select distinct s.department_id, coalesce(dc.default_program, 'Unspecified'), s.graduation_year
    from students s
    join departments d on d.id = s.department_id
    left join disciplines dc on dc.code = d.discipline_code
   where s.graduation_year is not null
  on conflict do nothing;

  update students s set cohort_id = c.id
    from departments d
    left join disciplines dc on dc.code = d.discipline_code
    join cohorts c on c.department_id = d.id
   where d.id = s.department_id
     and c.program = coalesce(dc.default_program, 'Unspecified')
     and c.graduation_year = s.graduation_year
     and s.cohort_id is distinct from c.id;

  -- 9 memberships (legacy, unverified: verified_at stays NULL until an admin verifies)
  insert into memberships (user_id, tenant_id, institution_id, role, status, source)
  select i.auth_id, i.tenant_id, i.id, 'tpo', 'active', 'legacy_backfill'
    from institutions i
   where i.auth_id is not null and exists (select 1 from auth.users u where u.id = i.auth_id)
  on conflict do nothing;

  insert into memberships (user_id, tenant_id, institution_id, department_id, role, status, source)
  select s.auth_id, s.tenant_id, s.institution_id, s.department_id, 'student', 'active', 'legacy_backfill'
    from students s
   where s.auth_id is not null and s.institution_id is not null and s.tenant_id is not null
     and exists (select 1 from auth.users u where u.id = s.auth_id)
  on conflict do nothing;

  select count(*) into n from department_mapping_review;
  raise notice 'M2 done. departments needing review: %', n;
end
$m2$;
