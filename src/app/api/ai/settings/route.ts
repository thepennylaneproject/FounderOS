/**
 * AI Settings API Route
 *
 * Manage user AI preferences, BYOK keys, and budget controls
 */

import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { getRouter } from '@/ai';
import { AIProvider, RoutingMode } from '@/ai/types';

/**
 * GET /api/ai/settings
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

    const { data: settings, error } = await supabase
      .from('user_ai_settings')
      .select(`
        routing_mode,
        preferred_provider,
        monthly_budget,
        per_campaign_limit,
        per_request_limit,
        warn_at_percent,
        openai_key_encrypted,
        anthropic_key_encrypted,
        google_key_encrypted,
        mistral_key_encrypted,
        deepseek_key_encrypted
      `)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!settings) {
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

    // Build list of configured providers
    const configuredProviders: AIProvider[] = [];
    if (settings.openai_key_encrypted) configuredProviders.push('openai');
    if (settings.anthropic_key_encrypted) configuredProviders.push('anthropic');
    if (settings.google_key_encrypted) configuredProviders.push('google');
    if (settings.mistral_key_encrypted) configuredProviders.push('mistral');
    if (settings.deepseek_key_encrypted) configuredProviders.push('deepseek');

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
    const { error } = await supabase
      .from('user_ai_settings')
      .upsert({
        user_id: userId,
        routing_mode: routingMode || 'auto',
        preferred_provider: preferredProvider || null,
        monthly_budget: monthlyBudget || null,
        per_campaign_limit: perCampaignLimit || null,
        per_request_limit: perRequestLimit || null,
        warn_at_percent: warnAtPercent || 80,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) throw error;
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
    const providerImpl = await import(`@/ai/providers/${provider}`);
    const isValid = await providerImpl[`${provider}Provider`].validateApiKey(apiKey);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 400 }
      );
    }

    const keyColumn = `${provider}_key_encrypted`;

    // Ensure user has a settings row
    await supabase
      .from('user_ai_settings')
      .upsert({ user_id: userId }, { onConflict: 'user_id' });

    // Update the key
    const { error } = await supabase
      .from('user_ai_settings')
      .update({ [keyColumn]: apiKey, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) throw error;

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

    const { error } = await supabase
      .from('user_ai_settings')
      .update({ [keyColumn]: null, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) throw error;

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
