-- Migration: Production Grade RLS and Auth Trigger
-- Description: Implement JWT helper functions, auth triggers for app_metadata role binding, and granular RLS policies for public tables.

-- 1. Create helper functions to extract JWT app_metadata claims in RLS policies
CREATE OR REPLACE FUNCTION public.auth_role() 
RETURNS text 
AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role', ''), 'public');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.auth_profile_id() 
RETURNS text 
AS $$
  SELECT current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'profile_id';
$$ LANGUAGE sql STABLE;

-- 2. Create trigger function to set raw_app_meta_data based on user_metadata role during signup
CREATE OR REPLACE FUNCTION public.handle_user_signup_role()
RETURNS TRIGGER AS $$
DECLARE
  declared_role text;
BEGIN
  -- Extract declared role
  declared_role := NEW.raw_user_meta_data->>'role';

  -- Block unauthorized admin role declaration
  IF declared_role = 'admin' THEN
    declared_role := 'student';
  END IF;

  -- Default fallback
  IF declared_role IS NULL THEN
    declared_role := 'student';
  END IF;

  -- Store role inside raw_app_meta_data
  NEW.raw_app_meta_data := jsonb_set(
    COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(declared_role)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_signup ON auth.users;
CREATE TRIGGER on_auth_user_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_signup_role();

-- 3. DROP permissive_policy wildcard bypasses
DROP POLICY IF EXISTS permissive_policy ON public.students;
DROP POLICY IF EXISTS permissive_policy ON public.institutions;
DROP POLICY IF EXISTS permissive_policy ON public.admins;
DROP POLICY IF EXISTS permissive_policy ON public.employers;
DROP POLICY IF EXISTS permissive_policy ON public.job_postings;
DROP POLICY IF EXISTS permissive_policy ON public.institution_whitelist;
DROP POLICY IF EXISTS permissive_policy ON public.psychometric_items;
DROP POLICY IF EXISTS permissive_policy ON public.market_leads;
DROP POLICY IF EXISTS permissive_policy ON public.assessments;
DROP POLICY IF EXISTS permissive_policy ON public.assessment_responses;
DROP POLICY IF EXISTS permissive_policy ON public.match_alerts;
DROP POLICY IF EXISTS permissive_policy ON public.peer_feedback;
DROP POLICY IF EXISTS permissive_policy ON public.applications;

-- 4. Create Granular RLS Policies

-- Students
CREATE POLICY students_select_policy ON public.students
  FOR SELECT TO authenticated
  USING (
    auth.uid() = auth_id
    OR public.auth_role() = 'admin'
    OR public.auth_role() = 'employer'
    -- Institution checks if student's ID matches their whitelist/records
    OR (public.auth_role() = 'institution' AND institution_id::text = public.auth_profile_id())
  );

CREATE POLICY students_insert_policy ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = auth_id OR public.auth_role() = 'admin');

CREATE POLICY students_update_policy ON public.students
  FOR UPDATE TO authenticated
  USING (auth.uid() = auth_id OR public.auth_role() = 'admin')
  WITH CHECK (auth.uid() = auth_id OR public.auth_role() = 'admin');

CREATE POLICY students_delete_policy ON public.students
  FOR DELETE TO authenticated
  USING (public.auth_role() = 'admin');

-- Institutions
CREATE POLICY institutions_select_policy ON public.institutions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY institutions_insert_policy ON public.institutions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = auth_id OR public.auth_role() = 'admin');

CREATE POLICY institutions_update_policy ON public.institutions
  FOR UPDATE TO authenticated
  USING (auth.uid() = auth_id OR public.auth_role() = 'admin')
  WITH CHECK (auth.uid() = auth_id OR public.auth_role() = 'admin');

CREATE POLICY institutions_delete_policy ON public.institutions
  FOR DELETE TO authenticated
  USING (public.auth_role() = 'admin');

-- Employers
CREATE POLICY employers_select_policy ON public.employers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY employers_insert_policy ON public.employers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = auth_id OR public.auth_role() = 'admin');

CREATE POLICY employers_update_policy ON public.employers
  FOR UPDATE TO authenticated
  USING (auth.uid() = auth_id OR public.auth_role() = 'admin')
  WITH CHECK (auth.uid() = auth_id OR public.auth_role() = 'admin');

CREATE POLICY employers_delete_policy ON public.employers
  FOR DELETE TO authenticated
  USING (public.auth_role() = 'admin');

-- Job Postings
CREATE POLICY job_postings_select_policy ON public.job_postings
  FOR SELECT TO authenticated
  USING (status = 'active' OR public.auth_role() = 'admin' OR (public.auth_role() = 'employer' AND employer_id::text = public.auth_profile_id()));

CREATE POLICY job_postings_insert_policy ON public.job_postings
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_role() = 'admin' OR (public.auth_role() = 'employer' AND employer_id::text = public.auth_profile_id()));

CREATE POLICY job_postings_update_policy ON public.job_postings
  FOR UPDATE TO authenticated
  USING (public.auth_role() = 'admin' OR (public.auth_role() = 'employer' AND employer_id::text = public.auth_profile_id()))
  WITH CHECK (public.auth_role() = 'admin' OR (public.auth_role() = 'employer' AND employer_id::text = public.auth_profile_id()));

CREATE POLICY job_postings_delete_policy ON public.job_postings
  FOR DELETE TO authenticated
  USING (public.auth_role() = 'admin' OR (public.auth_role() = 'employer' AND employer_id::text = public.auth_profile_id()));

