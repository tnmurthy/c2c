-- Migration: Add updated_at trigger function and set triggers for mutable tables
-- Description: Ensures all mutable tables automatically update their updated_at timestamps on updates.

-- 1. Create the helper function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Add updated_at columns to tables currently missing them
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.employers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.institution_whitelist ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.psychometric_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.market_leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.assessment_responses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.match_alerts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.peer_feedback ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Attach BEFORE UPDATE triggers to all mutable tables

-- A. Tables that already had updated_at column:
CREATE TRIGGER tr_job_postings_updated_at BEFORE UPDATE ON public.job_postings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_tenants_updated_at BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_roles_updated_at BEFORE UPDATE ON public.roles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_crm_users_updated_at BEFORE UPDATE ON public.crm_users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_pipelines_updated_at BEFORE UPDATE ON public.pipelines
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_pipeline_stages_updated_at BEFORE UPDATE ON public.pipeline_stages
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_leads_updated_at BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_accounts_updated_at BEFORE UPDATE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_contacts_updated_at BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_opportunities_updated_at BEFORE UPDATE ON public.opportunities
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_activities_updated_at BEFORE UPDATE ON public.activities
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_programs_updated_at BEFORE UPDATE ON public.programs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_enrollments_updated_at BEFORE UPDATE ON public.enrollments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- B. Tables that were missing updated_at column (now added):
CREATE TRIGGER tr_students_updated_at BEFORE UPDATE ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_institutions_updated_at BEFORE UPDATE ON public.institutions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_admins_updated_at BEFORE UPDATE ON public.admins
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_employers_updated_at BEFORE UPDATE ON public.employers
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_institution_whitelist_updated_at BEFORE UPDATE ON public.institution_whitelist
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_psychometric_items_updated_at BEFORE UPDATE ON public.psychometric_items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_market_leads_updated_at BEFORE UPDATE ON public.market_leads
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_assessments_updated_at BEFORE UPDATE ON public.assessments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_assessment_responses_updated_at BEFORE UPDATE ON public.assessment_responses
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_match_alerts_updated_at BEFORE UPDATE ON public.match_alerts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_peer_feedback_updated_at BEFORE UPDATE ON public.peer_feedback
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tr_applications_updated_at BEFORE UPDATE ON public.applications
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
