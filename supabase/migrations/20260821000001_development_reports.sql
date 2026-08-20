-- Migration: development_reports table
--
-- Backs the async agent-recruiters pipeline (Psychologist/Narratologist
-- agents via C2C_Orchestrator_V2, run from run_agent_recruiters() after the
-- assessment-completed webhook fires). This is distinct from
-- assessment_attempts.development_report (a jsonb column populated
-- synchronously and deterministically at submission time by
-- generate_development_report() -- see api/routers/assessment/common.py).
-- development_reports holds the slower, richer agent-generated output that
-- arrives after the fact; the student dashboard already has a realtime
-- subscription on this table name (src/app/(main)/dashboard/[id]/page.tsx)
-- from earlier work, which had nothing to listen to until this table existed.

CREATE TABLE IF NOT EXISTS public.development_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
    attempt_id uuid REFERENCES public.assessment_attempts(id) ON DELETE SET NULL,
    profile_summary text,
    actionable_feedback jsonb DEFAULT '[]'::jsonb,
    ordeal_status text,
    evidence_scores jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS development_reports_student_id_idx ON public.development_reports(student_id);

ALTER TABLE public.development_reports ENABLE ROW LEVEL SECURITY;

-- Mirrors the assessment_attempts RLS policies (same visibility rules:
-- owning student, admin, employer, or the student's institution).
DROP POLICY IF EXISTS development_reports_select_policy ON public.development_reports;
CREATE POLICY development_reports_select_policy ON public.development_reports
  FOR SELECT TO authenticated
  USING (
    student_id::text = public.auth_profile_id()
    OR public.auth_role() = 'admin'
    OR public.auth_role() = 'employer'
    OR (public.auth_role() = 'institution' AND EXISTS (
      SELECT 1 FROM public.students s WHERE s.id = student_id AND s.institution_id::text = public.auth_profile_id()
    ))
  );

-- Only the backend (service-role client, bypasses RLS) writes to this table
-- via run_agent_recruiters(), so no INSERT/UPDATE policy is granted to any
-- authenticated role -- this table is backend-write, user-read only.

-- The supabase_realtime publication has puballtables=false and, until now,
-- contained zero tables -- meaning every `supabase.channel(...).on('postgres_
-- changes', ...)` subscription in the frontend (dashboard/[id]/page.tsx:
-- applications, leads, development_reports; tpo-dashboard/[id]/page.tsx:
-- students, applications, assessments) has never actually delivered a live
-- update in any real deployment; the UI only ever updated on next page load.
-- Add every table the frontend currently subscribes to.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'development_reports') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.development_reports;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'applications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'leads') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'students') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'assessments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.assessments;
  END IF;
END $$;
