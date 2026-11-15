-- M1 (2026-11-15, ADR-003): tenancy model.
--   tenant (university / college group / autonomous college)
--     └ institution (campus) ── institution_domains
--         └ department ── discipline (shared taxonomy) ── department_aliases
--             └ cohort (program + graduation year) └ student
--   memberships (user × tenant × [institution] × [department] × role)
--   tenant_employer_access, tenant_partner_links (eklav opt-in per tenant)
--
-- Schema-agnostic: the target schema is set ONCE below. Applied to c2c_stg first;
-- the same file runs against c2c after the N4 move. Additive only — nothing dropped.

set local search_path = c2c_stg, extensions;

-- ---------------------------------------------------------------- tenants
alter table tenants
  add column if not exists kind text not null default 'university'
  check (kind in ('university', 'college_group', 'autonomous_college', 'operator', 'test'));
comment on column tenants.kind is
  'Customer that signs the contract (university / college_group / autonomous_college); operator = Talia; test = E2E/dev.';

-- ---------------------------------------------------------------- disciplines
create table if not exists disciplines (
  code            text primary key check (code ~ '^[A-Z0-9-]+$'),
  name            text not null,
  parent_code     text references disciplines(code),
  level           text not null check (level in ('ug', 'pg', 'diploma', 'doctoral')),
  default_program text not null
);
comment on table disciplines is 'Shared discipline taxonomy (ADR-003). Departments map to it so analytics and partner sync (eklav) work across institutions.';

insert into disciplines (code, name, parent_code, level, default_program) values
  ('CSE',     'Computer Science & Engineering', null, 'ug', 'B.Tech'),
  ('CSE-AIML','CSE (AI & Machine Learning)', 'CSE', 'ug', 'B.Tech'),
  ('CSE-AIDS','Artificial Intelligence & Data Science', 'CSE', 'ug', 'B.Tech'),
  ('CSE-AI',  'Artificial Intelligence', 'CSE', 'ug', 'B.Tech'),
  ('CSE-DS',  'CSE (Data Science)', 'CSE', 'ug', 'B.Tech'),
  ('CSE-CYS', 'CSE (Cyber Security)', 'CSE', 'ug', 'B.Tech'),
  ('IT',      'Information Technology', null, 'ug', 'B.Tech'),
  ('ECE',     'Electronics & Communication Engineering', null, 'ug', 'B.Tech'),
  ('EEE',     'Electrical & Electronics Engineering', null, 'ug', 'B.Tech'),
  ('EE',      'Electrical Engineering', null, 'ug', 'B.Tech'),
  ('EIE',     'Electronics & Instrumentation Engineering', null, 'ug', 'B.Tech'),
  ('MECH',    'Mechanical Engineering', null, 'ug', 'B.Tech'),
  ('CIVIL',   'Civil Engineering', null, 'ug', 'B.Tech'),
  ('CHEM',    'Chemical Engineering', null, 'ug', 'B.Tech'),
  ('AERO',    'Aeronautical Engineering', null, 'ug', 'B.Tech'),
  ('AUTO',    'Automobile Engineering', null, 'ug', 'B.Tech'),
  ('BIOTECH', 'Biotechnology', null, 'ug', 'B.Tech'),
  ('MBA',     'Master of Business Administration', null, 'pg', 'MBA'),
  ('MCA',     'Master of Computer Applications', null, 'pg', 'MCA'),
  ('BBA',     'Bachelor of Business Administration', null, 'ug', 'BBA'),
  ('BCA',     'Bachelor of Computer Applications', null, 'ug', 'BCA'),
  ('BCOM',    'Bachelor of Commerce', null, 'ug', 'B.Com'),
  ('BSC',     'Bachelor of Science', null, 'ug', 'B.Sc'),
  ('PHARM',   'Pharmacy', null, 'ug', 'B.Pharm')
on conflict (code) do nothing;

-- Free-text department -> discipline code (NULL = needs human review).
-- Mirror in Python when CSV import lands (G7). Order matters: specific first.
create or replace function norm_alias(raw text) returns text
language sql immutable set search_path from current as $$
  select nullif(trim(regexp_replace(lower(coalesce(raw, '')), '[^a-z0-9]+', ' ', 'g')), '')
$$;

