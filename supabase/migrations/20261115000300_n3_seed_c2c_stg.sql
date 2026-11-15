-- N3 seed (2026-11-15, ADR-001): minimal staging data in c2c_stg.
-- Reference/config copied from production (no personal data): psychometric item
-- bank, AI settings, subscription plans, permissions. Plus one staging tenant,
-- one staging institution on stg.c2c.test and 20 synthetic students.
-- Re-runnable after 20261115000200 (which empties c2c_stg).

insert into c2c_stg.psychometric_items select * from public.psychometric_items;
insert into c2c_stg.ai_settings        select * from public.ai_settings;
insert into c2c_stg.subscription_plans select * from public.subscription_plans;
insert into c2c_stg.permissions        select * from public.permissions;

do $seed$
declare
  v_tenant uuid;
  v_inst bigint;
  depts text[] := array['Computer Science & Engineering','Electronics & Communication Engineering',
                        'Mechanical Engineering','Information Technology','MBA'];
begin
  insert into c2c_stg.tenants (name, slug) values ('c2c Staging University', 'c2c-stg')
  returning tenant_id into v_tenant;

  insert into c2c_stg.institutions (name, type, domain, location)
  values ('Staging Institute of Technology', 'Engineering', 'stg.c2c.test', 'Hyderabad')
  returning id into v_inst;

  insert into c2c_stg.students (full_name, email, graduation_year, department, institution_id,
                                tenant_id, skills, is_verified, is_synthetic)
  select format('Staging Student %s', lpad(g::text, 2, '0')),
         format('student%s@stg.c2c.test', lpad(g::text, 2, '0')),
         2026 + (g % 2),
         depts[1 + (g % array_length(depts, 1))],
         v_inst, v_tenant,
         '["Python","SQL","Communication"]'::jsonb,
         false, true
  from generate_series(1, 20) g;
end
$seed$;
