-- N3 (2026-11-15, ADR-001): build the c2c staging schema c2c_stg as a structural
-- clone of c2c's 42 tables in public. Structure only — no production data.
--
-- Cloned: tables (columns, defaults, checks, indexes, identity), primary/unique/
-- foreign keys (re-pointed to c2c_stg), RLS + policies, non-webhook triggers,
-- and the helper functions the policies, triggers and app RPCs use.
-- NOT cloned: webhook triggers/functions (staging must never call production
-- webhooks), data. Seed data: 20261115000300_n3_seed_c2c_stg.sql.
--
-- Re-runnable to refresh staging: drops and rebuilds c2c_stg objects only.
-- Hard-wired to the c2c_stg schema; it can never touch public or c2c.

do $n3$
declare
  src constant text := 'public';
  dst constant text := 'c2c_stg';
  c2c_tables constant text[] := array[
    'accounts','activities','admins','ai_call_ledger','ai_settings','applications',
    'assessment_attempts','assessment_responses','assessment_sessions','assessments',
    'attachments','audit_logs','candidate_features','contacts','crm_users',
    'custom_field_definitions','custom_field_values','employers','enrollments',
    'entity_tags','institution_whitelist','institutions','job_candidate_matches',
    'job_postings','leads','market_leads','match_alerts','notes','opportunities',
    'peer_feedback','permissions','pipeline_stages','pipelines','programs',
    'psychometric_items','role_permissions','roles','students','subscription_plans',
    'subscriptions','tags','tenants'];
  c2c_functions constant text[] := array[
    'auth_role','auth_profile_id','get_auth_tenant_id','set_updated_at',
    'set_assessment_attempt_number','sync_latest_assessment','check_whitelist_email',
    'ai_day_start','claim_ai_call','ai_spend_summary','set_ai_settings'];
  rls_helpers constant text[] := array['auth_role','auth_profile_id','get_auth_tenant_id'];
  t text; r record; def text; n_tables int := 0; n_fks int := 0; n_pol int := 0; n_trg int := 0; n_fn int := 0;
begin
  if dst <> 'c2c_stg' then raise exception 'N3 may only build c2c_stg'; end if;
  -- Deparse fully qualified (public.x) so rewriting to c2c_stg is exact.
  perform set_config('search_path', 'pg_catalog', true);

  -- 0. reset staging (refresh support)
  for r in select c.relname from pg_class c where c.relnamespace = dst::regnamespace and c.relkind in ('r','p') loop
    execute format('drop table if exists %I.%I cascade', dst, r.relname);
  end loop;
  for r in select p.oid::regprocedure as sig from pg_proc p where p.pronamespace = dst::regnamespace loop
    execute format('drop function if exists %s cascade', r.sig);
  end loop;
  for r in select c.relname from pg_class c where c.relnamespace = dst::regnamespace and c.relkind = 'S' loop
    execute format('drop sequence if exists %I.%I cascade', dst, r.relname);
  end loop;

  -- 1. sequences used by column defaults
  execute format('create sequence %I.ai_call_ledger_id_seq', dst);

  -- 2. tables (structure, defaults, checks, indexes, identity; no FKs yet)
  foreach t in array c2c_tables loop
    execute format('create table %I.%I (like %I.%I including all)', dst, t, src, t);
    execute format('alter table %I.%I enable row level security', dst, t);
    n_tables := n_tables + 1;
  end loop;
  execute format($q$alter table %1$I.ai_call_ledger alter column id set default nextval('%1$s.ai_call_ledger_id_seq')$q$, dst);
  execute format('alter sequence %1$I.ai_call_ledger_id_seq owned by %1$I.ai_call_ledger.id', dst);

  -- 3. foreign keys, re-pointed at c2c_stg when the target is a c2c table
  for r in
    select c.relname, k.conname, pg_get_constraintdef(k.oid) as cdef
    from pg_constraint k join pg_class c on c.oid = k.conrelid
    where c.relnamespace = src::regnamespace and c.relname = any(c2c_tables) and k.contype = 'f'
  loop
    def := r.cdef;
    foreach t in array c2c_tables loop
      def := regexp_replace(def, 'REFERENCES public\.' || t || '\(', 'REFERENCES ' || dst || '.' || t || '(', 'g');
    end loop;
    if def ~ 'REFERENCES public\.' then
      raise exception 'N3: FK %.% references a non-c2c public table: %', r.relname, r.conname, def;
    end if;
    execute format('alter table %I.%I add constraint %I %s', dst, r.relname, r.conname, def);
    n_fks := n_fks + 1;
  end loop;

  -- 4. functions (after tables: SQL functions are validated against them; before policies/triggers)
  for r in
    select p.oid, p.proname, pg_get_functiondef(p.oid) as fdef
    from pg_proc p where p.pronamespace = src::regnamespace and p.proname = any(c2c_functions)
  loop
    def := replace(r.fdef, 'public.', dst || '.');
    def := replace(def, $q$SET search_path TO 'public'$q$, format($q$SET search_path TO '%s'$q$, dst));
    -- SECURITY DEFINER without a pinned search_path is unsafe; pin it in the copy.
    if def ~ 'SECURITY DEFINER' and def !~ 'SET search_path' then
      def := regexp_replace(def, 'SECURITY DEFINER', format($q$SECURITY DEFINER SET search_path TO '%s'$q$, dst));
    end if;
    execute def;
    n_fn := n_fn + 1;
  end loop;

  -- 5. RLS policies (qual/with_check rewritten to c2c_stg functions/tables)
  for r in
    select * from pg_policies where schemaname = src and tablename = any(c2c_tables)
  loop
    execute format('create policy %I on %I.%I as %s for %s to %s%s%s',
      r.policyname, dst, r.tablename, r.permissive, r.cmd,
      array_to_string(array(select quote_ident(x) from unnest(r.roles) x), ', '),
      case when r.qual is not null then ' using (' || replace(r.qual, 'public.', dst || '.') || ')' else '' end,
      case when r.with_check is not null then ' with check (' || replace(r.with_check, 'public.', dst || '.') || ')' else '' end);
    n_pol := n_pol + 1;
  end loop;

  -- 6. triggers, except webhooks to production
  for r in
    select c.relname, t2.tgname, pg_get_triggerdef(t2.oid) as tdef, p.proname
    from pg_trigger t2 join pg_class c on c.oid = t2.tgrelid join pg_proc p on p.oid = t2.tgfoid
    where c.relnamespace = src::regnamespace and c.relname = any(c2c_tables)
      and not t2.tgisinternal and p.proname not like 'webhook\_%'
  loop
    if not (r.proname = any(c2c_functions)) then
      raise exception 'N3: trigger %.% uses uncloned function %', r.relname, r.tgname, r.proname;
    end if;
    execute replace(r.tdef, 'public.', dst || '.');
    n_trg := n_trg + 1;
  end loop;

  -- 7. grants: RLS helpers run as the caller, so API roles need EXECUTE on them
  foreach t in array rls_helpers loop
    execute format('grant execute on function %I.%I() to anon, authenticated, service_role', dst, t);
  end loop;
  execute format('grant all on all tables in schema %I to anon, authenticated, service_role', dst);
  execute format('grant all on all sequences in schema %I to anon, authenticated, service_role', dst);
  execute format('grant execute on all functions in schema %I to service_role', dst);

  raise notice 'N3 c2c_stg built: % tables, % FKs, % policies, % triggers, % functions', n_tables, n_fks, n_pol, n_trg, n_fn;
end
$n3$;