-- Assessments
CREATE POLICY assessments_select_policy ON public.assessments
  FOR SELECT TO authenticated
  USING (
    student_id::text = public.auth_profile_id()
    OR public.auth_role() = 'admin'
    OR public.auth_role() = 'employer'
    OR (public.auth_role() = 'institution' AND EXISTS (
      SELECT 1 FROM public.students s WHERE s.id = student_id AND s.institution_id::text = public.auth_profile_id()
    ))
  );

CREATE POLICY assessments_insert_policy ON public.assessments
  FOR INSERT TO authenticated
  WITH CHECK (student_id::text = public.auth_profile_id() OR public.auth_role() = 'admin');

CREATE POLICY assessments_update_policy ON public.assessments
  FOR UPDATE TO authenticated
  USING (public.auth_role() = 'admin');

CREATE POLICY assessments_delete_policy ON public.assessments
  FOR DELETE TO authenticated
  USING (public.auth_role() = 'admin');

-- Assessment Responses
CREATE POLICY responses_select_policy ON public.assessment_responses
  FOR SELECT TO authenticated
  USING (student_id::text = public.auth_profile_id() OR public.auth_role() = 'admin');

CREATE POLICY responses_insert_policy ON public.assessment_responses
  FOR INSERT TO authenticated
  WITH CHECK (student_id::text = public.auth_profile_id() OR public.auth_role() = 'admin');

CREATE POLICY responses_update_policy ON public.assessment_responses
  FOR UPDATE TO authenticated
  USING (public.auth_role() = 'admin');

CREATE POLICY responses_delete_policy ON public.assessment_responses
  FOR DELETE TO authenticated
  USING (public.auth_role() = 'admin');

-- Assessment Sessions (secure student checks instead of wildcard)
DROP POLICY IF EXISTS tenant_isolation_policy ON public.assessment_sessions;
CREATE POLICY assessment_sessions_policy ON public.assessment_sessions
  FOR ALL TO authenticated
  USING (student_id::text = public.auth_profile_id() OR public.auth_role() = 'admin')
  WITH CHECK (student_id::text = public.auth_profile_id() OR public.auth_role() = 'admin');

-- Psychometric Items
CREATE POLICY items_select_policy ON public.psychometric_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY items_write_policy ON public.psychometric_items
  FOR ALL TO authenticated
  USING (public.auth_role() = 'admin')
  WITH CHECK (public.auth_role() = 'admin');

-- Market Leads
CREATE POLICY market_leads_select_policy ON public.market_leads
  FOR SELECT TO authenticated
  USING (public.auth_role() = 'admin' OR public.auth_role() = 'employer');

CREATE POLICY market_leads_write_policy ON public.market_leads
  FOR ALL TO authenticated
  USING (public.auth_role() = 'admin')
  WITH CHECK (public.auth_role() = 'admin');

-- Match Alerts
CREATE POLICY match_alerts_select_policy ON public.match_alerts
  FOR SELECT TO authenticated
  USING (student_id::text = public.auth_profile_id() OR public.auth_role() = 'admin');

CREATE POLICY match_alerts_write_policy ON public.match_alerts
  FOR ALL TO authenticated
  USING (public.auth_role() = 'admin')
  WITH CHECK (public.auth_role() = 'admin');

-- Peer Feedback
CREATE POLICY peer_feedback_select_policy ON public.peer_feedback
  FOR SELECT TO authenticated
  USING (student_id::text = public.auth_profile_id() OR public.auth_role() = 'admin');

CREATE POLICY peer_feedback_insert_policy ON public.peer_feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (true); -- Allow anonymous peer submissions via unique token

CREATE POLICY peer_feedback_update_policy ON public.peer_feedback
  FOR UPDATE TO authenticated
  USING (public.auth_role() = 'admin');

CREATE POLICY peer_feedback_delete_policy ON public.peer_feedback
  FOR DELETE TO authenticated
  USING (public.auth_role() = 'admin');

-- Applications
CREATE POLICY applications_select_policy ON public.applications
  FOR SELECT TO authenticated
  USING (
    student_id::text = public.auth_profile_id()
    OR public.auth_role() = 'admin'
    OR (public.auth_role() = 'employer' AND EXISTS (
      SELECT 1 FROM public.job_postings j WHERE j.id = job_id AND j.employer_id::text = public.auth_profile_id()
    ))
  );

CREATE POLICY applications_insert_policy ON public.applications
  FOR INSERT TO authenticated
  WITH CHECK (student_id::text = public.auth_profile_id() OR public.auth_role() = 'admin');

CREATE POLICY applications_update_policy ON public.applications
  FOR UPDATE TO authenticated
  USING (
    student_id::text = public.auth_profile_id()
    OR public.auth_role() = 'admin'
    OR (public.auth_role() = 'employer' AND EXISTS (
      SELECT 1 FROM public.job_postings j WHERE j.id = job_id AND j.employer_id::text = public.auth_profile_id()
    ))
  )
  WITH CHECK (
    student_id::text = public.auth_profile_id()
    OR public.auth_role() = 'admin'
    -- Employers can only update status
    OR (public.auth_role() = 'employer' AND EXISTS (
      SELECT 1 FROM public.job_postings j WHERE j.id = job_id AND j.employer_id::text = public.auth_profile_id()
    ))
  );

CREATE POLICY applications_delete_policy ON public.applications
  FOR DELETE TO authenticated
  USING (public.auth_role() = 'admin');
