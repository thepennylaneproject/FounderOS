-- Migration: Critical Fixes for Launch Readiness
-- Adds transaction support, error tracking, and timestamps
-- Date: 2026-01-11

-- 1. Add columns to campaigns table for transaction tracking
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 2. Update campaign status enum to include new statuses
-- First, add new statuses (PostgreSQL doesn't support ALTER ENUM in existing tables)
-- We'll use a TEXT check instead and update the enum migration separately
ALTER TABLE campaigns
ADD CONSTRAINT valid_campaign_status CHECK (
    status IN ('draft', 'active', 'in_progress', 'completed', 'completed_with_failures', 'failed', 'paused')
);

-- 3. Add columns to email_logs table for delivery tracking
ALTER TABLE email_logs
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 4. Update email_logs status to allow pending and failed statuses
ALTER TABLE email_logs
DROP CONSTRAINT IF EXISTS valid_email_log_status;

ALTER TABLE email_logs
ADD CONSTRAINT valid_email_log_status CHECK (
    status IN ('pending', 'sent', 'delivered', 'bounced', 'opened', 'clicked', 'failed')
);

-- 5. Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_status ON email_logs(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_status_created ON campaigns(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_sent_failed ON campaigns(sent_count, failed_count);

-- 6. Add momentum_score to contacts for hot lead detection
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS momentum_score DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_engagement_at TIMESTAMP WITH TIME ZONE;

-- 7. Create index for momentum queries
CREATE INDEX IF NOT EXISTS idx_contacts_momentum_score ON contacts(momentum_score DESC);

-- 8. Add columns for contact form dirty tracking (frontend use, informational)
-- These are just for reference; actual dirty state is managed in React
-- But we'll track when a contact was last edited for audit purposes
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS last_modified_by TEXT DEFAULT 'system',
ADD COLUMN IF NOT EXISTS modification_reason TEXT;
