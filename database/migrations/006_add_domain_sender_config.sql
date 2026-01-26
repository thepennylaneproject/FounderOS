-- Migration: Add sender address and organization reference to domains
-- Purpose: Support multi-domain email sending and organization isolation

ALTER TABLE domains
ADD COLUMN IF NOT EXISTS sender_address TEXT DEFAULT 'noreply@founderos.local',
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Create index for organization queries
CREATE INDEX IF NOT EXISTS idx_domains_sender_address ON domains(sender_address);
