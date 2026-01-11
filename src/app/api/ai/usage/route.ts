/**
 * AI Usage Analytics API Route
 *
 * Get usage statistics, cost breakdowns, and budget status
 */

import { NextResponse } from 'next/server';
import { costTracker } from '@/ai';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/usage
 *
 * Get usage summary for a user
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const period = searchParams.get('period') || 'month';

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Validate period
    if (!['day', 'week', 'month'].includes(period)) {
      return NextResponse.json(
        { error: 'period must be day, week, or month' },
        { status: 400 }
      );
    }

    const summary = await costTracker.getUsageSummary(
      userId,
      period as 'day' | 'week' | 'month'
    );

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error('Get Usage Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
