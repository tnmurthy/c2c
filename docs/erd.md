## Core ERD entities and relationships

### TENANT

**Entity:** `Tenant`
**Fields (key ones):**

- `tenant_id` (PK)
- `name`
- `slug`
- `status` (active/suspended/deleted)
- `plan_id` (FK → SubscriptionPlan)
- `timezone`
- `branding_settings` (JSON)
- `feature_flags` (JSON)
- `created_at`, `updated_at`

**Relationships:**

- One `Tenant` to many `User` (1:N).
- One `Tenant` to many `Lead`, `Account`, `Contact`, `Opportunity`, `Program`, `Enrollment`, etc. (1:N).
- One `Tenant` to many `Subscription` (1:N or 1:1 current).

***

### USER / ROLE / PERMISSION

**Entity:** `User`

- `user_id` (PK)
- `tenant_id` (FK → Tenant)
- `email`
- `password_hash`
- `name`
- `status` (active/inactive)
- `role_id` (FK → Role)
- `phone`
- `created_at`, `updated_at`

**Entity:** `Role`

- `role_id` (PK)
- `tenant_id` (FK → Tenant)
- `name` (e.g., SuperAdmin, TenantAdmin, SalesExec)
- `description`

**Entity:** `Permission`

- `permission_id` (PK)
- `code` (e.g., `LEAD_READ`, `LEAD_WRITE`)
- `description`

**Entity:** `RolePermission`

- `role_id` (FK → Role)
- `permission_id` (FK → Permission)
- Composite PK: `(role_id, permission_id)`

**Relationships:**

- Tenant 1:N Role.
- Role N:M Permission (via RolePermission).
- Tenant 1:N User, Role 1:N User.

***

### LEAD

**Entity:** `Lead`

- `lead_id` (PK)
- `tenant_id` (FK → Tenant)
- `owner_id` (FK → User)
- `first_name`, `last_name`
- `email`, `phone`
- `source` (picklist: website, referral, event, campaign)
- `status` (new, contacted, qualified, disqualified)
- `pipeline_id` (FK → Pipeline; optional for lead-level pipeline)
- `account_name` (text; pre-account stage)
- `interest_area` (e.g., Data Science, Java, Internship)
- `city`, `country`
- `notes` (text)
- `created_at`, `updated_at`

**Relationships:**

- Tenant 1:N Lead.
- User 1:N Lead (owner_id).
- Pipeline 1:N Lead (optional).

***

### ACCOUNT

**Entity:** `Account`

- `account_id` (PK)
- `tenant_id` (FK → Tenant)
- `name`
- `type` (college, university, company, partner, individual)
- `industry`
- `website`
- `phone`
- `billing_address`, `shipping_address`
- `city`, `country`
- `primary_contact_id` (FK → Contact; nullable)
- `owner_id` (FK → User)
- `created_at`, `updated_at`

**Relationships:**

- Tenant 1:N Account.
- User 1:N Account (owner).
- Account 1:N Contact.
- Account 1:N Opportunity.

***

### CONTACT

**Entity:** `Contact`

- `contact_id` (PK)
- `tenant_id` (FK → Tenant)
- `account_id` (FK → Account; nullable for standalone contacts)
- `first_name`, `last_name`
- `email`, `phone`
- `role` (student, parent, faculty, placement_officer, HR)
- `owner_id` (FK → User)
- `city`, `country`
- `created_at`, `updated_at`

**Relationships:**

- Tenant 1:N Contact.
- Account 1:N Contact.
- User 1:N Contact.
- Contact can link to many `Opportunity` via FK `primary_contact_id` on Opportunity.

***

### OPPORTUNITY / DEAL

**Entity:** `Opportunity`

- `opportunity_id` (PK)
- `tenant_id` (FK → Tenant)
- `account_id` (FK → Account)
- `primary_contact_id` (FK → Contact; optional)
- `owner_id` (FK → User)
- `name`
- `pipeline_id` (FK → Pipeline)
- `stage_id` (FK → PipelineStage)
- `amount`
- `currency`
- `probability` (0–100)
- `expected_close_date`
- `status` (open, won, lost)
- `created_at`, `updated_at`

**Relationships:**

- Tenant 1:N Opportunity.
- Account 1:N Opportunity.
- Contact 1:N Opportunity (primary contact).
- User 1:N Opportunity.
- Pipeline 1:N Opportunity.
- PipelineStage 1:N Opportunity.

***

