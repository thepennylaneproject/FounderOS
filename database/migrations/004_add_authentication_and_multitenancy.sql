-- Migration: Add Authentication and Multi-tenancy Support
-- Purpose: Add Supabase Auth integration and organization isolation

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== ORGANIZATIONS ====================
-- Create organizations table for multi-tenancy
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==================== USERS ====================
-- Add organization_id to existing users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id),
ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member'; -- member, admin, owner

CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- ==================== CONTACTS ====================
-- Add organization_id to contacts
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) NOT NULL DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON contacts(created_by);

-- ==================== CAMPAIGNS ====================
-- Add organization_id and user tracking to campaigns
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) NOT NULL DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_campaigns_organization_id ON campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON campaigns(created_by);

-- ==================== EMAIL LOGS ====================
-- Add organization_id to email_logs for filtering
ALTER TABLE email_logs
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) NOT NULL DEFAULT uuid_generate_v4();

CREATE INDEX IF NOT EXISTS idx_email_logs_organization_id ON email_logs(organization_id);

-- ==================== DOMAINS ====================
-- Add organization_id to domains
ALTER TABLE domains
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) NOT NULL DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_token TEXT;

CREATE INDEX IF NOT EXISTS idx_domains_organization_id ON domains(organization_id);

-- ==================== WORKFLOWS ====================
-- Add organization_id to workflows
ALTER TABLE workflows
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) NOT NULL DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_workflows_organization_id ON workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflows_created_by ON workflows(created_by);

-- ==================== RULES ====================
-- Create rules table if it doesn't exist
CREATE TABLE IF NOT EXISTS rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 100,
    match JSONB DEFAULT '{}',
    action JSONB DEFAULT '{}',
    reason_template TEXT DEFAULT 'Routed because: rule match',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rules_organization_id ON rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_rules_enabled_priority ON rules(organization_id, enabled, priority);

-- ==================== ORGANIZATION MEMBERS ====================
-- Create a table for managing organization membership
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- member, admin, owner
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_organization_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);

-- ==================== AUDIT LOG ====================
-- Create audit log table for tracking changes
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    changes JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
