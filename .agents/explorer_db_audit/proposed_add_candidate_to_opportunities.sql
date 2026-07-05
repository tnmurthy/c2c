-- Migration: Add candidate_id to opportunities
-- Description: Link CRM opportunities directly to candidates (students) for talent matching.

-- 1. Add the column candidate_id referencing public.students(id)
ALTER TABLE public.opportunities
ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES public.students(id) ON DELETE SET NULL;

-- 2. Add index on foreign key for performance (aligned with Supabase Postgres Best Practices)
CREATE INDEX IF NOT EXISTS opportunities_candidate_id_idx ON public.opportunities(candidate_id);
