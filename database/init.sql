-- Initial Schema for FounderOS

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Core Tables for FounderOS

-- 1. Users (Platform Admins/Founders)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Domains
CREATE TABLE domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    dkim_key TEXT,
    spf_record TEXT,
    dmarc_policy TEXT,
    daily_limit INTEGER DEFAULT 50,
    status TEXT DEFAULT 'pending_validation',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Contacts (The CRM layer)
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    company_name TEXT,
    industry TEXT,
    stage TEXT DEFAULT 'lead', -- lead, prospect, customer, churned
    health_score INTEGER DEFAULT 100,
    last_active_at TIMESTAMP WITH TIME ZONE,
    tags TEXT[],
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Campaigns
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- marketing, transactional, automated
    status TEXT DEFAULT 'draft', -- draft, active, completed, paused
    template_id TEXT,
    subject TEXT,
    body TEXT,
    target_segments UUID[], -- references to segments (to be added)
    scheduled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Email Logs (Tracking)
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id),
    contact_id UUID REFERENCES contacts(id),
    domain_id UUID REFERENCES domains(id),
    sender TEXT,
    recipient TEXT,
    status TEXT DEFAULT 'sent', -- sent, delivered, bounced, opened, clicked
    tracking_id UUID DEFAULT uuid_generate_v4(),
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Workflows
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    trigger_type TEXT, -- user_signup, field_change, schedule
    config JSONB NOT NULL, -- The logic steps
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Projects (Original table preserved and enhanced)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'backlog',
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Unified Inbox
CREATE TABLE email_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL,
    message_id TEXT,
    source TEXT,
    from_name TEXT,
    from_email TEXT,
    to_emails TEXT[],
    subject TEXT,
    snippet TEXT,
    body_text TEXT,
    body_html TEXT,
    received_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    headers JSONB DEFAULT '{}',
    attachments JSONB DEFAULT '[]',
    status TEXT DEFAULT 'ingested',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_messages_thread ON email_messages(thread_id);
CREATE INDEX idx_email_messages_received ON email_messages(received_at DESC);
CREATE INDEX idx_email_messages_thread_received ON email_messages(thread_id, received_at DESC);
CREATE INDEX idx_email_messages_from ON email_messages(from_email);
CREATE UNIQUE INDEX idx_email_messages_message_id ON email_messages(message_id) WHERE message_id IS NOT NULL;

CREATE TABLE thread_states (
    thread_id UUID PRIMARY KEY,
    lane TEXT NOT NULL, -- now, next, waiting, info, noise
    needs_review BOOLEAN DEFAULT false,
    category TEXT DEFAULT 'uncategorized',
    reason TEXT,
    rule_id TEXT,
    confidence REAL DEFAULT 0.5,
    risk_level TEXT DEFAULT 'low', -- low, medium, high
    evidence JSONB DEFAULT '[]',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_overridden BOOLEAN DEFAULT false
);

CREATE INDEX idx_thread_states_lane ON thread_states(lane);
CREATE INDEX idx_thread_states_category ON thread_states(category);
CREATE INDEX idx_thread_states_risk_level ON thread_states(risk_level);

CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL,
    source_message_id UUID NOT NULL,
    vendor_name TEXT NOT NULL,
    merchant_domain TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL,
    date DATE NOT NULL,
    category TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    transaction_reference TEXT,
    amount_source TEXT NOT NULL,
    evidence TEXT[],
    confidence REAL DEFAULT 0.5
);

CREATE INDEX idx_receipts_thread ON receipts(thread_id);
CREATE INDEX idx_receipts_date ON receipts(date DESC);

CREATE TABLE rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enabled BOOLEAN DEFAULT true,
    priority INTEGER NOT NULL,
    match JSONB NOT NULL,
    action JSONB NOT NULL,
    reason_template TEXT NOT NULL
);

CREATE INDEX idx_rules_priority ON rules(priority);

