-- Staging-only fixtures + membership rule tests for ADR-003 (c2c_stg).
-- Run after N3 build + seed and M1, then run M2, then the tests block.
-- Never run against public / c2c.

-- Fixtures: messy department names on a test tenant, plus a prospect college.
do $fx$
declare v_test uuid; v_tpo uuid; v_i2 bigint; v_i3 bigint;
begin
  select id into v_tpo from auth.users where email = 'e2e.tpo@makeover.test';
  insert into c2c_stg.tenants (name, slug) values ('E2E Fallback Tenant', 'e2e-fallback-stg') returning tenant_id into v_test;
  insert into c2c_stg.institutions (name, type, domain, location, auth_id)
    values ('Staging Engineering College (Staging Technological University)', 'Engineering', 'sec.stg.c2c.test', 'Hyderabad', v_tpo)
    returning id into v_i2;
  insert into c2c_stg.institutions (name, type, domain, location)
    values ('Staging Prospect College (Osmania University)', 'Engineering', 'spc.stg.c2c.test', 'Hyderabad')
    returning id into v_i3;
  insert into c2c_stg.students (full_name, email, graduation_year, department, institution_id, tenant_id, is_synthetic, is_verified)
  select 'Fixture ' || d, 'fx' || ord || '@sec.stg.c2c.test', 2026 + (ord % 2), d, v_i2, v_test, false, false
  from unnest(array['CSE','Computer Science & Engg.','AI&DS','Electronics and Communication','EEE','Mtech',
                    'B.Com (Hons)','Bachelor of Business Administration','Information Technology','  cse  ']) with ordinality as x(d, ord);
  insert into c2c_stg.students (full_name, email, graduation_year, department, institution_id, is_synthetic, is_verified)
  values ('Prospect Synthetic', 'p1@spc.stg.c2c.test', 2027, 'Mechanical Engineering', v_i3, true, false);
end $fx$;

-- (run M2 here)

-- Tests: expect every outcome = 'pass'.
create temp table if not exists m_results (test text, outcome text);
truncate m_results;
do $t$
declare u uuid; t2 uuid; t1 uuid; d_cse2 uuid; d_cse1 uuid; mid uuid;
begin
  select id into u from auth.users where email = 'e2e.tpo@makeover.test';
  select tenant_id into t2 from c2c_stg.institutions where domain = 'sec.stg.c2c.test';
  select tenant_id into t1 from c2c_stg.institutions where domain = 'stg.c2c.test';
  select d.id into d_cse2 from c2c_stg.departments d join c2c_stg.institutions i on i.id = d.institution_id where i.domain = 'sec.stg.c2c.test' and d.discipline_code = 'CSE';
  select d.id into d_cse1 from c2c_stg.departments d join c2c_stg.institutions i on i.id = d.institution_id where i.domain = 'stg.c2c.test' and d.discipline_code = 'CSE';
  begin insert into c2c_stg.memberships (user_id, tenant_id, institution_id, department_id, role) select u, t2, id, d_cse2, 'tpo' from c2c_stg.institutions where domain='sec.stg.c2c.test';
    insert into m_results values ('tpo with department rejected', 'FAIL');
  exception when check_violation then insert into m_results values ('tpo with department rejected', 'pass'); end;
  begin insert into c2c_stg.memberships (user_id, tenant_id, institution_id, role) select u, t2, id, 'tenant_admin' from c2c_stg.institutions where domain='sec.stg.c2c.test';
    insert into m_results values ('tenant_admin scoped to institution rejected', 'FAIL');
  exception when check_violation then insert into m_results values ('tenant_admin scoped to institution rejected', 'pass'); end;
  begin insert into c2c_stg.memberships (user_id, tenant_id, institution_id, role) select u, t1, id, 'tpo' from c2c_stg.institutions where domain='sec.stg.c2c.test';
    insert into m_results values ('institution outside tenant rejected', 'FAIL');
  exception when raise_exception then insert into m_results values ('institution outside tenant rejected', 'pass'); end;
  begin insert into c2c_stg.memberships (user_id, tenant_id, institution_id, department_id, role) select u, t2, id, d_cse1, 'dept_coordinator' from c2c_stg.institutions where domain='sec.stg.c2c.test';
    insert into m_results values ('department from another institution rejected', 'FAIL');
  exception when raise_exception then insert into m_results values ('department from another institution rejected', 'pass'); end;
  insert into c2c_stg.memberships (user_id, tenant_id, institution_id, department_id, role) select u, t2, id, d_cse2, 'dept_coordinator' from c2c_stg.institutions where domain='sec.stg.c2c.test' returning id into mid;
  insert into m_results values ('valid dept_coordinator accepted', 'pass');
  begin insert into c2c_stg.memberships (user_id, tenant_id, institution_id, department_id, role) select u, t2, id, d_cse2, 'dept_coordinator' from c2c_stg.institutions where domain='sec.stg.c2c.test';
    insert into m_results values ('duplicate live membership rejected', 'FAIL');
  exception when unique_violation then insert into m_results values ('duplicate live membership rejected', 'pass'); end;
  update c2c_stg.memberships set status = 'revoked' where id = mid;
  insert into c2c_stg.memberships (user_id, tenant_id, institution_id, department_id, role) select u, t2, id, d_cse2, 'dept_coordinator' from c2c_stg.institutions where domain='sec.stg.c2c.test';
  insert into m_results values ('re-grant after revoke accepted', 'pass');
  insert into c2c_stg.memberships (user_id, tenant_id, role) values (u, t2, 'tenant_admin');
  insert into m_results values ('valid tenant_admin accepted', 'pass');
  delete from c2c_stg.memberships where source <> 'legacy_backfill';
end $t$;
select * from m_results;
