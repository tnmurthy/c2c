Below is a **full BRD + FRD** for the Brainovision CRM, benchmarked against Zoho CRM’s core capabilities such as leads, contacts, deals, workflow automation, reporting, mobile access, and tiered editions. I’ve also included the tenant logic as a first-class requirement so this can evolve into a SaaS product without reworking the core data model.[^1][^2][^3][^4][^5][^6][^7]

## 1) BRD

### 1.1 Business overview

Brainovision needs a centralized CRM to manage education-led sales, institution partnerships, program enrollments, workshops, internships, and service inquiries in one place. The system should replace fragmented tracking across spreadsheets, calls, email, and messaging with one unified workflow. In the long term, the same platform should be productized as a multi-tenant SaaS CRM for similar organizations.[^8]

### 1.2 Benchmark reference

Zoho CRM provides a strong benchmark because it covers leads, accounts, contacts, deals, workflows, reporting, automation, and scalable editions. Zoho’s architecture is multi-tenant, with organization-level segregation enforced by unique org IDs and access controls. This makes it a useful reference for both product scope and tenant isolation design.[^2][^3][^4][^5][^1]

### 1.3 Business goals

- Centralize all lead and customer data.
- Improve follow-up discipline and conversion.
- Track program, workshop, internship, and partnership pipelines.
- Provide management dashboards and performance visibility.
- Enable future SaaS commercialization with tenant isolation and subscription tiers.


### 1.4 Business problems

- Lead leakage across channels.
- Inconsistent follow-up and ownership.
- No unified view of student, institution, and corporate opportunities.
- Limited reporting on funnel conversion and revenue.
- Manual effort to support multiple business lines.
- No SaaS-ready foundation for external customers.


### 1.5 Scope

In scope:

- Leads, contacts, accounts, opportunities, and activities.
- Multiple pipelines.
- Program and enrollment management.
- Institution and partnership tracking.
- Workflow automation.
- Reports and dashboards.
- Multi-tenant architecture.
- User roles, permissions, and audit logs.

Out of scope for phase 1:

- Full LMS.
- Accounting and invoicing system.
- Advanced telephony/contact center.
- Public website CMS.
- Deep AI automation.


### 1.6 Stakeholders

- Founder / leadership.
- Admissions team.
- Sales team.
- Partnerships / BD team.
- Program operations team.
- Admin / support team.
- Future SaaS tenant admins.
- Super admin / platform operator.


### 1.7 Success metrics

- Lead response time reduced.
- Higher conversion from inquiry to enrollment.
- Lower missed follow-ups.
- Better owner-wise productivity.
- Clear revenue and pipeline visibility.
- Zero cross-tenant data leakage.
- Tenant onboarding completed without engineering intervention.


### 1.8 Assumptions

- Brainovision will use this CRM internally first.
- The CRM should be tenant-aware from the start.
- Future SaaS customers may need different pipelines, roles, and branding.
- Business users need a UI similar in usability to mainstream CRMs like Zoho CRM.[^4][^2]


## 2) FRD

### 2.1 User roles

- Super Admin.
- Tenant Admin.
- Sales Executive.
- Admissions Executive.
- Program Manager.
- Partnership Manager.
- Support Staff.
- Read-only Manager.


### 2.2 Core modules

#### Leads

- Create, edit, assign, qualify, convert, and close leads.
- Capture source, campaign, interest area, city, organization, and owner.
- Support manual entry, CSV import, and web form intake.


#### Accounts

- Manage colleges, universities, companies, and partner institutions.
- Store organization type, address, primary contacts, and relationship history.


#### Contacts

- Maintain student, parent, faculty, placement officer, HR, and decision-maker contacts.
- Link contacts to accounts, opportunities, and enrollments.


#### Opportunities / Deals

- Track admissions, partnerships, service deals, and program sales.
- Support configurable stages, values, probability, expected close date, and owner.


#### Activities

