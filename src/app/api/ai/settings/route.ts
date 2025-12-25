/**
 * AI Settings API Route
 *
 * Manage user AI preferences, BYOK keys, and budget controls
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getRouter } from '@/ai';
import { AIProvider, RoutingMode } from '@/ai/types';

/**
 * GET /api/ai/settings
 *
 * Get user's AI settings
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const result = await query(
      `SELECT
         routing_mode,
         preferred_provider,
         monthly_budget,
         per_campaign_limit,
         per_request_limit,
         warn_at_percent,
         openai_key_encrypted IS NOT NULL as has_openai_key,
         anthropic_key_encrypted IS NOT NULL as has_anthropic_key,
         google_key_encrypted IS NOT NULL as has_google_key,
         mistral_key_encrypted IS NOT NULL as has_mistral_key,
         deepseek_key_encrypted IS NOT NULL as has_deepseek_key
       FROM user_ai_settings
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Return defaults
      return NextResponse.json({
        routingMode: 'auto',
        preferredProvider: null,
        monthlyBudget: null,
        perCampaignLimit: null,
        perRequestLimit: null,
        warnAtPercent: 80,
        configuredProviders: [],
        availableProviders: getRouter().getAvailableProviders(),
      });
    }

    const settings = result.rows[0];

    // Build list of configured providers
    const configuredProviders: AIProvider[] = [];
    if (settings.has_openai_key) configuredProviders.push('openai');
    if (settings.has_anthropic_key) configuredProviders.push('anthropic');
    if (settings.has_google_key) configuredProviders.push('google');
    if (settings.has_mistral_key) configuredProviders.push('mistral');
    if (settings.has_deepseek_key) configuredProviders.push('deepseek');

    return NextResponse.json({
      routingMode: settings.routing_mode,
      preferredProvider: settings.preferred_provider,
      monthlyBudget: settings.monthly_budget ? parseFloat(settings.monthly_budget) : null,
      perCampaignLimit: settings.per_campaign_limit ? parseFloat(settings.per_campaign_limit) : null,
      perRequestLimit: settings.per_request_limit ? parseFloat(settings.per_request_limit) : null,
      warnAtPercent: settings.warn_at_percent,
      configuredProviders,
      availableProviders: getRouter().getAvailableProviders(),
    });
  } catch (error: any) {
    console.error('Get AI Settings Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/settings
 *
 * Update user's AI settings
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      routingMode,
      preferredProvider,
      monthlyBudget,
      perCampaignLimit,
      perRequestLimit,
      warnAtPercent,
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Validate routing mode
    const validModes: RoutingMode[] = ['auto', 'quality', 'budget', 'speed', 'specific'];
    if (routingMode && !validModes.includes(routingMode)) {
      return NextResponse.json(
        { error: 'Invalid routing mode' },
        { status: 400 }
      );
    }

    // Upsert settings
    await query(
      `INSERT INTO user_ai_settings (user_id, routing_mode, preferred_provider,
         monthly_budget, per_campaign_limit, per_request_limit, warn_at_percent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE SET
         routing_mode = COALESCE($2, user_ai_settings.routing_mode),
         preferred_provider = $3,
         monthly_budget = COALESCE($4, user_ai_settings.monthly_budget),
         per_campaign_limit = COALESCE($5, user_ai_settings.per_campaign_limit),
         per_request_limit = COALESCE($6, user_ai_settings.per_request_limit),
         warn_at_percent = COALESCE($7, user_ai_settings.warn_at_percent),
         updated_at = NOW()`,
      [
        userId,
        routingMode || 'auto',
        preferredProvider || null,
        monthlyBudget || null,
        perCampaignLimit || null,
        perRequestLimit || null,
        warnAtPercent || 80,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update AI Settings Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ai/settings/keys
 *
 * Add or update a provider API key (BYOK)
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, provider, apiKey } = body;

    if (!userId || !provider || !apiKey) {
      return NextResponse.json(
        { error: 'userId, provider, and apiKey are required' },
        { status: 400 }
      );
    }

    // Validate provider
    const validProviders: AIProvider[] = ['openai', 'anthropic', 'google', 'mistral', 'deepseek', 'cohere'];
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // Validate API key by making a test request
    const router = getRouter();
    const providerImpl = await import(`@/ai/providers/${provider}`);
    const isValid = await providerImpl[`${provider}Provider`].validateApiKey(apiKey);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 400 }
      );
    }

    // TODO: Encrypt the key before storing
    // For now, we store it directly (in production, use proper encryption)
    const keyColumn = `${provider}_key_encrypted`;

    // Ensure user has a settings row
    await query(
      `INSERT INTO user_ai_settings (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    // Update the key
    await query(
      `UPDATE user_ai_settings
       SET ${keyColumn} = $1, updated_at = NOW()
       WHERE user_id = $2`,
      [apiKey, userId]  // TODO: Encrypt apiKey
    );

    return NextResponse.json({
      success: true,
      message: `${provider} API key configured successfully`,
    });
  } catch (error: any) {
    console.error('Update API Key Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai/settings/keys
 *
 * Remove a provider API key
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const provider = searchParams.get('provider');

    if (!userId || !provider) {
      return NextResponse.json(
        { error: 'userId and provider are required' },
        { status: 400 }
      );
    }

    const keyColumn = `${provider}_key_encrypted`;

    await query(
      `UPDATE user_ai_settings
       SET ${keyColumn} = NULL, updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      message: `${provider} API key removed`,
    });
  } catch (error: any) {
    console.error('Delete API Key Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
