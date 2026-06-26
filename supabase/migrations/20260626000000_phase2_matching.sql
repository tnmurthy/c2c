-- Phase 2: Job-to-Candidate Matching + Applications
-- =====================================================

-- 1. Add role_type to job_postings for weighted matching
ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS role_type TEXT DEFAULT 'tech'
  CHECK (role_type IN ('tech', 'sales', 'ops', 'leadership'));

-- 2. Cache match scores per job (keyed by student_id -> score)
ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS match_scores JSONB DEFAULT '{}'::jsonb;

-- 3. Add job_id and score columns to match_alerts
ALTER TABLE match_alerts
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES job_postings(id) ON DELETE CASCADE;

ALTER TABLE match_alerts
  ADD COLUMN IF NOT EXISTS score FLOAT DEFAULT 0;

-- 4. Unique constraint for match_alerts on (student_id, job_id)
--    (only applies where job_id is not null)
CREATE UNIQUE INDEX IF NOT EXISTS match_alerts_student_job_unique
  ON match_alerts (student_id, job_id)
  WHERE job_id IS NOT NULL;

-- 5. Student applications table (hybrid: student expresses interest, employer shortlists)
CREATE TABLE IF NOT EXISTS applications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    job_id      UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    status      TEXT DEFAULT 'expressed_interest'
                CHECK (status IN ('expressed_interest', 'shortlisted', 'interviewing', 'offered', 'rejected')),
    applied_at  TIMESTAMP WITH TIME ZONE DEFAULT now(),
    notes       TEXT,
    UNIQUE(student_id, job_id)
);

CREATE INDEX IF NOT EXISTS applications_student_idx ON applications (student_id);
CREATE INDEX IF NOT EXISTS applications_job_idx     ON applications (job_id);

-- 6. Grant permissions
GRANT ALL PRIVILEGES ON TABLE applications TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
