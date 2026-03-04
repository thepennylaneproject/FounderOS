-- Supabase schema alignment for app-required tables/columns

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Email Domains (needed for account FK and app usage)
-- ============================================================================

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_domains_org ON email_domains(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_domains_domain ON email_domains(domain);

-- ============================================================================
-- Email Accounts
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID,
    domain_id UUID REFERENCES email_domains(id) ON DELETE SET NULL,
    email_address VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    signature TEXT,
    auto_reply JSONB DEFAULT '{}',
    forwarding_rules JSONB DEFAULT '[]',
    quota_used BIGINT DEFAULT 0,
    quota_limit BIGINT DEFAULT 5368709120,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_accounts_org ON email_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_domain ON email_accounts(domain_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_accounts_email ON email_accounts(email_address);

-- ============================================================================
-- Email Messages (client + inbox fields)
-- ============================================================================

ALTER TABLE email_messages
    ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES email_accounts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS from_address TEXT,
    ADD COLUMN IF NOT EXISTS to_addresses TEXT[],
    ADD COLUMN IF NOT EXISTS cc_addresses TEXT[],
    ADD COLUMN IF NOT EXISTS bcc_addresses TEXT[],
    ADD COLUMN IF NOT EXISTS folder VARCHAR(50) DEFAULT 'inbox',
    ADD COLUMN IF NOT EXISTS in_reply_to VARCHAR(255),
    ADD COLUMN IF NOT EXISTS reference_headers TEXT[],
    ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS labels TEXT[];

ALTER TABLE email_messages
    ALTER COLUMN thread_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_messages_account_id ON email_messages(account_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_from_address ON email_messages(from_address);
CREATE INDEX IF NOT EXISTS idx_email_messages_folder ON email_messages(folder);

-- ============================================================================
-- AI Usage + Settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    request_id VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    task_type VARCHAR(50) NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    cost DECIMAL(10, 6) NOT NULL,
    latency_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON ai_usage_logs(provider);

CREATE TABLE IF NOT EXISTS user_ai_settings (
    user_id UUID PRIMARY KEY,
    routing_mode VARCHAR(50) DEFAULT 'auto',
    preferred_provider VARCHAR(50),
    monthly_budget DECIMAL(10, 2),
    per_campaign_limit DECIMAL(10, 2),
    per_request_limit DECIMAL(10, 4),
    warn_at_percent INTEGER DEFAULT 80,
    openai_key_encrypted TEXT,
    anthropic_key_encrypted TEXT,
    google_key_encrypted TEXT,
    mistral_key_encrypted TEXT,
    deepseek_key_encrypted TEXT,
    cohere_key_encrypted TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS brand_voice_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    tone VARCHAR(50),
    formality INTEGER,
    personality TEXT[],
    typical_opener TEXT,
    typical_closer TEXT,
    signature_style TEXT,
    avoid_phrases TEXT[],
    example_emails JSONB,
    voice_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_brand_voice_user ON brand_voice_profiles(user_id);

-- ============================================================================
-- Job Execution Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_executions_job_name ON job_executions(job_name);
CREATE INDEX IF NOT EXISTS idx_job_executions_executed_at ON job_executions(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_executions_status ON job_executions(status);