### PIPELINE / PIPELINE STAGE

**Entity:** `Pipeline`

- `pipeline_id` (PK)
- `tenant_id` (FK → Tenant)
- `name` (Admissions, Partnerships, Corporate Deals, Workshops)
- `entity_type` (lead, opportunity, enrollment)
- `is_default` (bool)
- `created_at`, `updated_at`

**Entity:** `PipelineStage`

- `stage_id` (PK)
- `tenant_id` (FK → Tenant)
- `pipeline_id` (FK → Pipeline)
- `name` (e.g., New, Contacted, Demo Given, Proposal Sent, Negotiation, Won, Lost)
- `sequence` (int)
- `probability` (optional default probability)
- `created_at`, `updated_at`

**Relationships:**

- Tenant 1:N Pipeline.
- Pipeline 1:N PipelineStage.
- PipelineStage 1:N Opportunity and possibly Leads (if you link leads to stages).

***

### ACTIVITY / TASK / NOTE

**Entity:** `Activity`

- `activity_id` (PK)
- `tenant_id` (FK → Tenant)
- `owner_id` (FK → User)
- `type` (call, meeting, email, WhatsApp, task)
- `subject`
- `description`
- `due_date`
- `completed_at`
- `status` (open, completed, cancelled)

Polymorphic linkage (choose one approach):

Approach A – polymorphic:

- `related_entity_type` (enum: lead, account, contact, opportunity, program, enrollment)
- `related_entity_id` (UUID or bigint for that entity)

Approach B – explicit FKs:

- `lead_id` nullable FK
- `account_id` nullable FK
- `contact_id` nullable FK
- `opportunity_id` nullable FK
- `program_id` nullable FK
- `enrollment_id` nullable FK

**Entity:** `Note`

- `note_id` (PK)
- `tenant_id` (FK → Tenant)
- `author_id` (FK → User)
- same polymorphic or explicit relation fields as Activity
- `content`
- `created_at`

**Relationships:**

- Tenant 1:N Activity, Note.
- User 1:N Activity, Note.
- Any main entity (Lead/Account/Contact/Opportunity/Program/Enrollment) 1:N Activity, Note.

***

### PROGRAM / ENROLLMENT

**Entity:** `Program`

- `program_id` (PK)
- `tenant_id` (FK → Tenant)
- `name` (e.g., “AI Internship – Summer 2026”)
- `type` (workshop, internship, bootcamp, training, project)
- `start_date`, `end_date`
- `capacity`
- `fees`
- `currency`
- `status` (planned, active, completed, cancelled)
- `owner_id` (FK → User or ProgramManager)
- `account_id` (FK → Account; institution running the program)
- `created_at`, `updated_at`

**Entity:** `Enrollment`

- `enrollment_id` (PK)
- `tenant_id` (FK → Tenant)
- `program_id` (FK → Program)
- `contact_id` (FK → Contact; student or participant)
- `status` (applied, enrolled, in_progress, completed, dropped)
- `fees_paid`
- `fees_due`
- `payment_status` (pending, partially_paid, paid)
- `enrollment_date`
- `completion_date` (nullable)
- `created_at`, `updated_at`

**Relationships:**

- Tenant 1:N Program.
- Tenant 1:N Enrollment.
- Account 1:N Program (institution-level programs).
- Program 1:N Enrollment.
- Contact 1:N Enrollment.

***

### CUSTOM FIELDS / TAGS

**Entity:** `CustomFieldDefinition`

- `field_id` (PK)
- `tenant_id` (FK → Tenant)
- `entity_type` (lead, account, contact, opportunity, program, enrollment, activity)
- `field_name`
- `data_type` (string, number, date, boolean, list)
- `is_required`
- `is_active`

**Entity:** `CustomFieldValue`

- `value_id` (PK)
- `tenant_id` (FK → Tenant)
- `field_id` (FK → CustomFieldDefinition)
- `entity_type`
- `entity_id`
- `value` (string; typed in application layer)

**Entity:** `Tag`

- `tag_id` (PK)
- `tenant_id` (FK → Tenant)
- `name`

**Entity:** `EntityTag`

- `tenant_id` (FK → Tenant)
- `tag_id` (FK → Tag)
- `entity_type`
- `entity_id`
- Composite PK: `(tenant_id, tag_id, entity_type, entity_id)`

***

### ATTACHMENT

**Entity:** `Attachment`

