-- GO_LIVE B5/B6: database webhooks that work in production, and lock down
-- SECURITY DEFINER functions that anonymous callers could execute.
--
-- The triggers used to post to http://host.docker.internal:8011/webhook/* —
-- unreachable from production and missing the /api prefix. They now read the
-- target and the shared secret from Supabase Vault:
--   c2c_webhook_base_url  e.g. https://c2c.mytestbed.tech/api   (local: http://host.docker.internal:8011/api)
--   c2c_webhook_secret    same value as SUPABASE_WEBHOOK_SECRET on the backend
-- If either is missing the trigger posts nothing, so webhooks stay off until
-- both are set deliberately.

create or replace function public.c2c_post_webhook(p_path text, p_body jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  base_url text;
  secret text;
begin
  select decrypted_secret into base_url from vault.decrypted_secrets where name = 'c2c_webhook_base_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'c2c_webhook_secret';
  if base_url is null or secret is null then
    return;
  end if;
  perform net.http_post(
    url := rtrim(base_url, '/') || p_path,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', secret),
    body := p_body
  );
end;
$$;

create or replace function public.webhook_student_onboarded()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.c2c_post_webhook('/webhook/student-onboarded', jsonb_build_object('record', jsonb_build_object('id', new.id)));
  return new;
end;
$$;

create or replace function public.webhook_assessment_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.c2c_post_webhook('/webhook/assessment-completed',
    jsonb_build_object('record', jsonb_build_object('id', new.id, 'student_id', new.student_id)));
  return new;
end;
$$;

create or replace function public.webhook_employer_job_posted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.c2c_post_webhook('/webhook/job-posted', jsonb_build_object('record', jsonb_build_object('id', new.id)));
  return new;
end;
$$;

create or replace function public.webhook_lead_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'Approved' and old.status is distinct from 'Approved' then
    perform public.c2c_post_webhook('/webhook/lead-approved',
      jsonb_build_object('record', jsonb_build_object('id', new.id, 'url', new.url)));
  end if;
  return new;
end;
$$;

-- Trigger functions need no EXECUTE grant to fire; no caller should run them directly.
revoke execute on function public.c2c_post_webhook(text, jsonb) from public, anon, authenticated;
revoke execute on function public.webhook_student_onboarded() from public, anon, authenticated;
revoke execute on function public.webhook_assessment_completed() from public, anon, authenticated;
revoke execute on function public.webhook_employer_job_posted() from public, anon, authenticated;
revoke execute on function public.webhook_lead_approved() from public, anon, authenticated;
revoke execute on function public.handle_user_signup_role() from public, anon, authenticated;
-- Called only by the backend with the service role (student onboarding).
revoke execute on function public.check_whitelist_email(bigint, text) from public, anon, authenticated;
grant execute on function public.check_whitelist_email(bigint, text) to service_role;
-- get_auth_tenant_id stays executable: 20 RLS policies call it for the current
-- user, and it only returns that user's own tenant (null for anon).

-- Advisor: mutable search_path on our own helper.
alter function public.ai_day_start() set search_path = public;
