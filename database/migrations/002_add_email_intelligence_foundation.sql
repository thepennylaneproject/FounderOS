-- Phase 3a Migration: Email Intelligence Foundation
-- This migration adds tables and functions for AI-powered email analysis and intelligence

-- ============================================================================
-- 1. ANALYZED_EMAILS - Store AI analysis of received emails
-- ============================================================================

CREATE TABLE analyzed_emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_log_id UUID NOT NULL REFERENCES email_logs(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

    -- AI extracted content
    intent VARCHAR(50) NOT NULL, -- inquiry, objection, buying_signal, low_interest, technical, unknown
    sentiment VARCHAR(20) NOT NULL DEFAULT 'neutral', -- positive, neutral, negative
    urgency VARCHAR(20) NOT NULL DEFAULT 'medium', -- high, medium, low

    -- Structured extractions
    action_items JSONB DEFAULT '[]', -- Array of action items
    next_steps JSONB DEFAULT '[]', -- Array of next steps
    buying_signals JSONB DEFAULT '[]', -- Array of buying signals detected
    objections JSONB DEFAULT '[]', -- Array of objections raised
    questions_asked JSONB DEFAULT '[]', -- Array of questions asked

    -- Timeline information
    timeline_mentioned VARCHAR(255) NULL, -- e.g., "next quarter", "30 days", "immediate"
    decision_timeline VARCHAR(50) NOT NULL DEFAULT 'undefined', -- immediate, short_term, 30-90_days, long_term, undefined

    -- CRM update recommendations
    suggested_score_delta INTEGER NOT NULL DEFAULT 0, -- -10 to +20
    suggested_momentum_delta INTEGER NOT NULL DEFAULT 0, -- -20 to +40
    should_mark_hot_lead BOOLEAN DEFAULT FALSE,
    suggested_closer_signal VARCHAR(255) NULL,

    -- Next action recommendation
    recommended_action VARCHAR(50) NOT NULL DEFAULT 'wait', -- immediate_outreach, schedule_call, send_proposal, nurture, wait
    recommended_action_description TEXT NOT NULL DEFAULT '',

    -- Analysis metadata
    full_analysis TEXT NOT NULL DEFAULT '', -- Complete AI analysis summary
    confidence_score INTEGER NOT NULL DEFAULT 50, -- 0-100

    -- Raw analysis data (for debugging and future use)
    analysis_data JSONB DEFAULT '{}',

    -- Tracking
    analysis_type VARCHAR(50) NOT NULL DEFAULT 'incoming', -- incoming, draft_feedback
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookups
CREATE INDEX idx_analyzed_emails_email_log_id ON analyzed_emails(email_log_id);
CREATE INDEX idx_analyzed_emails_contact_id ON analyzed_emails(contact_id);
CREATE INDEX idx_analyzed_emails_intent ON analyzed_emails(intent);
CREATE INDEX idx_analyzed_emails_sentiment ON analyzed_emails(sentiment);
CREATE INDEX idx_analyzed_emails_created_at ON analyzed_emails(created_at DESC);
CREATE INDEX idx_analyzed_emails_action ON analyzed_emails(recommended_action);
-- Hot lead detection
CREATE INDEX idx_analyzed_emails_hot_lead ON analyzed_emails(should_mark_hot_lead) WHERE should_mark_hot_lead = TRUE;
-- Recent analyses by contact
CREATE INDEX idx_analyzed_emails_contact_created ON analyzed_emails(contact_id, created_at DESC);

-- ============================================================================
-- 2. EMAIL_ANALYSIS_JOBS - Track batch email analysis job executions
-- ============================================================================

CREATE TABLE email_analysis_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name VARCHAR(100) NOT NULL DEFAULT 'daily_email_intelligence',
    status VARCHAR(50) NOT NULL DEFAULT 'running', -- running, completed, failed
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE NULL,

    -- Metrics
    emails_processed INTEGER NOT NULL DEFAULT 0,
    contacts_updated INTEGER NOT NULL DEFAULT 0,
    contacts_upscored INTEGER NOT NULL DEFAULT 0,
    triggers_fired INTEGER NOT NULL DEFAULT 0,

    -- Error handling
    error_count INTEGER NOT NULL DEFAULT 0,
    errors JSONB DEFAULT '[]', -- Array of error messages

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for job tracking
CREATE INDEX idx_email_analysis_jobs_status ON email_analysis_jobs(status);
CREATE INDEX idx_email_analysis_jobs_started_at ON email_analysis_jobs(started_at DESC);
CREATE INDEX idx_email_analysis_jobs_job_name ON email_analysis_jobs(job_name);

-- ============================================================================
-- 3. MODIFY EXISTING TABLES - Add email analysis tracking
-- ============================================================================

-- Track which emails have been analyzed
ALTER TABLE email_logs
ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS analysis_confidence INTEGER DEFAULT 0;

-- Create index for finding unanalyzed emails
CREATE INDEX IF NOT EXISTS idx_email_logs_unanalyzed ON email_logs(created_at DESC) WHERE analyzed_at IS NULL;

-- ============================================================================
-- 4. MIGRATION METADATA
-- ============================================================================

INSERT INTO schema_migrations (version) VALUES ('002_add_email_intelligence_foundation');

COMMIT;
