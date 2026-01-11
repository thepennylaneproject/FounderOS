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
