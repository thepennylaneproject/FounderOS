-- Email Client Schema Updates
-- Run this migration to add email client functionality

-- Update email_messages table to support folders and drafts
-- Note: This table exists with columns: id, thread_id, message_id, source, from_name, from_email, 
-- to_emails, subject, snippet, body_text, body_html, received_at, sent_at, headers, attachments, status

-- Add folder column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='email_messages' AND column_name='folder') THEN
        ALTER TABLE email_messages ADD COLUMN folder VARCHAR(50) DEFAULT 'inbox';
    END IF;
END $$;

-- Add in_reply_to column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='email_messages' AND column_name='in_reply_to') THEN
        ALTER TABLE email_messages ADD COLUMN in_reply_to VARCHAR(255);
    END IF;
END $$;

-- Add reference_headers column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='email_messages' AND column_name='reference_headers') THEN
        ALTER TABLE email_messages ADD COLUMN reference_headers TEXT[];
    END IF;
END $$;

-- Add indexes for folder queries
CREATE INDEX IF NOT EXISTS idx_email_messages_folder ON email_messages(folder);

-- Create email_signatures table (independent of account_id for now)
CREATE TABLE IF NOT EXISTS email_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email VARCHAR(255),
    name VARCHAR(255),
    html_content TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_signatures_email ON email_signatures(user_email);
