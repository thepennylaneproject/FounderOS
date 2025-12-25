/**
 * AI Campaign Strategist API Routes
 *
 * Design complete email campaign strategies
 */

import { NextResponse } from 'next/server';
import {
  getCampaignStrategist,
  StrategyRequest,
  CampaignGoal,
} from '@/ai/CampaignStrategist';

const strategist = getCampaignStrategist();

/**
 * GET /api/ai/strategist
 *
 * Get campaign ideas and templates
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'ideas';
    const userId = searchParams.get('userId') || 'anonymous';

    switch (action) {
      /**
       * Get campaign ideas
       */
      case 'ideas': {
        const goal = searchParams.get('goal') as CampaignGoal | null;
        const ideas = await strategist.getCampaignIdeas(userId, goal || undefined);

        return NextResponse.json({ ideas });
      }

      /**
       * Get available campaign goals
       */
      case 'goals': {
        const goals: { value: CampaignGoal; label: string; description: string }[] = [
          { value: 'lead-generation', label: 'Lead Generation', description: 'Capture new leads and grow email list' },
          { value: 'product-launch', label: 'Product Launch', description: 'Launch a new product with maximum impact' },
          { value: 'nurture-sequence', label: 'Nurture Sequence', description: 'Educate and warm up leads over time' },
          { value: 'reactivation', label: 'Reactivation', description: 'Re-engage inactive subscribers' },
          { value: 'onboarding', label: 'Onboarding', description: 'Welcome and activate new customers' },
          { value: 'promotion', label: 'Promotion', description: 'Drive sales with special offers' },
          { value: 'event-promotion', label: 'Event Promotion', description: 'Fill registrations for an event' },
          { value: 'content-marketing', label: 'Content Marketing', description: 'Build authority through content' },
          { value: 'customer-retention', label: 'Customer Retention', description: 'Keep customers engaged' },
          { value: 'upsell-cross-sell', label: 'Upsell/Cross-sell', description: 'Increase revenue from existing customers' },
          { value: 'feedback-collection', label: 'Feedback Collection', description: 'Gather reviews and testimonials' },
          { value: 'brand-awareness', label: 'Brand Awareness', description: 'Increase brand recognition' },
        ];

        return NextResponse.json({ goals });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Strategist GET Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/strategist
 *
 * Generate strategies and analyze campaigns
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      /**
       * Generate a complete campaign strategy
       */
      case 'generate-strategy': {
        const {
          campaignGoal,
          productOrService,
          targetAudience,
          audienceSize,
          industry,
          currentChallenges,
          budget,
          timeline,
          resourceLevel,
        } = body;

        if (!campaignGoal || !productOrService || !targetAudience) {
          return NextResponse.json(
            { error: 'campaignGoal, productOrService, and targetAudience are required' },
            { status: 400 }
          );
        }

        const strategyRequest: StrategyRequest = {
          userId,
          campaignGoal,
          productOrService,
          targetAudience,
          audienceSize,
          industry,
          currentChallenges,
          budget,
          timeline,
          resourceLevel,
        };

        const strategy = await strategist.generateStrategy(strategyRequest);

        return NextResponse.json({ strategy });
      }

      /**
       * Analyze an existing campaign
       */
      case 'analyze': {
        const { emails, overallOpenRate, overallClickRate, goal } = body;

        if (!emails || !Array.isArray(emails)) {
          return NextResponse.json(
            { error: 'emails array is required' },
            { status: 400 }
          );
        }

        const analysis = await strategist.analyzeCampaign(userId, {
          emails,
          overallOpenRate,
          overallClickRate,
          goal,
        });

        return NextResponse.json(analysis);
      }

      /**
       * Suggest optimal send times
       */
      case 'suggest-send-time': {
        const { timezone, industry, audienceType, previousBestTimes } = body;

        const suggestions = await strategist.suggestSendTime(userId, {
          timezone,
          industry,
          audienceType,
          previousBestTimes,
        });

        return NextResponse.json(suggestions);
      }

      /**
       * Generate A/B test ideas
       */
      case 'ab-test-ideas': {
        const { subject, content, cta } = body;

        if (!subject || !content || !cta) {
          return NextResponse.json(
            { error: 'subject, content, and cta are required' },
            { status: 400 }
          );
        }

        const tests = await strategist.generateABTestIdeas(userId, {
          subject,
          content,
          cta,
        });

        return NextResponse.json({ tests });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Strategist POST Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
