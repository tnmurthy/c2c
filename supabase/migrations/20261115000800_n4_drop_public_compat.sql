-- N4 cleanup (ADR-001): drop the public compatibility objects created by
-- 20261115000700 once production, previews, GitHub Actions and local dev all run
-- with C2C_DB_SCHEMA=c2c / c2c_stg. NOT applied with the move — apply after
-- observation (check Supabase API logs for requests that still hit public.<c2c table>).

do $n4c$
declare r record;
begin
  for r in select c.relname from pg_class c
            where c.relnamespace = 'public'::regnamespace and c.relkind = 'v'
              and obj_description(c.oid) like 'N4 compatibility view%' loop
    execute format('drop view public.%I', r.relname);
  end loop;
  for r in select p.oid from pg_proc p
            where p.pronamespace = 'public'::regnamespace
              and obj_description(p.oid, 'pg_proc') like 'N4 compatibility wrapper%' loop
    execute format('drop function %s', r.oid::regprocedure);
  end loop;
end $n4c$;

notify pgrst, 'reload schema';