- Tasks, calls, meetings, notes, reminders, and follow-up history.
- Overdue task tracking and escalation.


#### Programs and enrollments

- Manage workshops, internships, bootcamps, training batches, and placements.
- Track batch size, schedule, fees, status, and coordinator.


#### Reports

- Lead funnel.
- Conversion by source.
- Pipeline by stage.
- Owner-wise productivity.
- Revenue by program.
- Institution engagement.
- Task completion and overdue follow-up reports.


#### Admin

- Roles, permissions, pipelines, custom fields, templates, branding, and plan settings.


### 2.3 Functional requirements

1. The system shall allow creating leads from manual entry, import, and forms.
2. The system shall support multiple pipelines per tenant.
3. The system shall allow conversion of a lead into account, contact, and opportunity.
4. The system shall allow automatic assignment rules based on source, region, or business line.
5. The system shall log all user actions.
6. The system shall provide customizable dashboards.
7. The system shall support tenant-level configuration for branding, fields, and workflows.
8. The system shall support SaaS onboarding and subscription lifecycle.
9. The system shall enforce tenant isolation in all data operations.
10. The system shall support exports only within tenant boundaries.

### 2.4 Workflow requirements

- New lead arrives → assigned to owner → follow-up task created → qualification updated → converted or closed.
- Institution inquiry arrives → partnership pipeline created → meetings and proposal tracked → converted to collaboration.
- Workshop/program registration arrives → enrollment created → payment/status updated → completion tracked.
- Support/admin requests → ticket/task created → ownership assigned → resolution logged.


### 2.5 Validation rules

- Email must be unique within a tenant where applicable.
- Phone number format validation.
- Mandatory tenant_id on every business record.
- Mandatory owner or assignment for active leads.
- No record may be saved without active tenant context.
- Custom fields should validate type and required flags.


## 3) Tenant logic

### 3.1 Tenant model

Use a shared database and shared schema with a `tenant_id` column on all tenant-owned tables. The `tenants` table should hold name, slug, plan, status, timezone, branding, feature flags, and onboarding state. This is the best balance of simplicity, cost, and SaaS readiness for your case.[^6][^7][^9][^10][^11]

### 3.2 Tenant isolation rules

- Every query must resolve tenant context first.
- Every table must include `tenant_id`.
- Every unique index must be tenant-scoped.
- Every background job must carry tenant context.
- Every integration webhook must map to exactly one tenant.
- File storage paths must be tenant-prefixed.
- Super admin access must be explicitly elevated.


### 3.3 Database enforcement

- Use row-level security where supported.[^7][^9]
- Enforce tenant-aware foreign keys.
- Use tenant-scoped caching.
- Add audit logs with tenant context.
- Prevent cross-tenant joins at application and DB layers.
- Keep system tables separate from tenant data.


### 3.4 Provisioning flow

1. Create tenant record.
2. Generate tenant slug.
3. Create default roles.
4. Create admin user.
5. Seed pipelines and templates.
6. Enable plan-based features.
7. Set branding and timezone.
8. Activate tenant.

### 3.5 SaaS readiness

- Subscription plans.
- Usage limits by plan.
- White-label settings.
- Per-tenant feature flags.
- Sandboxes or test environments for configuration validation, similar to how mature CRMs isolate testing environments.[^5]


## 4) Data model

### 4.1 Required tables

- tenants.
- users.
- roles.
- permissions.
- tenant_user_map.
- leads.
- accounts.
- contacts.
- opportunities.
- pipelines.
- pipeline_stages.
- activities.
- tasks.
- notes.
- programs.
- enrollments.
- custom_fields.
- tags.
- attachments.
- audit_logs.
- subscriptions.


### 4.2 Key fields

Every tenant-owned table should include:

- id.
- tenant_id.
- created_at.
- updated_at.
- created_by.
- updated_by.
- is_deleted or soft-delete fields where needed.


### 4.3 Unique constraints

Examples:

