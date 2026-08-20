-- Migration: Fix broken webhook trigger URLs
--
-- All four Database Webhook trigger functions (webhook_assessment_completed,
-- webhook_employer_job_posted, webhook_lead_approved, webhook_student_onboarded)
-- were hardcoded to http://host.docker.internal:8011/webhook/... -- a
-- local-Docker-only hostname that is unreachable from the hosted Supabase
-- project, and the path was missing the /api prefix the FastAPI app actually
-- registers routes under (app.include_router(..., prefix="/api")). Both bugs
-- mean these triggers have been silently failing (pg_net.http_post is
-- fire-and-forget) in every real deployment since they were created.
--
-- Fix: read the target base URL from a configurable Postgres setting so it
-- still works for local Docker dev (override via
-- `ALTER DATABASE postgres SET app.settings.webhook_base_url = '...'` in a
-- local session), falling back to the real production API origin.

CREATE OR REPLACE FUNCTION public.get_webhook_base_url()
RETURNS text AS $$
  SELECT COALESCE(
    current_setting('app.settings.webhook_base_url', true),
    'https://c2c.mytestbed.tech/api'
  );
$$ LANGUAGE sql STABLE;

-- Shared secret sent as X-Webhook-Secret so the FastAPI endpoints can reject
-- forged requests (previously these accepted any anonymous POST). Configure
-- with `ALTER DATABASE postgres SET app.settings.webhook_secret = '...'` --
-- deliberately NOT set here, so the value never lands in a migration file /
-- git history. Must match the SUPABASE_WEBHOOK_SECRET env var the API reads.
CREATE OR REPLACE FUNCTION public.get_webhook_headers()
RETURNS jsonb AS $$
  SELECT jsonb_build_object(
    'Content-Type', 'application/json',
    'X-Webhook-Secret', COALESCE(current_setting('app.settings.webhook_secret', true), '')
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.webhook_assessment_completed()
RETURNS trigger AS $$
BEGIN
  PERFORM net.http_post(
      url := public.get_webhook_base_url() || '/webhook/assessment-completed',
      headers := public.get_webhook_headers(),
      body := jsonb_build_object('record', row_to_json(NEW))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.webhook_employer_job_posted()
RETURNS trigger AS $$
BEGIN
  PERFORM net.http_post(
      url := public.get_webhook_base_url() || '/webhook/job-posted',
      headers := public.get_webhook_headers(),
      body := jsonb_build_object('record', row_to_json(NEW))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.webhook_lead_approved()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'Approved' AND OLD.status != 'Approved' THEN
    PERFORM net.http_post(
        url := public.get_webhook_base_url() || '/webhook/lead-approved',
        headers := public.get_webhook_headers(),
        body := jsonb_build_object('record', row_to_json(NEW))
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.webhook_student_onboarded()
RETURNS trigger AS $$
BEGIN
  PERFORM net.http_post(
      url := public.get_webhook_base_url() || '/webhook/student-onboarded',
      headers := public.get_webhook_headers(),
      body := jsonb_build_object('record', row_to_json(NEW))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- A 5th instance of the same bug: the daily_market_sweep pg_cron job (active,
-- runs 0 6 * * *) had the same hardcoded Docker URL. cron.schedule() with an
-- existing jobname replaces that job's definition rather than duplicating it.
SELECT cron.schedule(
  'daily_market_sweep',
  '0 6 * * *',
  $$
  SELECT net.http_post(
      url := public.get_webhook_base_url() || '/webhook/daily-sweep',
      headers := public.get_webhook_headers(),
      body := '{}'::jsonb
  );
  $$
);
