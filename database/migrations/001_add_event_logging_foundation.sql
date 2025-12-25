-- Phase 0 Migration: Event Logging Foundation
-- This migration adds the core infrastructure for tracking campaign sends, workflow executions,
-- and contact score snapshots. All downstream features depend on these tables.

-- ============================================================================
-- 1. CAMPAIGN_SENDS - Log every send to every recipient
-- ============================================================================

CREATE TABLE campaign_sends (
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

-- Indexes for fast lookups
CREATE INDEX idx_campaign_sends_campaign_id ON campaign_sends(campaign_id);
CREATE INDEX idx_campaign_sends_recipient_id ON campaign_sends(recipient_id);
CREATE INDEX idx_campaign_sends_recipient_email ON campaign_sends(recipient_email);
CREATE INDEX idx_campaign_sends_sent_at ON campaign_sends(sent_at DESC);
CREATE INDEX idx_campaign_sends_opened_at ON campaign_sends(opened_at DESC) WHERE opened_at IS NOT NULL;
CREATE INDEX idx_campaign_sends_clicked_at ON campaign_sends(clicked_at DESC) WHERE clicked_at IS NOT NULL;
-- Composite index for common queries
CREATE INDEX idx_campaign_sends_campaign_recipient ON campaign_sends(campaign_id, recipient_id);

-- ============================================================================
-- 2. WORKFLOW_EXECUTIONS - Log every workflow trigger and execution
-- ============================================================================

CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    triggered_by VARCHAR(50) NOT NULL, -- "contact_created", "email_opened", "scheduled", "manual", etc.
    triggered_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action_type VARCHAR(50) NOT NULL, -- "send_email", "score_lead", "send_notification", "enrich_data"
    action_result VARCHAR(50) NOT NULL DEFAULT 'pending', -- "success", "failed", "partial", "pending"
    action_error TEXT NULL, -- Error message if failed
    recipients_affected INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}', -- Additional context (who triggered, what was the trigger, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookups
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_contact_id ON workflow_executions(triggered_contact_id);
CREATE INDEX idx_workflow_executions_executed_at ON workflow_executions(executed_at DESC);
CREATE INDEX idx_workflow_executions_action_type ON workflow_executions(action_type);
CREATE INDEX idx_workflow_executions_result ON workflow_executions(action_result);
-- Composite for common queries
CREATE INDEX idx_workflow_executions_workflow_time ON workflow_executions(workflow_id, executed_at DESC);

-- ============================================================================
-- 3. CONTACT_SCORE_SNAPSHOTS - Capture contact state at key moments
-- ============================================================================

CREATE TABLE contact_score_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    health_score INTEGER NOT NULL DEFAULT 100,
    momentum_score INTEGER NOT NULL DEFAULT 0,
    is_hot_lead BOOLEAN DEFAULT FALSE,
    closer_signal VARCHAR(255) NULL, -- The keyword or signal detected
    snapshot_reason VARCHAR(50) NOT NULL, -- "before_campaign", "after_workflow", "daily_recalc", "email_received"
    related_campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    related_workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
    captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookups and correlations
CREATE INDEX idx_contact_score_snapshots_contact_id ON contact_score_snapshots(contact_id);
CREATE INDEX idx_contact_score_snapshots_captured_at ON contact_score_snapshots(captured_at DESC);
CREATE INDEX idx_contact_score_snapshots_reason ON contact_score_snapshots(snapshot_reason);
CREATE INDEX idx_contact_score_snapshots_hot_lead ON contact_score_snapshots(is_hot_lead) WHERE is_hot_lead = TRUE;
-- Composite for before/after correlations
CREATE INDEX idx_contact_score_snapshots_contact_reason ON contact_score_snapshots(contact_id, snapshot_reason, captured_at DESC);
CREATE INDEX idx_contact_score_snapshots_campaign ON contact_score_snapshots(related_campaign_id, captured_at DESC);
CREATE INDEX idx_contact_score_snapshots_workflow ON contact_score_snapshots(related_workflow_id, captured_at DESC);

-- ============================================================================
-- 4. DOMAIN_HEALTH_ALERTS - Track domain health changes and alerts
-- ============================================================================

CREATE TABLE domain_health_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    domain_name VARCHAR(255) NOT NULL,
    alert_type VARCHAR(50) NOT NULL, -- "bounce_spike", "deliverability_drop", "reputation_warning", "risk_increase"
    severity VARCHAR(20) NOT NULL, -- "critical", "warning", "info"
    metric_name VARCHAR(100) NOT NULL, -- "bounce_rate", "inbox_placement", "risk_level", etc.
    previous_value VARCHAR(255),
    current_value VARCHAR(255),
    change_pct NUMERIC(5, 2) NULL, -- Percentage change
    suggested_action TEXT NOT NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for alert retrieval
