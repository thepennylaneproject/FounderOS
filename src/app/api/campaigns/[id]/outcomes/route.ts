/**
 * GET /api/campaigns/{id}/outcomes
 * POST /api/campaigns/{id}/outcomes/recalculate
 *
 * Endpoints for campaign outcome data ("What Happened" layer)
 *
 * GET: Retrieve cached campaign outcomes
 * - engagement metrics (opens, clicks, replies, bounces)
 * - contact impact (score changes, new hot leads)
 * - top engaged and unengaged contacts
 *
 * POST /recalculate: Force recalculation of outcomes
 * - Useful after email logs are updated
 * - Called by daily batch job or admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { campaignOutcomeEngine } from '@/intelligence/CampaignOutcomeEngine';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const campaignId = params.id;

        // Try cached outcomes first (fast path)
        const cached = await campaignOutcomeEngine.getCachedOutcomes(campaignId);

        if (cached) {
            return NextResponse.json({
                success: true,
                campaign_id: campaignId,
                source: 'cache',
                data: cached
            });
        }

        // No cache, calculate now
        const metrics = await campaignOutcomeEngine.calculateCampaignMetrics(campaignId);
        const impact = await campaignOutcomeEngine.measureCampaignImpact(campaignId);
        const outcomes = await campaignOutcomeEngine.getCampaignContactOutcomes(campaignId);

        return NextResponse.json({
            success: true,
            campaign_id: campaignId,
            source: 'calculated',
            data: {
                metrics,
                impact,
                contact_outcomes: {
                    total: outcomes.length,
                    by_status: {
                        replied: outcomes.filter(o => o.status === 'replied').length,
                        clicked: outcomes.filter(o => o.status === 'clicked').length,
                        opened: outcomes.filter(o => o.status === 'opened').length,
                        unopened: outcomes.filter(o => o.status === 'unopened').length,
                        bounced: outcomes.filter(o => o.status === 'bounced').length
                    },
                    details: outcomes
                },
                calculated_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error fetching campaign outcomes:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch campaign outcomes'
            },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const campaignId = params.id;
        const url = new URL(request.url);

        if (url.pathname.endsWith('/recalculate')) {
            // Force recalculation
            await campaignOutcomeEngine.cacheOutcomes(campaignId);

            return NextResponse.json({
                success: true,
                message: 'Campaign outcomes recalculated and cached',
                campaign_id: campaignId,
                recalculated_at: new Date().toISOString()
            });
        }

        return NextResponse.json(
            { error: 'Invalid endpoint' },
            { status: 404 }
        );
    } catch (error) {
        console.error('Error recalculating campaign outcomes:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to recalculate outcomes'
            },
            { status: 500 }
        );
    }
}
