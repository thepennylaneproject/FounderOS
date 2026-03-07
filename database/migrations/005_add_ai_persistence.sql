-- Migration: Add AI Usage Tracking and Brand Voice Persistence
-- Purpose: Persist AI-related data instead of keeping in memory

-- ==================== AI USAGE LOGS ====================
-- Track all AI API calls, tokens used, and costs per user/organization
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    user_id UUID REFERENCES users(id),
    request_id TEXT,
    provider TEXT NOT NULL, -- openai, anthropic, google, mistral, cohere, deepseek
    model TEXT NOT NULL,    -- gpt-4o, claude-3.5-sonnet, etc.
    task_type TEXT,         -- copywriting, visualization, personalization, strategy, etc.
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)) STORED,
    cost DECIMAL(10, 6),    -- Cost in USD
    latency_ms INTEGER,     -- Response time in milliseconds
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_organization_id ON ai_usage_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON ai_usage_logs(provider);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage_logs(created_at);

-- ==================== BRAND VOICE PROFILES ====================
-- Store user-customized brand voice guidelines
CREATE TABLE IF NOT EXISTS brand_voice_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    user_id UUID REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT,
    tone TEXT,              -- professional, casual, friendly, technical, etc.
    personality_traits TEXT[], -- Array of traits
    values_and_mission TEXT,   -- Core values
    target_audience TEXT,
    language_guidelines TEXT,  -- JSON with rules
    do_list TEXT,             -- Things to do
    dont_list TEXT,           -- Things to avoid
    examples JSONB DEFAULT '[]', -- Array of good/bad examples
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_brand_voice_organization_id ON brand_voice_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_brand_voice_user_id ON brand_voice_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_voice_is_default ON brand_voice_profiles(organization_id, is_default);

-- ==================== AI COST BUDGETS ====================
-- Track monthly budgets and spending per organization
CREATE TABLE IF NOT EXISTS ai_cost_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    month_year DATE NOT NULL, -- First day of month (2024-01-01)
    budget_usd DECIMAL(10, 2),
    spent_usd DECIMAL(10, 6) DEFAULT 0,
    threshold_percent INTEGER DEFAULT 80, -- Alert at 80% of budget
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_ai_cost_budgets_organization_id ON ai_cost_budgets(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_cost_budgets_month_year ON ai_cost_budgets(month_year);
