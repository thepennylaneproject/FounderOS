/**
 * GET /api/campaigns/analytics/dashboard
 * GET /api/campaigns/analytics/dashboard?daysBack=30
 *
 * Retrieve aggregate campaign analytics dashboard for a time period
 * Shows:
 * - Overall metrics (avg open rate, click rate, etc.)
 * - Best and worst performing campaigns
 * - Trend line
 * - Segment performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { campaignAnalyticsEngine } from '@/intelligence/CampaignAnalyticsEngine';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const daysBack = parseInt(searchParams.get('daysBack') || '30', 10);

        // Validate daysBack
        if (daysBack < 1 || daysBack > 365) {
            return NextResponse.json(
                { error: 'daysBack must be between 1 and 365' },
                { status: 400 }
            );
        }

        // Generate dashboard analytics
        const analytics = await campaignAnalyticsEngine.generateDashboardAnalytics(daysBack);

        return NextResponse.json({
            success: true,
            period: {
                days_back: daysBack,
                from_date: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString(),
                to_date: new Date().toISOString()
            },
            data: analytics,
            generated_at: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error generating dashboard analytics:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate dashboard analytics'
            },
            { status: 500 }
        );
    }
}
