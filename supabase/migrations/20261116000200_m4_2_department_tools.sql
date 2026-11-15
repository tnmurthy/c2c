-- M4-2 (2026-11-16, ADR-003): department tools, each one transaction.
--   merge_departments(src, dst)               fold a duplicate department into another
--   assign_department_alias(inst, alias, dept) review queue: map a raw department spelling
--                                              to a department; links waiting students + cohorts
-- Called only by the backend (service role) after it has checked the caller's scope.
--
-- Schema-agnostic: the target schema is set ONCE below (c2c_stg first, then c2c).

set local search_path = c2c_stg, extensions;

create or replace function merge_departments(p_src uuid, p_dst uuid) returns jsonb
language plpgsql set search_path from current as $$
declare
  s departments%rowtype;
  d departments%rowtype;
  c cohorts%rowtype;
  tgt uuid;
  n_students int;
  n_cohorts_merged int := 0;
  n_staff_revoked int;
begin
  if p_src = p_dst then raise exception 'merge: choose two different departments'; end if;
  select * into s from departments where id = p_src for update;
  select * into d from departments where id = p_dst for update;
  if s.id is null or d.id is null then raise exception 'merge: department not found'; end if;
  if s.institution_id <> d.institution_id then raise exception 'merge: departments are in different colleges'; end if;

  -- Cohorts: same program + year -> fold students into the existing one; otherwise move it.
  for c in select * from cohorts where department_id = p_src loop
    select id into tgt from cohorts
      where department_id = p_dst and program = c.program and graduation_year = c.graduation_year;
    if tgt is null then
      update cohorts set department_id = p_dst where id = c.id;
    else
      update students set cohort_id = tgt where cohort_id = c.id;
      delete from cohorts where id = c.id;
      n_cohorts_merged := n_cohorts_merged + 1;
    end if;
    tgt := null;
  end loop;

  update students set department_id = p_dst where department_id = p_src;
  get diagnostics n_students = row_count;

  -- Staff: a duplicate live membership (same person + role already on dst) is revoked; the rest move.
  update memberships m set status = 'revoked'
   where m.department_id = p_src and m.status <> 'revoked'
     and exists (select 1 from memberships x where x.department_id = p_dst and x.user_id = m.user_id
                   and x.role = m.role and x.status <> 'revoked');
  get diagnostics n_staff_revoked = row_count;
  update memberships set department_id = p_dst where department_id = p_src;

  -- Open invites for the old department are withdrawn (they named it); history moves with the rows.
  update invites set revoked_at = now() where department_id = p_src and accepted_at is null and revoked_at is null;
  update invites set department_id = p_dst where department_id = p_src;

  -- Spellings that pointed at src now point at dst, and src's own name becomes an alias.
  update department_aliases set department_id = p_dst where department_id = p_src;
  if norm_alias(s.name) is not null then
    insert into department_aliases (institution_id, alias_norm, department_id)
    values (s.institution_id, norm_alias(s.name), p_dst)
    on conflict (institution_id, alias_norm) do update set department_id = excluded.department_id;
  end if;

  delete from departments where id = p_src;
  return jsonb_build_object('students_moved', n_students, 'cohorts_merged', n_cohorts_merged,
                            'staff_revoked', n_staff_revoked, 'merged_name', s.name, 'into', d.name);
end $$;

create or replace function assign_department_alias(p_institution bigint, p_alias text, p_dept uuid) returns jsonb
language plpgsql set search_path from current as $$
declare
  n_students int;
  n_cohorts int;
  prog text;
begin
  if p_alias is null or p_alias <> norm_alias(p_alias) then
    raise exception 'alias must be in normalised form (see norm_alias)';
  end if;
  if not exists (select 1 from departments where id = p_dept and institution_id = p_institution) then
    raise exception 'department % is not in college %', p_dept, p_institution;
  end if;

  insert into department_aliases (institution_id, alias_norm, department_id)
  values (p_institution, p_alias, p_dept)
  on conflict (institution_id, alias_norm) do update set department_id = excluded.department_id;

  update students set department_id = p_dept
   where institution_id = p_institution and department_id is null and norm_alias(department) = p_alias;
  get diagnostics n_students = row_count;

  select coalesce(di.default_program, 'Unspecified') into prog
    from departments d left join disciplines di on di.code = d.discipline_code where d.id = p_dept;
  insert into cohorts (department_id, program, graduation_year)
  select distinct p_dept, prog, graduation_year from students
   where department_id = p_dept and cohort_id is null and graduation_year between 2000 and 2100
  on conflict (department_id, program, graduation_year) do nothing;
  update students s set cohort_id = c.id
    from cohorts c
   where s.department_id = p_dept and s.cohort_id is null
     and c.department_id = p_dept and c.program = prog and c.graduation_year = s.graduation_year;
  get diagnostics n_cohorts = row_count;

  return jsonb_build_object('students_linked', n_students, 'cohort_links', n_cohorts);
end $$;

revoke execute on function merge_departments(uuid, uuid) from public, anon, authenticated;
revoke execute on function assign_department_alias(bigint, text, uuid) from public, anon, authenticated;
grant execute on function merge_departments(uuid, uuid) to service_role;
grant execute on function assign_department_alias(bigint, text, uuid) to service_role;
