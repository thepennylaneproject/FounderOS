-- Email Domains Table Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- Create email_domains table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID,
    domain VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    dkim_public_key TEXT,
    dkim_private_key TEXT,
    spf_record TEXT,
    dmarc_policy TEXT,
    mx_records JSONB DEFAULT '[]',
    reputation_score DECIMAL(3,2) DEFAULT 0,
    daily_limit INTEGER DEFAULT 1000,
    emails_sent_today INTEGER DEFAULT 0,
    blacklist_status JSONB DEFAULT '{}',
    dns_settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_domains_org ON email_domains(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_domains_domain ON email_domains(domain);

-- Note: Unique constraint on (organization_id, domain) is commented out
-- because it causes issues when organization_id is NULL
-- UNIQUE(organization_id, domain)
