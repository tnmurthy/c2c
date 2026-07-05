# DB Audit & Codebase Handoff Report - explorer_db_audit

## 1. Observation

### A. List of Database Tables
Based on the SQL migration scripts in `supabase/migrations/` (specifically `db-schema.sql`, `20240617000000_create_missing_tables.sql`, and `20260703000001_c2c_crm_schema.sql`), we identified a total of 37 tables split into base talent platform tables and CRM multi-tenant tables:

#### 1. Base Talent Platform Tables (Mostly defined in `db-schema.sql`)
*   `public.students` — Student/candidate profiles (names, emails, resume, LinkedIn, departments, verification).
*   `public.institutions` — Educational institutions/TPOs (names, domains, locations, auth references).
*   `public.admins` — Platform admin users (id, auth_id, name, email).
*   `public.employers` — Employers registered in the platform (company names, contact persons).
*   `public.job_postings` — Job postings created by employers (descriptions, remote status, match scores).
*   `public.institution_whitelist` — Whitelisted student email domains for automatic institution verification.
*   `public.assessments` — Cached psychometric and founder fit scores for students.
*   `public.psychometric_items` — Core psychometric assessment questions/options.
*   `public.assessment_responses` — Student answers to individual psychometric questions.
*   `public.match_alerts` — Matches detected between candidates and job postings/market leads.
*   `public.peer_feedback` — Peer reviews and evaluations of students.
*   `public.applications` — Job applications submitted by students.
*   `public.market_leads` — Scraped or discovered job market opportunities.

#### 2. CRM Multi-tenant Tables (Defined in `20260703000001_c2c_crm_schema.sql`)
*   `public.subscription_plans` — SaaS subscription plans and tier limits.
*   `public.tenants` — Separate organizations/agencies using the CRM.
*   `public.subscriptions` — Subscriptions mapping tenants to subscription plans.
*   `public.roles` — Custom security roles defined within a tenant.
*   `public.permissions` — System security permissions.
*   `public.role_permissions` — Many-to-many join mapping permissions to roles.
*   `public.crm_users` — Users belonging to a CRM tenant.
*   `public.pipelines` — Pipeline funnels (sales/recruiting).
*   `public.pipeline_stages` — Stages within a pipeline.
*   `public.leads` — Tenant sales/recruiting leads (independent of `market_leads`).
*   `public.accounts` — Tenant accounts/companies.
*   `public.contacts` — Contacts associated with accounts.
*   `public.opportunities` — Sales/recruiting deals/opportunities.
*   `public.activities` — Tasks, calls, or events logged under CRM entities.
*   `public.notes` — Pinned notes attached to CRM entities.
*   `public.programs` — Academic or training programs.
*   `public.enrollments` — Association mapping contacts to programs.
*   `public.custom_field_definitions` — Definitions of custom attributes on CRM tables.
*   `public.custom_field_values` — Values stored for custom fields.
*   `public.tags` — Category tags defined by a tenant.
*   `public.entity_tags` — Many-to-many join mapping tags to CRM records.
*   `public.attachments` — File uploads associated with CRM records.
*   `public.audit_logs` — Activity tracking logs for compliance.

---

### B. Row Level Security (RLS) Status & tenant_id Enforcement
*   **Only ONE table has RLS enabled:** `public.institution_whitelist` in `20260618000003_tpo_verification.sql` lines 20-39:
    ```sql
    ALTER TABLE institution_whitelist ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Institution can read own whitelist" 
    ON institution_whitelist FOR SELECT 
    USING (institution_id IN (
        SELECT id FROM institutions WHERE auth_id = auth.uid()
    ));
    ...
    ```
*   **Disabled / Commented Out:** The `employers` table has RLS commented out in `20240618000000_create_employers.sql` line 15:
    ```sql
    -- ALTER TABLE employers ENABLE ROW LEVEL SECURITY;
    ```