create or replace function map_discipline(raw text) returns text
language sql immutable set search_path from current as $$
  with n as (select ' ' || norm_alias(raw) || ' ' as s)
  select case
    when s ~ ' (ai ?ds|aids) ' or (s ~ 'artificial intelligence' and s ~ 'data science') then 'CSE-AIDS'
    when s ~ ' (ai ?ml|aiml) ' or (s ~ 'artificial intelligence' and s ~ 'machine learning') then 'CSE-AIML'
    when s ~ 'cyber' then 'CSE-CYS'
    when s ~ 'data science' then 'CSE-DS'
    when s ~ 'artificial intelligence' then 'CSE-AI'
    when s ~ 'computer science|comp sci| cse | cs ' then 'CSE'
    when s ~ 'computer application| mca ' then 'MCA'
    when s ~ ' bca ' then 'BCA'
    when s ~ 'information technology| it ' then 'IT'
    when s ~ 'instrumentation| eie ' then 'EIE'
    when (s ~ 'electronic' and s ~ 'communication') or s ~ ' ece ' then 'ECE'
    when (s ~ 'electrical' and s ~ 'electronic') or s ~ ' eee ' then 'EEE'
    when s ~ 'electrical' then 'EE'
    when s ~ 'mechanical| mech ' then 'MECH'
    when s ~ 'civil' then 'CIVIL'
    when s ~ 'chemical' then 'CHEM'
    when s ~ 'aeronautic|aerospace' then 'AERO'
    when s ~ 'automobile' then 'AUTO'
    when s ~ 'biotech' then 'BIOTECH'
    when s ~ ' bba |bachelor of business' then 'BBA'
    when s ~ ' mba |master of business|business administration' then 'MBA'
    when s ~ ' b ?com |commerce' then 'BCOM'
    when s ~ 'pharm' then 'PHARM'
    else null
  end
  from n
$$;

-- ---------------------------------------------------------------- institutions
alter table institutions
  add column if not exists tenant_id uuid references tenants(tenant_id) on delete restrict,
  add column if not exists status text not null default 'active'
    check (status in ('prospect', 'active', 'suspended')),
  add column if not exists affiliating_university text;
create index if not exists institutions_tenant_idx on institutions (tenant_id);
comment on column institutions.status is 'prospect = not a customer yet: not claimable, not offered in onboarding, excluded from employer search (ADR-002 T1).';

