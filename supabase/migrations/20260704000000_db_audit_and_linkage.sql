-- Migration: DB Audit and Linkage
-- Description: Link opportunities to candidates, add indexes, automate updated_at, enable RLS and set policies.

-- 1. Add candidate_id to opportunities and create index
ALTER TABLE public.opportunities
ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES public.students(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS opportunities_candidate_id_idx ON public.opportunities(candidate_id);

-- 2. Add composite index on opportunities(tenant_id, stage_id)
CREATE INDEX IF NOT EXISTS opportunities_tenant_stage_idx ON public.opportunities(tenant_id, stage_id);

-- 3. Add composite index on leads(tenant_id, status)
CREATE INDEX IF NOT EXISTS leads_tenant_status_idx ON public.leads(tenant_id, status);

-- 4. Create trigger helper function public.set_updated_at()
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Add updated_at column to mutable tables if missing
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

ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.custom_field_definitions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.custom_field_values ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.entity_tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 6. Attach BEFORE UPDATE triggers to all mutable tables
DROP TRIGGER IF EXISTS tr_students_updated_at ON public.students;
CREATE TRIGGER tr_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_institutions_updated_at ON public.institutions;
CREATE TRIGGER tr_institutions_updated_at BEFORE UPDATE ON public.institutions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_admins_updated_at ON public.admins;
CREATE TRIGGER tr_admins_updated_at BEFORE UPDATE ON public.admins FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_employers_updated_at ON public.employers;
CREATE TRIGGER tr_employers_updated_at BEFORE UPDATE ON public.employers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_job_postings_updated_at ON public.job_postings;
CREATE TRIGGER tr_job_postings_updated_at BEFORE UPDATE ON public.job_postings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_institution_whitelist_updated_at ON public.institution_whitelist;
CREATE TRIGGER tr_institution_whitelist_updated_at BEFORE UPDATE ON public.institution_whitelist FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_psychometric_items_updated_at ON public.psychometric_items;
CREATE TRIGGER tr_psychometric_items_updated_at BEFORE UPDATE ON public.psychometric_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_market_leads_updated_at ON public.market_leads;
CREATE TRIGGER tr_market_leads_updated_at BEFORE UPDATE ON public.market_leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_assessments_updated_at ON public.assessments;
CREATE TRIGGER tr_assessments_updated_at BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_assessment_responses_updated_at ON public.assessment_responses;
CREATE TRIGGER tr_assessment_responses_updated_at BEFORE UPDATE ON public.assessment_responses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_match_alerts_updated_at ON public.match_alerts;
CREATE TRIGGER tr_match_alerts_updated_at BEFORE UPDATE ON public.match_alerts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_peer_feedback_updated_at ON public.peer_feedback;
CREATE TRIGGER tr_peer_feedback_updated_at BEFORE UPDATE ON public.peer_feedback FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_applications_updated_at ON public.applications;
CREATE TRIGGER tr_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CRM tables:
DROP TRIGGER IF EXISTS tr_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER tr_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_tenants_updated_at ON public.tenants;
CREATE TRIGGER tr_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER tr_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_roles_updated_at ON public.roles;
CREATE TRIGGER tr_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_permissions_updated_at ON public.permissions;
CREATE TRIGGER tr_permissions_updated_at BEFORE UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_role_permissions_updated_at ON public.role_permissions;
CREATE TRIGGER tr_role_permissions_updated_at BEFORE UPDATE ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_crm_users_updated_at ON public.crm_users;
CREATE TRIGGER tr_crm_users_updated_at BEFORE UPDATE ON public.crm_users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_pipelines_updated_at ON public.pipelines;
CREATE TRIGGER tr_pipelines_updated_at BEFORE UPDATE ON public.pipelines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_pipeline_stages_updated_at ON public.pipeline_stages;
CREATE TRIGGER tr_pipeline_stages_updated_at BEFORE UPDATE ON public.pipeline_stages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_leads_updated_at ON public.leads;
CREATE TRIGGER tr_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_accounts_updated_at ON public.accounts;
CREATE TRIGGER tr_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_contacts_updated_at ON public.contacts;
CREATE TRIGGER tr_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_opportunities_updated_at ON public.opportunities;
CREATE TRIGGER tr_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_activities_updated_at ON public.activities;
CREATE TRIGGER tr_activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_notes_updated_at ON public.notes;
CREATE TRIGGER tr_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_programs_updated_at ON public.programs;
CREATE TRIGGER tr_programs_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_enrollments_updated_at ON public.enrollments;
CREATE TRIGGER tr_enrollments_updated_at BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_custom_field_definitions_updated_at ON public.custom_field_definitions;
CREATE TRIGGER tr_custom_field_definitions_updated_at BEFORE UPDATE ON public.custom_field_definitions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_custom_field_values_updated_at ON public.custom_field_values;
CREATE TRIGGER tr_custom_field_values_updated_at BEFORE UPDATE ON public.custom_field_values FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_tags_updated_at ON public.tags;
CREATE TRIGGER tr_tags_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_entity_tags_updated_at ON public.entity_tags;
CREATE TRIGGER tr_entity_tags_updated_at BEFORE UPDATE ON public.entity_tags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_attachments_updated_at ON public.attachments;
CREATE TRIGGER tr_attachments_updated_at BEFORE UPDATE ON public.attachments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Create RLS policy helper public.get_auth_tenant_id()
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID AS $$
    SELECT tenant_id FROM public.crm_users WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 8. Enable RLS on all database tables (36 Custom tables in public schema)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.psychometric_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 9. Enforce tenant isolation on multi-tenant CRM tables
DROP POLICY IF EXISTS tenant_isolation_policy ON public.tenants;
CREATE POLICY tenant_isolation_policy ON public.tenants FOR ALL USING (tenant_id = public.get_auth_tenant_id()) WITH CHECK (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_policy ON public.subscriptions;
CREATE POLICY tenant_isolation_policy ON public.subscriptions FOR ALL USING (tenant_id = public.get_auth_tenant_id()) WITH CHECK (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_policy ON public.roles;
CREATE POLICY tenant_isolation_policy ON public.roles FOR ALL USING (tenant_id = public.get_auth_tenant_id()) WITH CHECK (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_policy ON public.crm_users;
CREATE POLICY tenant_isolation_policy ON public.crm_users FOR ALL USING (user_id = auth.uid() OR tenant_id = public.get_auth_tenant_id()) WITH CHECK (user_id = auth.uid() OR tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_policy ON public.pipelines;
CREATE POLICY tenant_isolation_policy ON public.pipelines FOR ALL USING (tenant_id = public.get_auth_tenant_id()) WITH CHECK (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_policy ON public.pipeline_stages;
CREATE POLICY tenant_isolation_policy ON public.pipeline_stages FOR ALL USING (tenant_id = public.get_auth_tenant_id()) WITH CHECK (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_policy ON public.leads;
CREATE POLICY tenant_isolation_policy ON public.leads FOR ALL USING (tenant_id = public.get_auth_tenant_id()) WITH CHECK (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_policy ON public.accounts;
CREATE POLICY tenant_isolation_policy ON public.accounts FOR ALL USING (tenant_id = public.get_auth_tenant_id()) WITH CHECK (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_policy ON public.contacts;
CREATE POLICY tenant_isolation_policy ON public.contacts FOR ALL USING (tenant_id = public.get_auth_tenant_id()) WITH CHECK (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_policy ON public.opportunities;
CREATE POLICY tenant_isolation_policy ON public.opportunities FOR ALL USING (tenant_id = public.get_auth_tenant_id()) WITH CHECK (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_policy ON public.activities;
CREATE POLICY tenant_isolation_policy ON public.activities FOR ALL USING (tenant_id = public.get_auth_tenant_id()) WITH CHECK (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_policy ON public.notes;
CREATE POLICY tenant_isolation_policy ON public.notes FOR ALL USING (tenant_id = public.get_auth_tenant_id()) WITH CHECK (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_policy ON public.programs;
CREATE POLICY tenant_isolation_policy ON public.programs FOR ALL USING (tenant_id = public.get_auth_tenant_id()) WITH CHECK (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_policy ON public.enrollments;
CREATE POLICY tenant_isolation_policy ON public.enrollments FOR ALL USING (tenant_id = public.get_auth_tenant_id()) WITH CHECK (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_policy ON public.custom_field_definitions;
CREATE POLICY tenant_isolation_policy ON public.custom_field_definitions FOR ALL USING (tenant_id = public.get_auth_tenant_id()) WITH CHECK (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_policy ON public.custom_field_values;
CREATE POLICY tenant_isolation_policy ON public.custom_field_values FOR ALL USING (tenant_id = public.get_auth_tenant_id()) WITH CHECK (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_policy ON public.tags;
CREATE POLICY tenant_isolation_policy ON public.tags FOR ALL USING (tenant_id = public.get_auth_tenant_id()) WITH CHECK (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_policy ON public.entity_tags;
CREATE POLICY tenant_isolation_policy ON public.entity_tags FOR ALL USING (tenant_id = public.get_auth_tenant_id()) WITH CHECK (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_policy ON public.attachments;
CREATE POLICY tenant_isolation_policy ON public.attachments FOR ALL USING (tenant_id = public.get_auth_tenant_id()) WITH CHECK (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_policy ON public.audit_logs;
CREATE POLICY tenant_isolation_policy ON public.audit_logs FOR ALL USING (tenant_id = public.get_auth_tenant_id()) WITH CHECK (tenant_id = public.get_auth_tenant_id());

-- 10. Create permissive policies for remaining non-tenant base tables
DROP POLICY IF EXISTS permissive_policy ON public.students;
CREATE POLICY permissive_policy ON public.students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive_policy ON public.institutions;
CREATE POLICY permissive_policy ON public.institutions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive_policy ON public.admins;
CREATE POLICY permissive_policy ON public.admins FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive_policy ON public.employers;
CREATE POLICY permissive_policy ON public.employers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive_policy ON public.job_postings;
CREATE POLICY permissive_policy ON public.job_postings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive_policy ON public.institution_whitelist;
CREATE POLICY permissive_policy ON public.institution_whitelist FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive_policy ON public.psychometric_items;
CREATE POLICY permissive_policy ON public.psychometric_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive_policy ON public.market_leads;
CREATE POLICY permissive_policy ON public.market_leads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive_policy ON public.assessments;
CREATE POLICY permissive_policy ON public.assessments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive_policy ON public.assessment_responses;
CREATE POLICY permissive_policy ON public.assessment_responses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive_policy ON public.match_alerts;
CREATE POLICY permissive_policy ON public.match_alerts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive_policy ON public.peer_feedback;
CREATE POLICY permissive_policy ON public.peer_feedback FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive_policy ON public.applications;
CREATE POLICY permissive_policy ON public.applications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive_policy ON public.subscription_plans;
CREATE POLICY permissive_policy ON public.subscription_plans FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive_policy ON public.permissions;
CREATE POLICY permissive_policy ON public.permissions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissive_policy ON public.role_permissions;
CREATE POLICY permissive_policy ON public.role_permissions FOR ALL USING (true) WITH CHECK (true);