*   **No RLS on CRM tables:** Despite 20 CRM tables containing a `tenant_id UUID REFERENCES tenants(tenant_id)` foreign key constraint (such as `opportunities`, `crm_users`, `contacts`, `accounts`, etc.), **RLS is NOT enabled on any CRM table**. Consequently, no database-level `tenant_id` isolation policies are currently active. Tenant isolation is completely handled in application-level queries (e.g., `.eq('tenant_id', currentTenantId)`).

---

### C. updated_at Columns & Triggers Audit
*   **No tables have updated_at triggers:** There are no `CREATE TRIGGER` statements or PL/pgSQL helper functions in the entire migration suite relating to `updated_at` modification.
*   **Tables WITH updated_at columns (but missing triggers):**
    *   `job_postings`
    *   `subscription_plans`
    *   `tenants`
    *   `subscriptions`
    *   `roles`
    *   `crm_users`
    *   `pipelines`
    *   `pipeline_stages`
    *   `leads`
    *   `accounts`
    *   `contacts`
    *   `opportunities`
    *   `activities`
    *   `programs`
    *   `enrollments`
    *   *These tables have an `updated_at` column in their definition, but updates must be manually supplied by application queries. They do not update automatically on database modifications.*
*   **Tables MISSING both updated_at columns AND triggers:**
    *   `students`, `institutions`, `admins`, `employers`, `institution_whitelist`, `psychometric_items`, `market_leads`, `assessments`, `assessment_responses`, `match_alerts`, `peer_feedback`, `applications`, `notes`, `custom_field_definitions`, `custom_field_values`, `tags`, `entity_tags`, `attachments`, `audit_logs`.
    *   *Note: `audit_logs` is append-only, but other mutable tables like `students`, `employers`, and `applications` should track update timestamps.*

---

### D. Table Modeling for 'students' and 'opportunities'
Verbatim structures from migrations:

#### 1. `public.students` (from `db-schema.sql` lines 36-53):
```sql
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
```

#### 2. `public.opportunities` (from `20260703000001_c2c_crm_schema.sql` lines 168-185):
```sql
CREATE TABLE IF NOT EXISTS opportunities (
    opportunity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(account_id) ON DELETE CASCADE,
    primary_contact_id UUID REFERENCES contacts(contact_id) ON DELETE SET NULL,
    owner_id UUID REFERENCES crm_users(user_id),
    name VARCHAR(255) NOT NULL,
    pipeline_id UUID REFERENCES pipelines(pipeline_id),
    stage_id UUID REFERENCES pipeline_stages(stage_id),
    amount NUMERIC(15, 2),
    currency VARCHAR(10),
    probability INT,
    expected_close_date DATE,
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### E. Frontend Code Audit: Mock Array Indexing
In `src/app/crm/opportunities/page.tsx` (lines 194-198), we observed:
```typescript
        // Map account array to single object if Supabase returns array for 1:N relations
        const mappedOpps = (oppsData || []).map((opp: any, idx: number) => ({
          ...opp,
          accounts: Array.isArray(opp.accounts) ? opp.accounts[0] : opp.accounts,
          candidate: candidatesData.length > 0 ? candidatesData[idx % candidatesData.length] : undefined
        }));
