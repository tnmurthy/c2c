-- N4 (2026-11-15, ADR-001): move c2c from `public` to its own schema `c2c` in the
-- shared Talia database. Zero-downtime: compatibility objects stay in `public`
-- until every client reads C2C_DB_SCHEMA=c2c; they are dropped by
-- 20261115000800_n4_drop_public_compat.sql after observation.
--
-- One transaction:
--   1. guard: no non-c2c object depends on a function being moved
--   2. ALTER TABLE ... SET SCHEMA c2c for the 50 c2c tables (+ review view);
--      data, indexes, FKs, RLS policies, triggers, grants and owned sequences move with them
--   3. move c2c's own functions; rewrite `public.<c2c object>` references to `c2c.`;
--      pin search_path = c2c, extensions
--      (generic helpers auth_role, auth_profile_id, set_updated_at stay in public:
--       other apps may use them; policies/triggers reference them by OID)
--   4. compatibility: public.<table> views (security_invoker -> caller's RLS applies)
--      and public.<rpc> wrappers delegating to c2c.<rpc>
--   5. verify, then ask PostgREST to reload its schema cache

do $n4$
declare
  tbls constant text[] := array[
    'accounts','activities','admins','ai_call_ledger','ai_settings','applications',
    'assessment_attempts','assessment_responses','assessment_sessions','assessments',
    'attachments','audit_logs','candidate_features','contacts','crm_users',
    'custom_field_definitions','custom_field_values','employers','enrollments',
    'entity_tags','institution_whitelist','institutions','job_candidate_matches',
    'job_postings','leads','market_leads','match_alerts','notes','opportunities',
    'peer_feedback','permissions','pipeline_stages','pipelines','programs',
    'psychometric_items','role_permissions','roles','students','subscription_plans',
    'subscriptions','tags','tenants',
    -- ADR-003 tenancy tables
    'disciplines','institution_domains','departments','department_aliases','cohorts',
    'memberships','tenant_employer_access','tenant_partner_links'];
  views constant text[] := array['department_mapping_review'];
  fns constant text[] := array[
    'get_auth_tenant_id','set_assessment_attempt_number','sync_latest_assessment',
    'check_whitelist_email','ai_day_start','claim_ai_call','finish_ai_call',
    'ai_spend_summary','set_ai_settings','norm_alias','map_discipline',
    'memberships_check_scope','c2c_post_webhook','webhook_assessment_completed',
    'webhook_employer_job_posted','webhook_lead_approved','webhook_student_onboarded'];
  rpc_fns constant text[] := array['check_whitelist_email','ai_spend_summary','set_ai_settings',
                                   'claim_ai_call','finish_ai_call'];
  t text; r record; def text; call_args text; n int; names text[];
begin
  perform set_config('search_path', 'pg_catalog', true);  -- deparse fully qualified

  -- 1. guard: functions to move must only serve c2c objects
  select count(*) into n
    from pg_depend d
    join pg_proc p on p.oid = d.refobjid and d.refclassid = 'pg_proc'::regclass
   where p.pronamespace = 'public'::regnamespace and p.proname = any(fns)
     and d.classid = 'pg_trigger'::regclass
     and (select c.relname from pg_trigger tg join pg_class c on c.oid = tg.tgrelid where tg.oid = d.objid) <> all(tbls);
  if n > 0 then raise exception 'N4 guard: % non-c2c trigger(s) use a c2c function', n; end if;
  select count(*) into n from pg_policies
   where not (schemaname = 'public' and tablename = any(tbls))
     and schemaname not in ('c2c_stg')
     and (coalesce(qual,'') || coalesce(with_check,'')) ~ ('\m(' || array_to_string(fns, '|') || ')\(');
  if n > 0 then raise exception 'N4 guard: % non-c2c policies use a c2c function', n; end if;

  -- 2. tables and views
  foreach t in array tbls loop
    execute format('alter table public.%I set schema c2c', t);
  end loop;
  foreach t in array views loop
    execute format('alter view public.%I set schema c2c', t);
  end loop;

  -- 3. functions: move, rewrite references, pin search_path
  names := tbls || views || fns;
  for r in select p.oid from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = any(fns) loop
    execute format('alter function %s set schema c2c', r.oid::regprocedure);
  end loop;
  -- Unqualified names inside function bodies (e.g. map_discipline -> norm_alias)
  -- must resolve to c2c while the rewritten definitions are validated.
  perform set_config('search_path', 'c2c, extensions, public', true);
  for r in select p.oid, p.proname from pg_proc p where p.pronamespace = 'c2c'::regnamespace and p.proname = any(fns) loop
    def := pg_get_functiondef(r.oid);
    foreach t in array names loop
      def := regexp_replace(def, '\mpublic\.' || t || '\M', 'c2c.' || t, 'g');
    end loop;
    -- The validator resolves names with the function's own SET search_path.
    def := regexp_replace(def, 'SET search_path TO [^\n]*', $q$SET search_path TO 'c2c', 'extensions'$q$);
    execute def;
    execute format('alter function %s set search_path = c2c, extensions', r.oid::regprocedure);
  end loop;

  perform set_config('search_path', 'pg_catalog', true);

  -- 4a. compatibility views (old deployments still query public.<table>)
  foreach t in array tbls || views loop
    execute format('create view public.%I with (security_invoker = on) as select * from c2c.%I', t, t);
    execute format('comment on view public.%I is %L', t,
                   'N4 compatibility view -> c2c.' || t || '. Dropped by 20261115000800 after cutover.');
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated, service_role', t);
  end loop;

  -- 4b. RPC wrappers (old deployments call public.<rpc>)
  for r in
    select p.oid, p.proname, pg_get_function_arguments(p.oid) as args_def,
           pg_get_function_result(p.oid) as result, p.proargnames, p.pronargs
      from pg_proc p where p.pronamespace = 'c2c'::regnamespace and p.proname = any(rpc_fns)
  loop
    select string_agg(format('%I => %I', a, a), ', ' order by i) into call_args
      from unnest(r.proargnames[1:r.pronargs]) with ordinality as x(a, i);
    execute format(
      'create function public.%I(%s) returns %s language sql security invoker set search_path = c2c, extensions as %L',
      r.proname, r.args_def, r.result,
      'select c2c.' || quote_ident(r.proname) || '(' || coalesce(call_args, '') || ')');
    execute format('comment on function public.%I(%s) is %L', r.proname,
                   pg_get_function_identity_arguments(r.oid), 'N4 compatibility wrapper -> c2c.' || r.proname);
    execute format('revoke execute on function public.%I(%s) from public, anon, authenticated',
                   r.proname, pg_get_function_identity_arguments(r.oid));
    execute format('grant execute on function public.%I(%s) to service_role',
                   r.proname, pg_get_function_identity_arguments(r.oid));
  end loop;

  -- 5. verify
  select count(*) into n from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname = any(tbls);
  if n > 0 then raise exception 'N4 verify: % c2c tables still in public', n; end if;
  select count(*) into n from pg_class c where c.relnamespace = 'c2c'::regnamespace and c.relkind = 'r' and c.relname = any(tbls);
  if n <> array_length(tbls, 1) then raise exception 'N4 verify: expected % tables in c2c, found %', array_length(tbls, 1), n; end if;
  select count(*) into n from pg_proc p where p.pronamespace = 'c2c'::regnamespace
     and pg_get_functiondef(p.oid) ~ ('\mpublic\.(' || array_to_string(tbls || fns, '|') || ')\M');
  if n > 0 then raise exception 'N4 verify: % c2c functions still reference public c2c objects', n; end if;
end
$n4$;

notify pgrst, 'reload schema';