- `attachment_id` (PK)
- `tenant_id` (FK → Tenant)
- `file_name`
- `file_path` or `file_url`
- `mime_type`
- `size`
- polymorphic/explicit references to Lead/Account/Contact/Opportunity/Program/Enrollment.
- `uploaded_by` (FK → User)
- `uploaded_at`

**Relationships:**

- Tenant 1:N Attachment.
- User 1:N Attachment.
- Any main entity 1:N Attachment.

***

### AUDIT LOG

**Entity:** `AuditLog`

- `log_id` (PK)
- `tenant_id` (FK → Tenant)
- `user_id` (FK → User; nullable for system actions)
- `entity_type` (lead, account, contact, opportunity, program, enrollment, user, role, config)
- `entity_id`
- `action` (create, update, delete, login, permission_change, config_change)
- `changes` (JSON diff)
- `created_at`

**Relationships:**

- Tenant 1:N AuditLog.
- User 1:N AuditLog.

***

### SUBSCRIPTION / PLAN (for SaaS)

**Entity:** `SubscriptionPlan`

- `plan_id` (PK)
- `name` (Free, Starter, Pro, Enterprise)
- `description`
- `monthly_price`, `annual_price`
- `limits` (JSON: user_count, record_count, automation_rules, etc.)

**Entity:** `Subscription`

- `subscription_id` (PK)
- `tenant_id` (FK → Tenant)
- `plan_id` (FK → SubscriptionPlan)
- `status` (trial, active, past_due, cancelled)
- `start_date`
- `end_date`
- `renewal_date`
- `trial_end_date`
- `billing_account_id` (optional FK to external billing integration)

**Relationships:**

- SubscriptionPlan 1:N Subscription.
- Tenant 1:N Subscription (current one flagged).

***

## Multi-tenant constraints and ERD notes

- Every tenant-owned entity has `tenant_id` and uses **tenant-scoped unique indices** such as `UNIQUE(tenant_id, email)` for contacts and `UNIQUE(tenant_id, name)` for pipelines.[^4][^7]
- Queries and ORM mappings should apply **global tenant filters** so that per-tenant isolation is enforced across all entities.[^8][^4]
- This design matches multi-tenant SaaS patterns where a shared DB and shared schema are combined with tenant IDs plus logical and physical isolation controls.[^9][^7]

If you’d like, I can next give you a **Mermaid ER diagram snippet** or a **dbdiagram.io script** that you can paste directly into your tooling to visualize this.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^16][^17]</span>

<div align="center">⁂</div>

[^1]: https://community.dynamics.com/forums/thread/details/?threadid=c0c2947f-328e-ee11-8179-6045bdebe084

[^2]: https://www.phoneiq.co/blog/understanding-the-difference-between-a-lead-account-contact-and-opportunity-in-salesforce-2025

[^3]: https://www.microsoft.com/en-us/dynamics-365/blog/no-audience/2007/08/27/leads-accounts-contacts-and-opportunities/

[^4]: https://www.milanjovanovic.tech/blog/multi-tenant-applications-with-ef-core

[^5]: https://www.toplineresults.com/2026/03/understanding-leads-vs-contacts-vs-accounts-in-crm/

[^6]: https://help.zoho.com/portal/en/kb/crm/getting-started/product-architecture-and-reliability/articles/zoho-crm-s-core-data-model-and-how-you-extend-it-safely

[^7]: https://www.bytebase.com/blog/multi-tenant-database-architecture-patterns-explained/

[^8]: https://www.crunchydata.com/blog/row-level-security-for-tenants-in-postgres

[^9]: https://blog.logto.io/tenancy-models

[^10]: https://www.reddit.com/r/Dynamics365/comments/1868f97/leads_contacts_opportunities_and_accounts_maze/

[^11]: https://sysco-software.com/news-insights/crm-accounts-contacts-leads-opportunities-cases/

[^12]: https://www.zoho.com/crm/developer/docs/data-model/

[^13]: https://aptitude8.com/blog/what-are-the-differences-between-leads-contacts-and-accounts-in-salesforce

[^14]: https://help.zoho.com/portal/en/community/topic/introducing-data-model-for-zoho-crm

[^15]: https://support.1cloudconsultants.com/portal/en/kb/articles/introducing-data-model-for-zoho-crm

[^16]: https://www.facebook.com/groups/Javagroup123/posts/10156438614861664/

[^17]: https://www.revenueopsllc.com/understanding-salesforce-objects-accounts-contacts-leads-and-opportunities/

