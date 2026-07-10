-- Migration: Assessment Attempts table and trigger
-- Description: Create assessment_attempts table, unique constraint on assessments, set_attempt_number trigger, and sync_latest_assessment trigger.

-- 1. Add UNIQUE constraint on assessments student_id if not present
ALTER TABLE public.assessments DROP CONSTRAINT IF EXISTS assessments_student_id_key;
ALTER TABLE public.assessments ADD CONSTRAINT assessments_student_id_key UNIQUE (student_id);

-- 2. Create assessment_attempts table
CREATE TABLE IF NOT EXISTS public.assessment_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
    dimension_scores jsonb NOT NULL,
    founder_fit jsonb NOT NULL,
    primary_profile text NOT NULL,
    development_report jsonb NOT NULL,
    tech_fit_index numeric(5,2) DEFAULT 0.0,
    sales_fit_index numeric(5,2) DEFAULT 0.0,
    attempt_number integer,
    created_at timestamptz DEFAULT now()
);

-- 3. Enable RLS on assessment_attempts
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;

-- 4. Recreate RLS policies for assessment_attempts
DROP POLICY IF EXISTS attempts_select_policy ON public.assessment_attempts;
CREATE POLICY attempts_select_policy ON public.assessment_attempts
  FOR SELECT TO authenticated
  USING (
    student_id::text = public.auth_profile_id()
    OR public.auth_role() = 'admin'
    OR public.auth_role() = 'employer'
    OR (public.auth_role() = 'institution' AND EXISTS (
      SELECT 1 FROM public.students s WHERE s.id = student_id AND s.institution_id::text = public.auth_profile_id()
    ))
  );

DROP POLICY IF EXISTS attempts_insert_policy ON public.assessment_attempts;
CREATE POLICY attempts_insert_policy ON public.assessment_attempts
  FOR INSERT TO authenticated
  WITH CHECK (student_id::text = public.auth_profile_id() OR public.auth_role() = 'admin');

DROP POLICY IF EXISTS attempts_delete_policy ON public.assessment_attempts;
CREATE POLICY attempts_delete_policy ON public.assessment_attempts
  FOR DELETE TO authenticated
  USING (public.auth_role() = 'admin');

-- 5. Trigger to auto-set attempt_number
CREATE OR REPLACE FUNCTION public.set_assessment_attempt_number()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(attempt_number), 0) + 1
  INTO NEW.attempt_number
  FROM public.assessment_attempts
  WHERE student_id = NEW.student_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_assessment_attempt_number ON public.assessment_attempts;
CREATE TRIGGER trigger_set_assessment_attempt_number
  BEFORE INSERT ON public.assessment_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_assessment_attempt_number();

-- 6. Trigger to sync latest attempt back to assessments table
CREATE OR REPLACE FUNCTION public.sync_latest_assessment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.assessments (student_id, dimension_scores, founder_fit, primary_profile, development_report, created_at, updated_at)
  VALUES (NEW.student_id, NEW.dimension_scores, NEW.founder_fit, NEW.primary_profile, NEW.development_report, NEW.created_at, NEW.created_at)
  ON CONFLICT (student_id) DO UPDATE
  SET dimension_scores = EXCLUDED.dimension_scores,
      founder_fit = EXCLUDED.founder_fit,
      primary_profile = EXCLUDED.primary_profile,
      development_report = EXCLUDED.development_report,
      updated_at = EXCLUDED.updated_at;
      
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_latest_assessment ON public.assessment_attempts;
CREATE TRIGGER trigger_sync_latest_assessment
  AFTER INSERT ON public.assessment_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_latest_assessment();
