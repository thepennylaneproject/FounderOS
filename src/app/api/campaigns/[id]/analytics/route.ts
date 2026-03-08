/**
 * GET /api/campaigns/{id}/analytics
 *
 * Retrieve detailed analytics for a specific campaign including:
 * - Engagement metrics (opens, clicks, replies, bounces)
 * - Comparison to founder's average
 * - Segment performance breakdown
 * - Open timeline
 * - Actionable recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { campaignAnalyticsEngine } from '@/intelligence/CampaignAnalyticsEngine';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: campaignId } = await params;

        // Generate analytics
        const analytics = await campaignAnalyticsEngine.generateAnalytics(campaignId);

        return NextResponse.json({
            success: true,
            campaign_id: campaignId,
            data: analytics,
            generated_at: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error generating campaign analytics:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate campaign analytics'
            },
            { status: 500 }
        );
    }
}