- unique(tenant_id, email).
- unique(tenant_id, phone).
- unique(tenant_id, slug).
- unique(tenant_id, pipeline_name).


## 5) Edition strategy

### 5.1 Internal edition

Brainovision internal CRM with core lead, admissions, and program workflows.

### 5.2 SaaS starter

Small education and training businesses with leads, pipelines, tasks, and reports.

### 5.3 SaaS pro

Adds automation, custom fields, integrations, advanced reporting, and branding.

### 5.4 SaaS enterprise

Adds sandboxing, audit depth, advanced RBAC, API controls, and premium support.

This mirrors the general pattern of CRMs that package core sales automation and reporting into tiered offerings.[^12][^13][^14][^1]

## 6) Delivery plan

### Phase 1

- Finalize BRD/FRD.
- Lock tenant data model.
- Build core CRM modules.
- Implement roles and tenant isolation.
- Deliver dashboards and import/export.


### Phase 2

- Automation rules.
- Form integrations.
- Email and WhatsApp integrations.
- Program batch management.
- Advanced reports.


### Phase 3

- SaaS onboarding.
- Billing and plans.
- White-labeling.
- Sandbox and feature flags.
- Multi-tenant self-service admin.


## 7) Acceptance criteria

- A user can only see records belonging to their tenant.[^5]
- A tenant admin can configure pipelines and custom fields.
- A lead can be converted into account, contact, and opportunity.
- Reports correctly aggregate only tenant data.
- New tenant onboarding can be completed without schema changes.
- Admin logs capture all sensitive actions.


## 8) Recommended next step

I can turn this into a **proper Word-style BRD/FRD document** with:

- numbered requirements,
- acceptance criteria,
- process flows,
- and a database schema appendix.

Would you like the next version as a **formal document format** or as a **technical implementation spec with ERD**?
<span style="display:none">[^15][^16][^17][^18][^19][^20][^21]</span>

<div align="center">⁂</div>

[^1]: https://www.zoho.com/crm/zohocrm-pricing.html

[^2]: https://www.zoho.com/crm/features.html

[^3]: https://www.zoho.com/crm/sales-force-automation/workflows.html

[^4]: https://www.zoho.com/crm/complete-feature-list.html

[^5]: https://help.zoho.com/portal/en/kb/crm/crm-reference/product-architecture-and-reliability/articles/zoho-crm-saas-architecture-and-deployment-options

[^6]: https://www.bytebase.com/blog/multi-tenant-database-architecture-patterns-explained/

[^7]: https://www.crunchydata.com/blog/row-level-security-for-tenants-in-postgres

[^8]: https://www.youtube.com/watch?v=aBdeMTtRuW0

[^9]: https://blog.logto.io/implement-multi-tenancy

[^10]: https://clerk.com/blog/how-to-design-multitenant-saas-architecture

[^11]: https://learn.microsoft.com/en-us/azure/azure-sql/database/saas-tenancy-app-design-patterns?view=azuresql

[^12]: https://capsulecrm.com/blog/Zoho-CRM-pricing/

[^13]: https://getabettercrm.com/blog/zoho-crm-editions-a-complete-edition-comparison-guide/

[^14]: https://www.forbes.com/advisor/business/software/zoho-crm-pricing/

[^15]: https://zentegra.com/automating-your-sales-process-with-workflow-rules-in-zoho-crm/

[^16]: https://www.salesforge.ai/directory/sales-tools/zoho-crm

[^17]: https://getabettercrm.com/blog/workflow-rules-and-automations-in-zoho-crm-professional-vs-enterprise-editions/

[^18]: https://clonepartner.com/blog/salesforce-vs-zoho-crm-technical-architecture-operations-guide/

[^19]: https://www.zoho.com/crm/zohocrm-pricing-calculator.html

[^20]: https://www.youtube.com/watch?v=iXKFLMDk2pc

[^21]: https://www.slideshare.net/slideshow/zohocrmeditioncomparisonusdpdf/260978175

