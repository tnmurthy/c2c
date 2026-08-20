-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.market_leads (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  url text NOT NULL UNIQUE,
  name text,
  company text,
  source text,
  date_found date,
  ai_score integer,
  ai_summary text,
  ai_notes text,
  status text DEFAULT 'New'::text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT market_leads_pkey PRIMARY KEY (id)
);
CREATE TABLE public.institutions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  type text,
  domain text NOT NULL UNIQUE,
  location text,
  auth_id uuid UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT institutions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.institution_whitelist (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  institution_id bigint NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT institution_whitelist_pkey PRIMARY KEY (id),
  CONSTRAINT institution_whitelist_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id)
);
CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  graduation_year integer NOT NULL,
  department text NOT NULL,
  auth_id uuid UNIQUE,
  institution_id bigint,
  resume_url text,
  skills jsonb DEFAULT '[]'::jsonb,
  bio text,
  phone text,
  linkedin_url text,
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id)
);
CREATE TABLE public.employers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE,
  company_name text NOT NULL,
  industry text,
  contact_person text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT employers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.job_postings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employer_id uuid,
  title text NOT NULL,
  description text NOT NULL,
  requirements jsonb DEFAULT '[]'::jsonb,
  location text,
  is_remote boolean DEFAULT false,
  salary_range text,
  status text DEFAULT 'active'::text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  role_type text DEFAULT 'tech'::text CHECK (role_type = ANY (ARRAY['tech'::text, 'sales'::text, 'ops'::text, 'leadership'::text])),
  match_scores jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT job_postings_pkey PRIMARY KEY (id),
  CONSTRAINT job_postings_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.employers(id)
);
CREATE TABLE public.assessments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  student_id uuid NOT NULL,
  dimension_scores jsonb NOT NULL,
  founder_fit jsonb NOT NULL,
  primary_profile text NOT NULL,
  development_report jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT assessments_pkey PRIMARY KEY (id),
  CONSTRAINT assessments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);
CREATE TABLE public.psychometric_items (
  id text NOT NULL,
  stem text NOT NULL,
  item_type text NOT NULL,
  primary_dimension text NOT NULL,
  secondary_dimensions ARRAY,
  tags ARRAY,
  intended_audience text,
  options jsonb,
  scoring_logic jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT psychometric_items_pkey PRIMARY KEY (id)
);
CREATE TABLE public.assessment_responses (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  student_id uuid NOT NULL,
  assessment_id bigint,
  question_id text,
  response text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT assessment_responses_pkey PRIMARY KEY (id),
  CONSTRAINT assessment_responses_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT assessment_responses_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id),
  CONSTRAINT assessment_responses_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.psychometric_items(id)
);
CREATE TABLE public.match_alerts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  student_id text NOT NULL,
  lead_url text NOT NULL,
  score integer,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  job_id uuid,
  CONSTRAINT match_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT match_alerts_lead_url_fkey FOREIGN KEY (lead_url) REFERENCES public.market_leads(url),
  CONSTRAINT match_alerts_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_postings(id)
);
CREATE TABLE public.peer_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  reviewer_email text NOT NULL,
  reviewer_role text,
  dimension_scores jsonb NOT NULL,
  feedback_text text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT peer_feedback_pkey PRIMARY KEY (id),
  CONSTRAINT peer_feedback_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);
CREATE TABLE public.applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  job_id uuid NOT NULL,
  status text DEFAULT 'expressed_interest'::text CHECK (status = ANY (ARRAY['expressed_interest'::text, 'shortlisted'::text, 'interviewing'::text, 'offered'::text, 'rejected'::text])),
  applied_at timestamp with time zone DEFAULT now(),
  notes text,
  CONSTRAINT applications_pkey PRIMARY KEY (id),
  CONSTRAINT applications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_postings(id)
);