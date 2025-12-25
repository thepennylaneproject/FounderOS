/**
 * Cost Tracker - Usage Analytics & Budget Management
 *
 * Tracks AI usage, enforces budgets, and provides cost visibility
 */

import { query } from '@/lib/db';
import {
  AIProvider,
  TaskType,
  UsageRecord,
  UsageSummary,
  UserAISettings,
  CostBreakdown,
} from './types';

/**
 * Budget check result
 */
export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  currentSpend: number;
  budgetLimit: number;
  percentUsed: number;
  shouldWarn: boolean;
}

/**
 * Cost Tracker Class
 */
export class CostTracker {

  /**
   * Log a usage record to the database
   */
  async logUsage(record: Omit<UsageRecord, 'id' | 'createdAt'>): Promise<string> {
    const result = await query(
      `INSERT INTO ai_usage_logs
       (user_id, request_id, provider, model, task_type,
        input_tokens, output_tokens, cost, latency_ms, success, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        record.userId,
        record.requestId,
        record.provider,
        record.model,
        record.taskType,
        record.inputTokens,
        record.outputTokens,
        record.cost,
        record.latencyMs,
        record.success,
        record.errorMessage || null,
      ]
    );

    return result.rows[0].id;
  }

  /**
   * Get usage summary for a user
   */
  async getUsageSummary(
    userId: string,
    period: 'day' | 'week' | 'month'
  ): Promise<UsageSummary> {
    const now = new Date();
    let periodStart: Date;

    switch (period) {
      case 'day':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Get totals
    const totalsResult = await query(
      `SELECT
         COUNT(*) as total_requests,
         COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens,
         COALESCE(SUM(cost), 0) as total_cost
       FROM ai_usage_logs
       WHERE user_id = $1 AND created_at >= $2 AND success = true`,
      [userId, periodStart]
    );

    // Get breakdown by provider
    const byProviderResult = await query(
      `SELECT
         provider,
         COUNT(*) as requests,
         COALESCE(SUM(cost), 0) as cost
       FROM ai_usage_logs
       WHERE user_id = $1 AND created_at >= $2 AND success = true
       GROUP BY provider`,
      [userId, periodStart]
    );

    // Get breakdown by task type
    const byTaskResult = await query(
      `SELECT
         task_type,
         COUNT(*) as requests,
         COALESCE(SUM(cost), 0) as cost
       FROM ai_usage_logs
       WHERE user_id = $1 AND created_at >= $2 AND success = true
       GROUP BY task_type`,
      [userId, periodStart]
    );

    const totals = totalsResult.rows[0];

    const byProvider: Record<AIProvider, { requests: number; cost: number }> = {} as any;
    for (const row of byProviderResult.rows) {
      byProvider[row.provider as AIProvider] = {
        requests: parseInt(row.requests),
        cost: parseFloat(row.cost),
      };
    }

    const byTaskType: Record<TaskType, { requests: number; cost: number }> = {} as any;
    for (const row of byTaskResult.rows) {
      byTaskType[row.task_type as TaskType] = {
        requests: parseInt(row.requests),
        cost: parseFloat(row.cost),
      };
    }

    return {
      userId,
      period,
      periodStart,
      periodEnd: now,
      totalRequests: parseInt(totals.total_requests),
      totalTokens: parseInt(totals.total_tokens),
      totalCost: parseFloat(totals.total_cost),
      byProvider,
      byTaskType,
    };
  }

  /**
   * Check if a user has budget available
   */
  async checkBudget(
    userId: string,
    estimatedCost: number,
    userSettings: UserAISettings
  ): Promise<BudgetCheckResult> {
    // Get current month's spend
    const summary = await this.getUsageSummary(userId, 'month');
    const currentSpend = summary.totalCost;

    // Check monthly budget
    if (userSettings.monthlyBudget) {
      const percentUsed = (currentSpend / userSettings.monthlyBudget) * 100;
      const wouldExceed = currentSpend + estimatedCost > userSettings.monthlyBudget;

      if (wouldExceed) {
        return {
          allowed: false,
          reason: `Monthly budget of $${userSettings.monthlyBudget.toFixed(2)} would be exceeded`,
          currentSpend,
          budgetLimit: userSettings.monthlyBudget,
          percentUsed,
          shouldWarn: percentUsed >= userSettings.warnAtPercent,
        };
      }

      return {
        allowed: true,
        currentSpend,
        budgetLimit: userSettings.monthlyBudget,
        percentUsed,
        shouldWarn: percentUsed >= userSettings.warnAtPercent,
      };
    }

    // No budget limit set
    return {
      allowed: true,
      currentSpend,
      budgetLimit: 0,
      percentUsed: 0,
      shouldWarn: false,
    };
  }

  /**
   * Get recent usage records
   */
  async getRecentUsage(userId: string, limit: number = 50): Promise<UsageRecord[]> {
    const result = await query(
      `SELECT
         id, user_id, request_id, provider, model, task_type,
         input_tokens, output_tokens, cost, latency_ms, success,
         error_message, created_at
       FROM ai_usage_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      requestId: row.request_id,
      provider: row.provider,
      model: row.model,
      taskType: row.task_type,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      cost: parseFloat(row.cost),
      latencyMs: row.latency_ms,
      success: row.success,
      errorMessage: row.error_message,
      createdAt: row.created_at,
    }));
  }

  /**
   * Get cost trend over time
   */
  async getCostTrend(
    userId: string,
    days: number = 30
  ): Promise<{ date: string; cost: number; requests: number }[]> {
    const result = await query(
      `SELECT
         DATE(created_at) as date,
         COALESCE(SUM(cost), 0) as cost,
         COUNT(*) as requests
       FROM ai_usage_logs
       WHERE user_id = $1
         AND created_at >= NOW() - INTERVAL '${days} days'
         AND success = true
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [userId]
    );

    return result.rows.map(row => ({
      date: row.date.toISOString().split('T')[0],
      cost: parseFloat(row.cost),
      requests: parseInt(row.requests),
    }));
  }

  /**
   * Get provider performance stats
   */
  async getProviderStats(
    userId: string
  ): Promise<Record<AIProvider, { avgLatency: number; successRate: number; totalCost: number }>> {
    const result = await query(
      `SELECT
         provider,
         AVG(latency_ms) as avg_latency,
         AVG(CASE WHEN success THEN 1 ELSE 0 END) * 100 as success_rate,
         COALESCE(SUM(cost), 0) as total_cost
       FROM ai_usage_logs
       WHERE user_id = $1
         AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY provider`,
      [userId]
    );

    const stats: Record<AIProvider, { avgLatency: number; successRate: number; totalCost: number }> = {} as any;

    for (const row of result.rows) {
      stats[row.provider as AIProvider] = {
        avgLatency: Math.round(parseFloat(row.avg_latency)),
        successRate: Math.round(parseFloat(row.success_rate) * 10) / 10,
        totalCost: parseFloat(row.total_cost),
      };
    }

    return stats;
  }
}

// Singleton instance
export const costTracker = new CostTracker();

/**
 * Database migration for AI usage tracking
 */
export const AI_USAGE_MIGRATION = `
-- AI Usage Logs
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
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

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON ai_usage_logs(provider);

-- User AI Settings
CREATE TABLE IF NOT EXISTS user_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) UNIQUE,

  routing_mode VARCHAR(50) DEFAULT 'auto',
  preferred_provider VARCHAR(50),

  monthly_budget DECIMAL(10, 2),
  per_campaign_limit DECIMAL(10, 2),
  per_request_limit DECIMAL(10, 4),
  warn_at_percent INTEGER DEFAULT 80,

  -- Encrypted API keys (BYOK)
  openai_key_encrypted TEXT,
  anthropic_key_encrypted TEXT,
  google_key_encrypted TEXT,
  mistral_key_encrypted TEXT,
  deepseek_key_encrypted TEXT,
  cohere_key_encrypted TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Brand Voice Profiles (for Phase B)
CREATE TABLE IF NOT EXISTS brand_voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),

  name VARCHAR(255) NOT NULL,
  is_default BOOLEAN DEFAULT false,

  -- Voice characteristics
  tone VARCHAR(50),           -- casual, professional, playful, etc.
  formality INTEGER,          -- 0-100 scale
  personality TEXT[],         -- array of personality traits

  -- Patterns
  typical_opener TEXT,
  typical_closer TEXT,
  signature_style TEXT,
  avoid_phrases TEXT[],

  -- Example emails for training
  example_emails JSONB,

  -- Analysis results
  voice_analysis JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_voice_user ON brand_voice_profiles(user_id);
`;