CREATE INDEX idx_domain_health_alerts_domain_id ON domain_health_alerts(domain_id);
CREATE INDEX idx_domain_health_alerts_created_at ON domain_health_alerts(created_at DESC);
CREATE INDEX idx_domain_health_alerts_severity ON domain_health_alerts(severity);
CREATE INDEX idx_domain_health_alerts_acknowledged ON domain_health_alerts(acknowledged_at) WHERE acknowledged_at IS NULL;
-- Composite for finding unacknowledged alerts by domain
CREATE INDEX idx_domain_health_alerts_domain_unacked ON domain_health_alerts(domain_id, created_at DESC) WHERE acknowledged_at IS NULL;

-- ============================================================================
-- 5. TRIAGE_RULES - Allow founders to customize contact triage logic
-- ============================================================================

CREATE TABLE triage_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier VARCHAR(50) NOT NULL, -- "gold", "silver", "nurture", "at_risk"
    rule_name VARCHAR(255),
    conditions JSONB NOT NULL, -- Array of { field, operator, value, logic }
    suggested_action VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 100, -- Lower number = higher priority
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for rule evaluation
CREATE INDEX idx_triage_rules_user_id ON triage_rules(user_id);
CREATE INDEX idx_triage_rules_active ON triage_rules(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_triage_rules_priority ON triage_rules(priority ASC);
CREATE INDEX idx_triage_rules_tier ON triage_rules(tier);

-- ============================================================================
-- 6. MODIFY EXISTING TABLES - Add new columns for caching and tracking
-- ============================================================================

-- Add outcome cache to campaigns (for quick outcome lookups)
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS outcome_cache JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS outcome_cache_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add outcome cache to workflows
ALTER TABLE workflows
ADD COLUMN IF NOT EXISTS outcome_cache JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS outcome_cache_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add triage tier and last contact date to contacts
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS triage_tier VARCHAR(50) DEFAULT 'nurture',
ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS momentum_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_hot_lead BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS closer_signal VARCHAR(255) DEFAULT NULL;

-- Add tracking to domains
ALTER TABLE domains
ADD COLUMN IF NOT EXISTS last_alert_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bounce_rate NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS inbox_placement_pct INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'low'; -- "low", "medium", "high"

-- Add sent_at to campaigns (to track when it was actually sent)
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- ============================================================================
-- 7. CREATE HELPER FUNCTION - Get contact engagement before/after
-- ============================================================================

CREATE OR REPLACE FUNCTION get_contact_engagement_delta(
    p_contact_id UUID,
    p_campaign_id UUID,
    p_hours_after INTEGER DEFAULT 72
) RETURNS TABLE (
    health_before INT,
    health_after INT,
    momentum_before INT,
    momentum_after INT,
    hot_lead_before BOOLEAN,
    hot_lead_after BOOLEAN
) AS $$
DECLARE
    v_campaign_sent_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get campaign sent time
    SELECT sent_at INTO v_campaign_sent_at FROM campaigns WHERE id = p_campaign_id;

    -- Return before/after snapshots
    RETURN QUERY
    SELECT
        (SELECT health_score FROM contact_score_snapshots
         WHERE contact_id = p_contact_id
         AND snapshot_reason = 'before_campaign'
         AND captured_at <= v_campaign_sent_at
         ORDER BY captured_at DESC LIMIT 1)::INT,
        (SELECT health_score FROM contact_score_snapshots
         WHERE contact_id = p_contact_id
         AND snapshot_reason = 'after_workflow'
         AND captured_at > v_campaign_sent_at
         AND captured_at <= v_campaign_sent_at + (p_hours_after || ' hours')::INTERVAL
         ORDER BY captured_at ASC LIMIT 1)::INT,
        (SELECT momentum_score FROM contact_score_snapshots
         WHERE contact_id = p_contact_id
         AND snapshot_reason = 'before_campaign'
         AND captured_at <= v_campaign_sent_at
         ORDER BY captured_at DESC LIMIT 1)::INT,
        (SELECT momentum_score FROM contact_score_snapshots
         WHERE contact_id = p_contact_id
         AND snapshot_reason = 'after_workflow'
         AND captured_at > v_campaign_sent_at
         AND captured_at <= v_campaign_sent_at + (p_hours_after || ' hours')::INTERVAL
         ORDER BY captured_at ASC LIMIT 1)::INT,
        (SELECT is_hot_lead FROM contact_score_snapshots
         WHERE contact_id = p_contact_id
         AND snapshot_reason = 'before_campaign'
         AND captured_at <= v_campaign_sent_at
         ORDER BY captured_at DESC LIMIT 1)::BOOLEAN,
        (SELECT is_hot_lead FROM contact_score_snapshots
         WHERE contact_id = p_contact_id
         AND snapshot_reason = 'after_workflow'
         AND captured_at > v_campaign_sent_at
         AND captured_at <= v_campaign_sent_at + (p_hours_after || ' hours')::INTERVAL
         ORDER BY captured_at ASC LIMIT 1)::BOOLEAN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. MIGRATION METADATA - Track when this was applied
-- ============================================================================

-- Optional: Add a migration tracking table if not exists
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_migrations (version) VALUES ('001_add_event_logging_foundation');

COMMIT;
