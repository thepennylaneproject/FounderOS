/**
 * AI Generation API Route
 *
 * POST /api/ai/generate
 *
 * Generates content using the multi-model AI router
 */

import { NextResponse } from 'next/server';
import { getRouter } from '@/ai';
import { GenerationRequest, RoutingMode, TaskType } from '@/ai/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      prompt,
      systemPrompt,
      maxTokens,
      temperature,
      routingMode,
      preferredProvider,
      taskType,
      userId,
    } = body;

    // Validate required fields
    if (!prompt) {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Build request
    const generationRequest: GenerationRequest = {
      prompt,
      systemPrompt,
      maxTokens,
      temperature,
      routingMode: routingMode as RoutingMode,
      preferredProvider,
      taskType: taskType as TaskType,
      userId,
    };

    // Get router and generate
    const router = getRouter();
    const response = await router.generate(generationRequest);

    return NextResponse.json({
      success: true,
      content: response.content,
      model: response.model,
      provider: response.provider,
      usage: response.usage,
      cost: response.cost,
      latencyMs: response.latencyMs,
    });
  } catch (error: any) {
    console.error('AI Generation Error:', error);

    // Handle specific error types
    if (error.code === 'BUDGET_EXCEEDED') {
      return NextResponse.json(
        { error: error.message, code: 'BUDGET_EXCEEDED' },
        { status: 402 } // Payment Required
      );
    }

    if (error.code === 'NO_PROVIDERS_AVAILABLE') {
      return NextResponse.json(
        { error: 'No AI providers configured. Please add API keys in settings.', code: 'NO_PROVIDERS' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Generation failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/generate/estimate
 *
 * Estimate cost before generation
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const prompt = searchParams.get('prompt') || '';
    const systemPrompt = searchParams.get('systemPrompt') || '';
    const routingMode = searchParams.get('routingMode') || 'auto';

    if (!prompt) {
      return NextResponse.json(
        { error: 'prompt query parameter is required' },
        { status: 400 }
      );
    }

    const router = getRouter();
    const estimate = router.estimateCost(
      prompt,
      systemPrompt,
      routingMode as RoutingMode
    );

    return NextResponse.json({
      model: estimate.model,
      lowEstimate: estimate.lowEstimate,
      highEstimate: estimate.highEstimate,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
