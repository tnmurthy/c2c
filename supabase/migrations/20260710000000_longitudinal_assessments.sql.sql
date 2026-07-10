-- supabase/migrations/20260710000000_longitudinal_assessments.sql

-- 1. Append-only history table
CREATE TABLE IF NOT EXISTS assessment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL,
    dimension_scores JSONB NOT NULL,
    founder_fit JSONB,
    primary_profile TEXT,
    development_report JSONB,
    tech_fit_index NUMERIC,
    sales_fit_index NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(student_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS assessment_attempts_student_idx
    ON assessment_attempts (student_id, created_at DESC);

-- 2. Auto-increment attempt_number per student (avoids round-trip to compute it client-side)
CREATE OR REPLACE FUNCTION set_attempt_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    SELECT COALESCE(MAX(attempt_number), 0) + 1
    INTO NEW.attempt_number
    FROM public.assessment_attempts
    WHERE student_id = NEW.student_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_attempt_number
BEFORE INSERT ON assessment_attempts
FOR EACH ROW
WHEN (NEW.attempt_number IS NULL)
EXECUTE FUNCTION set_attempt_number();

-- 3. Compatibility view: existing frontend code (dashboard `.select('*, assessments(*)')`)
--    keeps working unchanged, always sees latest attempt only
CREATE OR REPLACE VIEW assessments WITH (security_invoker = true) AS
SELECT DISTINCT ON (student_id)
    id, student_id, dimension_scores, founder_fit, primary_profile,
    development_report, tech_fit_index, sales_fit_index, created_at
FROM assessment_attempts
ORDER BY student_id, attempt_number DESC;

-- 4. RLS on the real table (view inherits via security_invoker)
ALTER TABLE assessment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student reads own attempts"
ON assessment_attempts FOR SELECT
TO authenticated
USING (student_id IN (
    SELECT id FROM students WHERE auth_id = (SELECT auth.uid())
));

CREATE POLICY "Student inserts own attempts"
ON assessment_attempts FOR INSERT
TO authenticated
WITH CHECK (student_id IN (
    SELECT id FROM students WHERE auth_id = (SELECT auth.uid())
));

-- Institutions need read access for cohort analytics — add per your existing whitelist pattern
CREATE POLICY "Institution reads cohort attempts"
ON assessment_attempts FOR SELECT
TO authenticated
USING (student_id IN (
    SELECT s.id FROM students s
    JOIN institutions i ON s.institution_id = i.id
    WHERE i.auth_id = (SELECT auth.uid())
));