```
*   **Problem:** The candidate displayed on the deal card is randomly assigned by picking a candidate from `candidatesData` at index `idx % candidatesData.length` (where `idx` is the iteration index of the loaded opportunities list).
*   **Resolution:** An actual database relationship `candidate_id` must be queried and mapped using `candidatesData.find(c => c.id === opp.candidate_id)`.

---

### F. Written Proposal Files in Working Directory
*   `C:\tt-ai-stack\01_projects\makeover-talent-agency\.agents\explorer_db_audit\proposed_add_candidate_to_opportunities.sql` — SQL migration scripts adding the foreign key relation and index.
*   `C:\tt-ai-stack\01_projects\makeover-talent-agency\.agents\explorer_db_audit\proposed_add_updated_at_triggers.sql` — SQL script adding default triggers and missing `updated_at` columns.
*   `C:\tt-ai-stack\01_projects\makeover-talent-agency\.agents\explorer_db_audit\proposed_opportunities_page.tsx` — Complete, refactored React page using actual candidate selection and relationship fetching.

---

## 2. Logic Chain

1.  **Observation**: The frontend code in `src/app/crm/opportunities/page.tsx` performs mock modulo-mapping `candidatesData[idx % candidatesData.length]` to link opportunities to candidates.
2.  **Inference**: This exists because there is no column in `opportunities` representing the associated student/candidate ID.
3.  **Observation**: The database tables `students` and `opportunities` both use `UUID` keys.
4.  **Inference**: A foreign key `candidate_id UUID REFERENCES public.students(id)` on `opportunities` is the natural way to model this relationship.
5.  **Observation**: Supabase does not automatically index foreign keys, leading to slow sequential scans on joins and deletes.
6.  **Inference**: An index `opportunities_candidate_id_idx` is required to optimize reads and performance.
7.  **Observation**: The frontend page queries `/api/crm/candidates` which correctly fetches all students joined with their latest psychometric assessment results (archetypes, IQ, EQ, etc.).
8.  **Inference**: By updating the client-side Supabase query on `opportunities` to select `candidate_id`, we can use `candidatesData.find(c => c.id === opp.candidate_id)` to replace the mock modulo mapping, rendering the actual candidate's real data.
9.  **Observation**: The creation form in the drawer lacks candidate input fields.
10. **Inference**: We must store `candidatesData` in component state (`candidates`) and expose a dropdown select element in the SlideOutDrawer form so users can link a candidate when creating a deal.
11. **Observation**: None of the 15 tables with `updated_at` columns have automatic database-level triggers to update those fields.
12. **Inference**: A PL/pgSQL function and triggers must be created and attached to automate `updated_at` management across all mutable tables.

---

## 3. Caveats

*   **Mock Candidates API**: The `/api/crm/candidates` backend route fetches *all* students and maps their latest assessment. While this is sufficient for a demo/MVP, in production with large datasets, this endpoint must support pagination, and the opportunities page should query candidates individually or via direct DB joins to prevent context bloating.
*   **Cascade Constraints**: We assumed `ON DELETE SET NULL` for the `candidate_id` foreign key. This ensures deleting a student doesn't delete historical opportunity records.
*   **Row Level Security**: Enabling RLS database-wide is critical for multi-tenant isolation, but it requires configuring Supabase JWT auth filters (`auth.jwt() -> metadata -> tenant_id`) or application user claims, which was not investigated since it relies on auth provider setup.

---

## 4. Conclusion

1.  **Database Migration**: Run the migration in `proposed_add_candidate_to_opportunities.sql` to add `candidate_id` UUID and its index:
    ```sql
    ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES public.students(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS opportunities_candidate_id_idx ON public.opportunities(candidate_id);
    ```
2.  **Trigger Automation**: Apply `proposed_add_updated_at_triggers.sql` to automate `updated_at` updates.
3.  **Frontend Implementation**: Replace the contents of `src/app/crm/opportunities/page.tsx` with the code in `proposed_opportunities_page.tsx`. This changes:
    *   Interface: Adds `candidate_id?: string | null` to `Opportunity`.
    *   State: Adds `candidates` state.
    *   Query: Retrieves `candidate_id` in `.select()`.
    *   Mapping: Performs `.find(c => c.id === opp.candidate_id)`.
    *   Form: Renders a select dropdown using the `candidates` state.

---

## 5. Verification Method

To verify the proposed changes:
1.  **File Review**: Review the generated proposals in `C:\tt-ai-stack\01_projects\makeover-talent-agency\.agents\explorer_db_audit\`:
    *   `proposed_add_candidate_to_opportunities.sql`
    *   `proposed_add_updated_at_triggers.sql`
    *   `proposed_opportunities_page.tsx`
2.  **Lint Verification**: Once applied, verify that Next.js compiling matches TypeScript interfaces by running:
    ```powershell
    npm run lint
    ```
3.  **Build Verification**: Verify the production compile:
    ```powershell
    npm run build
    ```
4.  **Integration/E2E Tests**: Run the Playwright test suite to ensure no regressions are introduced in client auth or dashboards:
    ```powershell
    npm run test:e2e
    ```