-- ============================================================================
-- Email Domains (Supabase-backed)
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
-- Extend Email Messages for client + inbox needs
-- ============================================================================

ALTER TABLE email_messages
    ADD COLUMN IF NOT EXISTS account_id UUID,
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

CREATE INDEX IF NOT EXISTS idx_email_messages_folder ON email_messages(folder);
CREATE INDEX IF NOT EXISTS idx_email_messages_account_id ON email_messages(account_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_from_address ON email_messages(from_address);

-- ============================================================================
-- Event Logging Foundation
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_sends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    opened_at TIMESTAMP WITH TIME ZONE NULL,
    clicked_at TIMESTAMP WITH TIME ZONE NULL,
    replied_at TIMESTAMP WITH TIME ZONE NULL,
    bounced_at TIMESTAMP WITH TIME ZONE NULL,
    bounce_reason TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign_id ON campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_recipient_id ON campaign_sends(recipient_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_recipient_email ON campaign_sends(recipient_email);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_sent_at ON campaign_sends(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_opened_at ON campaign_sends(opened_at DESC) WHERE opened_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_sends_clicked_at ON campaign_sends(clicked_at DESC) WHERE clicked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign_recipient ON campaign_sends(campaign_id, recipient_id);

CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    triggered_by VARCHAR(50) NOT NULL,
    triggered_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action_type VARCHAR(50) NOT NULL,
    action_result VARCHAR(50) NOT NULL DEFAULT 'pending',
    action_error TEXT NULL,
    recipients_affected INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_contact_id ON workflow_executions(triggered_contact_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_executed_at ON workflow_executions(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_action_type ON workflow_executions(action_type);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_result ON workflow_executions(action_result);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_time ON workflow_executions(workflow_id, executed_at DESC);

CREATE TABLE IF NOT EXISTS contact_score_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    health_score INTEGER NOT NULL DEFAULT 100,
    momentum_score INTEGER NOT NULL DEFAULT 0,
    is_hot_lead BOOLEAN DEFAULT FALSE,
    closer_signal VARCHAR(255) NULL,
    snapshot_reason VARCHAR(50) NOT NULL,
    related_campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    related_workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
    captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contact_score_snapshots_contact_id ON contact_score_snapshots(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_score_snapshots_captured_at ON contact_score_snapshots(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_score_snapshots_reason ON contact_score_snapshots(snapshot_reason);
CREATE INDEX IF NOT EXISTS idx_contact_score_snapshots_hot_lead ON contact_score_snapshots(is_hot_lead) WHERE is_hot_lead = TRUE;
CREATE INDEX IF NOT EXISTS idx_contact_score_snapshots_contact_reason ON contact_score_snapshots(contact_id, snapshot_reason, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_score_snapshots_campaign ON contact_score_snapshots(related_campaign_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_score_snapshots_workflow ON contact_score_snapshots(related_workflow_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS domain_health_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    domain_name VARCHAR(255) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    previous_value VARCHAR(255),
    current_value VARCHAR(255),
    change_pct NUMERIC(5, 2) NULL,
    suggested_action TEXT NOT NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_domain_health_alerts_domain_id ON domain_health_alerts(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_health_alerts_created_at ON domain_health_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_domain_health_alerts_severity ON domain_health_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_domain_health_alerts_acknowledged ON domain_health_alerts(acknowledged_at) WHERE acknowledged_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_domain_health_alerts_domain_unacked ON domain_health_alerts(domain_id, created_at DESC) WHERE acknowledged_at IS NULL;

CREATE TABLE IF NOT EXISTS triage_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    tier VARCHAR(50) NOT NULL,
    rule_name VARCHAR(255),
    conditions JSONB NOT NULL,
    suggested_action VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_triage_rules_user_id ON triage_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_triage_rules_active ON triage_rules(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_triage_rules_priority ON triage_rules(priority ASC);
CREATE INDEX IF NOT EXISTS idx_triage_rules_tier ON triage_rules(tier);

-- ============================================================================
-- Email Intelligence
-- ============================================================================

CREATE TABLE IF NOT EXISTS analyzed_emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_log_id UUID NOT NULL REFERENCES email_logs(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    intent VARCHAR(50) NOT NULL,
    sentiment VARCHAR(20) NOT NULL DEFAULT 'neutral',
    urgency VARCHAR(20) NOT NULL DEFAULT 'medium',
    action_items JSONB DEFAULT '[]',
    next_steps JSONB DEFAULT '[]',
    buying_signals JSONB DEFAULT '[]',
    objections JSONB DEFAULT '[]',
    questions_asked JSONB DEFAULT '[]',
    timeline_mentioned VARCHAR(255) NULL,
    decision_timeline VARCHAR(50) NOT NULL DEFAULT 'undefined',
    suggested_score_delta INTEGER NOT NULL DEFAULT 0,
    suggested_momentum_delta INTEGER NOT NULL DEFAULT 0,
    should_mark_hot_lead BOOLEAN DEFAULT FALSE,
    suggested_closer_signal VARCHAR(255) NULL,
    recommended_action VARCHAR(50) NOT NULL DEFAULT 'wait',
    recommended_action_description TEXT NOT NULL DEFAULT '',
    full_analysis TEXT NOT NULL DEFAULT '',
    confidence_score INTEGER NOT NULL DEFAULT 50,
    analysis_data JSONB DEFAULT '{}',
    analysis_type VARCHAR(50) NOT NULL DEFAULT 'incoming',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analyzed_emails_email_log_id ON analyzed_emails(email_log_id);
CREATE INDEX IF NOT EXISTS idx_analyzed_emails_contact_id ON analyzed_emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_analyzed_emails_intent ON analyzed_emails(intent);
CREATE INDEX IF NOT EXISTS idx_analyzed_emails_sentiment ON analyzed_emails(sentiment);
CREATE INDEX IF NOT EXISTS idx_analyzed_emails_created_at ON analyzed_emails(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyzed_emails_action ON analyzed_emails(recommended_action);
CREATE INDEX IF NOT EXISTS idx_analyzed_emails_hot_lead ON analyzed_emails(should_mark_hot_lead) WHERE should_mark_hot_lead = TRUE;
CREATE INDEX IF NOT EXISTS idx_analyzed_emails_contact_created ON analyzed_emails(contact_id, created_at DESC);

CREATE TABLE IF NOT EXISTS email_analysis_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name VARCHAR(100) NOT NULL DEFAULT 'daily_email_intelligence',
    status VARCHAR(50) NOT NULL DEFAULT 'running',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    emails_processed INTEGER NOT NULL DEFAULT 0,
    contacts_updated INTEGER NOT NULL DEFAULT 0,
    contacts_upscored INTEGER NOT NULL DEFAULT 0,
    triggers_fired INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    errors JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_analysis_jobs_status ON email_analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_email_analysis_jobs_started_at ON email_analysis_jobs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_analysis_jobs_job_name ON email_analysis_jobs(job_name);

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

-- ============================================================================
-- Additional Columns for Existing Tables
-- ============================================================================

ALTER TABLE contacts
    ADD COLUMN IF NOT EXISTS triage_tier VARCHAR(50) DEFAULT 'nurture',
    ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS momentum_score INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_hot_lead BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS closer_signal VARCHAR(255) DEFAULT NULL;

ALTER TABLE campaigns
    ADD COLUMN IF NOT EXISTS outcome_cache JSONB DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS outcome_cache_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE workflows
    ADD COLUMN IF NOT EXISTS outcome_cache JSONB DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS outcome_cache_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE domains
    ADD COLUMN IF NOT EXISTS last_alert_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS bounce_rate NUMERIC(5, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS inbox_placement_pct INTEGER DEFAULT 100,
    ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'low';

ALTER TABLE email_logs
    ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS analysis_confidence INTEGER DEFAULT 0;