create table if not exists institution_domains (
  domain         text primary key check (domain = lower(domain) and domain !~ '\s' and domain ~ '\.'),
  institution_id bigint not null references institutions(id) on delete cascade,
  verified_at    timestamptz,
  verified_by    uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists institution_domains_inst_idx on institution_domains (institution_id);

-- ---------------------------------------------------------------- departments / cohorts
create table if not exists departments (
  id              uuid primary key default gen_random_uuid(),
  institution_id  bigint not null references institutions(id) on delete cascade,
  name            text not null,
  short_code      text,
  discipline_code text references disciplines(code),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index if not exists departments_inst_name_uq on departments (institution_id, lower(name));
create index if not exists departments_discipline_idx on departments (discipline_code);

create table if not exists department_aliases (
  institution_id bigint not null references institutions(id) on delete cascade,
  alias_norm     text not null,
  department_id  uuid not null references departments(id) on delete cascade,
  primary key (institution_id, alias_norm)
);

create table if not exists cohorts (
  id              uuid primary key default gen_random_uuid(),
  department_id   uuid not null references departments(id) on delete cascade,
  program         text not null,
  graduation_year int  not null check (graduation_year between 2000 and 2100),
  created_at      timestamptz not null default now(),
  unique (department_id, program, graduation_year)
);

alter table students
  add column if not exists department_id uuid references departments(id) on delete set null,
  add column if not exists cohort_id     uuid references cohorts(id) on delete set null;
create index if not exists students_department_idx on students (department_id);
create index if not exists students_cohort_idx on students (cohort_id);
create index if not exists students_institution_idx on students (institution_id);

-- ---------------------------------------------------------------- memberships
create table if not exists memberships (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  tenant_id      uuid not null references tenants(tenant_id) on delete cascade,
  institution_id bigint references institutions(id) on delete cascade,
  department_id  uuid references departments(id) on delete cascade,
  role           text not null check (role in ('tenant_admin', 'tpo', 'dept_coordinator', 'faculty_mentor', 'student')),
  status         text not null default 'active' check (status in ('invited', 'active', 'revoked')),
  source         text not null default 'manual' check (source in ('manual', 'invite', 'legacy_backfill', 'csv_import')),
  invited_email  text,
  verified_by    uuid references auth.users(id) on delete set null,
  verified_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint memberships_scope_by_role check (
    (role = 'tenant_admin' and institution_id is null and department_id is null)
    or (role = 'tpo' and institution_id is not null and department_id is null)
    or (role in ('dept_coordinator', 'faculty_mentor') and institution_id is not null and department_id is not null)
    or (role = 'student' and institution_id is not null)
  )
);
create unique index if not exists memberships_live_uq on memberships
  (user_id, tenant_id, coalesce(institution_id, 0), coalesce(department_id, '00000000-0000-0000-0000-000000000000'::uuid), role)
  where status <> 'revoked';
create index if not exists memberships_user_idx on memberships (user_id) where status = 'active';
create index if not exists memberships_tenant_idx on memberships (tenant_id);
create index if not exists memberships_inst_idx on memberships (institution_id);
create index if not exists memberships_dept_idx on memberships (department_id);

-- Scope must be internally consistent: institution in tenant, department in institution.
create or replace function memberships_check_scope() returns trigger
language plpgsql set search_path from current as $$
begin
  if new.institution_id is not null and not exists (
       select 1 from institutions i where i.id = new.institution_id and i.tenant_id = new.tenant_id) then
    raise exception 'membership: institution % is not in tenant %', new.institution_id, new.tenant_id;
  end if;
  if new.department_id is not null and not exists (
       select 1 from departments d where d.id = new.department_id and d.institution_id = new.institution_id) then
    raise exception 'membership: department % is not in institution %', new.department_id, new.institution_id;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists memberships_check_scope on memberships;
create trigger memberships_check_scope before insert or update on memberships
  for each row execute function memberships_check_scope();

-- ---------------------------------------------------------------- tenant links
create table if not exists tenant_employer_access (
  tenant_id   uuid not null references tenants(tenant_id) on delete cascade,
  employer_id uuid not null references employers(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'blocked')),
  decided_by  uuid references auth.users(id) on delete set null,
  decided_at  timestamptz,
  created_at  timestamptz not null default now(),
  primary key (tenant_id, employer_id)
);

create table if not exists tenant_partner_links (
  tenant_id     uuid not null references tenants(tenant_id) on delete cascade,
  partner_id    text not null check (partner_id ~ '^[a-z0-9_-]+$'),
  enabled       boolean not null default false,
  agreement_ref text,
  enabled_by    uuid references auth.users(id) on delete set null,
  enabled_at    timestamptz,
  created_at    timestamptz not null default now(),
  primary key (tenant_id, partner_id)
);
comment on table tenant_partner_links is 'Per-tenant opt-in for downstream partners (eklav). No data flows to a partner unless enabled = true.';

-- ---------------------------------------------------------------- review view
create or replace view department_mapping_review with (security_invoker = on) as
  select d.id as department_id, i.id as institution_id, i.name as institution, d.name as department,
         (select count(*) from students s where s.department_id = d.id) as students
  from departments d join institutions i on i.id = d.institution_id
  where d.discipline_code is null;

-- ---------------------------------------------------------------- RLS
-- New tables are deny-by-default for API roles; the backend (service role) does
-- the scoped reads. Full RLS on memberships comes in Phase 5 (CLAUDE.md).
alter table disciplines            enable row level security;
alter table institution_domains    enable row level security;
alter table departments            enable row level security;
alter table department_aliases     enable row level security;
alter table cohorts                enable row level security;
alter table memberships            enable row level security;
alter table tenant_employer_access enable row level security;
alter table tenant_partner_links   enable row level security;

drop policy if exists disciplines_read on disciplines;
create policy disciplines_read on disciplines for select to anon, authenticated using (true);
drop policy if exists memberships_read_own on memberships;
create policy memberships_read_own on memberships for select to authenticated using (user_id = auth.uid());

revoke execute on function memberships_check_scope() from public, anon, authenticated;
