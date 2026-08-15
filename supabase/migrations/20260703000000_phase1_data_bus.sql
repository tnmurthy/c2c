create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Trigger 1: student_onboarded
create or replace function public.webhook_student_onboarded()
returns trigger as $$
begin
  perform net.http_post(
      url:='http://host.docker.internal:8011/webhook/student-onboarded',
      headers:='{"Content-Type": "application/json"}'::jsonb,
      body:=jsonb_build_object('record', row_to_json(NEW))
  );
  return NEW;
end;
$$ language plpgsql security definer;

create trigger trigger_student_onboarded
  after insert on public.students
  for each row execute function public.webhook_student_onboarded();

-- Trigger 2: assessment_completed
create or replace function public.webhook_assessment_completed()
returns trigger as $$
begin
  perform net.http_post(
      url:='http://host.docker.internal:8011/webhook/assessment-completed',
      headers:='{"Content-Type": "application/json"}'::jsonb,
      body:=jsonb_build_object('record', row_to_json(NEW))
  );
  return NEW;
end;
$$ language plpgsql security definer;

create trigger trigger_assessment_completed
  after insert on public.assessments
  for each row execute function public.webhook_assessment_completed();

-- Trigger 3: employer_job_posted
create or replace function public.webhook_employer_job_posted()
returns trigger as $$
begin
  perform net.http_post(
      url:='http://host.docker.internal:8011/webhook/job-posted',
      headers:='{"Content-Type": "application/json"}'::jsonb,
      body:=jsonb_build_object('record', row_to_json(NEW))
  );
  return NEW;
end;
$$ language plpgsql security definer;

create trigger trigger_employer_job_posted
  after insert on public.job_postings
  for each row execute function public.webhook_employer_job_posted();

-- Trigger 4: lead_approved_by_student (after update on market_leads)
create or replace function public.webhook_lead_approved()
returns trigger as $$
begin
  if NEW.status = 'Approved' and OLD.status != 'Approved' then
    perform net.http_post(
        url:='http://host.docker.internal:8011/webhook/lead-approved',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:=jsonb_build_object('record', row_to_json(NEW))
    );
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger trigger_lead_approved
  after update on public.market_leads
  for each row execute function public.webhook_lead_approved();

-- Cron job: daily_market_sweep
select cron.schedule(
  'daily_market_sweep',
  '0 6 * * *',
  $$
  select net.http_post(
      url:='http://host.docker.internal:8011/webhook/daily-sweep',
      headers:='{"Content-Type": "application/json"}'::jsonb,
      body:='{}'::jsonb
  );
  $$
);
