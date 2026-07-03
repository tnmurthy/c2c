-- Migration: 20260703000001_c2c_crm_schema.sql
-- Description: C2C Multi-tenant CRM core schema based on BRD/FRD

-- Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    monthly_price NUMERIC(10, 2),
    annual_price NUMERIC(10, 2),
    limits JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    plan_id UUID REFERENCES subscription_plans(plan_id),
    timezone VARCHAR(100) DEFAULT 'UTC',
    branding_settings JSONB,
    feature_flags JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(plan_id),
    status VARCHAR(50) DEFAULT 'trial',
    start_date DATE,
    end_date DATE,
    renewal_date DATE,
    trial_end_date DATE,
    billing_account_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roles
CREATE TABLE IF NOT EXISTS roles (
    role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions
CREATE TABLE IF NOT EXISTS permissions (
    permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- RolePermissions
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Users (CRM Users)
CREATE TABLE IF NOT EXISTS crm_users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    role_id UUID REFERENCES roles(role_id),
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- Pipelines
CREATE TABLE IF NOT EXISTS pipelines (
    pipeline_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Pipeline Stages
CREATE TABLE IF NOT EXISTS pipeline_stages (
    stage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    pipeline_id UUID REFERENCES pipelines(pipeline_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sequence INT NOT NULL,
    probability INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads
CREATE TABLE IF NOT EXISTS leads (
    lead_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    owner_id UUID REFERENCES crm_users(user_id),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    source VARCHAR(100),
    status VARCHAR(50) DEFAULT 'new',
    pipeline_id UUID REFERENCES pipelines(pipeline_id),
    account_name VARCHAR(255),
    interest_area VARCHAR(255),
    city VARCHAR(100),
    country VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    industry VARCHAR(100),
    website VARCHAR(255),
    phone VARCHAR(50),
    billing_address TEXT,
    shipping_address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    owner_id UUID REFERENCES crm_users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
    contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(account_id) ON DELETE SET NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(100),
    owner_id UUID REFERENCES crm_users(user_id),
    city VARCHAR(100),
    country VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- Add primary_contact_id to accounts now that contacts exist
ALTER TABLE accounts ADD COLUMN primary_contact_id UUID REFERENCES contacts(contact_id) ON DELETE SET NULL;

-- Opportunities
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

-- Activities
CREATE TABLE IF NOT EXISTS activities (
    activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    owner_id UUID REFERENCES crm_users(user_id),
    type VARCHAR(100),
    subject VARCHAR(255),
    description TEXT,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'open',
    related_entity_type VARCHAR(100),
    related_entity_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes
CREATE TABLE IF NOT EXISTS notes (
    note_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    author_id UUID REFERENCES crm_users(user_id),
    related_entity_type VARCHAR(100),
    related_entity_id UUID,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Programs
CREATE TABLE IF NOT EXISTS programs (
    program_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    start_date DATE,
    end_date DATE,
    capacity INT,
    fees NUMERIC(10, 2),
    currency VARCHAR(10),
    status VARCHAR(50),
    owner_id UUID REFERENCES crm_users(user_id),
    account_id UUID REFERENCES accounts(account_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enrollments
CREATE TABLE IF NOT EXISTS enrollments (
    enrollment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    program_id UUID REFERENCES programs(program_id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(contact_id) ON DELETE CASCADE,
    status VARCHAR(50),
    fees_paid NUMERIC(10, 2),
    fees_due NUMERIC(10, 2),
    payment_status VARCHAR(50),
    enrollment_date DATE,
    completion_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom Field Definitions
CREATE TABLE IF NOT EXISTS custom_field_definitions (
    field_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    entity_type VARCHAR(100),
    field_name VARCHAR(255),
    data_type VARCHAR(50),
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true
);

-- Custom Field Values
CREATE TABLE IF NOT EXISTS custom_field_values (
    value_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    field_id UUID REFERENCES custom_field_definitions(field_id) ON DELETE CASCADE,
    entity_type VARCHAR(100),
    entity_id UUID,
    value TEXT
);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
    tag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL
);

-- Entity Tags
CREATE TABLE IF NOT EXISTS entity_tags (
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(tag_id) ON DELETE CASCADE,
    entity_type VARCHAR(100),
    entity_id UUID,
    PRIMARY KEY (tenant_id, tag_id, entity_type, entity_id)
);

-- Attachments
CREATE TABLE IF NOT EXISTS attachments (
    attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    file_name VARCHAR(255),
    file_path TEXT,
    mime_type VARCHAR(100),
    size INT,
    related_entity_type VARCHAR(100),
    related_entity_id UUID,
    uploaded_by UUID REFERENCES crm_users(user_id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    user_id UUID REFERENCES crm_users(user_id) ON DELETE SET NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    action VARCHAR(50),
    changes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
