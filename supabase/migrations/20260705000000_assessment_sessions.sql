-- Migration: 20260705000000_assessment_sessions.sql
-- Description: Create assessment_sessions table, enable RLS, add cooldown field to tenants, and link student to tenant.

-- 1. Add retake_cooldown_days column to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS retake_cooldown_days INT DEFAULT 90 NOT NULL;

-- 2. Add tenant_id column to students table so we can extract it from their profile/record
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(tenant_id) ON DELETE SET NULL;

-- 3. Create assessment_sessions table
CREATE TABLE IF NOT EXISTS public.assessment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(tenant_id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_question_index INT DEFAULT 0 NOT NULL,
    responses_json JSONB DEFAULT '[]'::jsonb NOT NULL,
    questions_json JSONB DEFAULT '[]'::jsonb NOT NULL,
    status VARCHAR(50) DEFAULT 'in_progress' NOT NULL CHECK (status IN ('in_progress', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Enable Row Level Security (RLS) on public.assessment_sessions
ALTER TABLE public.assessment_sessions ENABLE ROW LEVEL SECURITY;

-- 5. Apply tenant_isolation_policy on public.assessment_sessions
DROP POLICY IF EXISTS tenant_isolation_policy ON public.assessment_sessions;
CREATE POLICY tenant_isolation_policy ON public.assessment_sessions 
FOR ALL USING (tenant_id = public.get_auth_tenant_id()) 
WITH CHECK (tenant_id = public.get_auth_tenant_id());

-- 6. Attach BEFORE UPDATE trigger to assessment_sessions for updated_at tracking
DROP TRIGGER IF EXISTS tr_assessment_sessions_updated_at ON public.assessment_sessions;
CREATE TRIGGER tr_assessment_sessions_updated_at 
BEFORE UPDATE ON public.assessment_sessions 
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
