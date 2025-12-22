/**
 * GET /api/contacts/triage/stats
 * GET /api/contacts/triage/stats?type=actions
 *
 * Endpoints for triage statistics and action summaries
 *
 * GET: Retrieve triage statistics and recommended actions
 * ?type=stats: Full triage statistics
 * ?type=actions: Action summary with recommended actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { contactTriageEngine } from '@/intelligence/ContactTriageEngine';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'stats';

        if (type === 'actions') {
            // Get action summary
            const actions = await contactTriageEngine.getActionSummary();

            return NextResponse.json({
                success: true,
                type: 'actions',
                actions,
                total_actions: actions.reduce((sum, a) => sum + a.count, 0)
            });
        }

        // Default: Get statistics
        const stats = await contactTriageEngine.getTriageStats();

        return NextResponse.json({
            success: true,
            type: 'stats',
            stats,
            breakdown: {
                hot_leads: {
                    count: stats.hot_leads,
                    percentage: stats.total_contacts > 0 ? ((stats.hot_leads / stats.total_contacts) * 100).toFixed(1) : 0
                },
                active: {
                    count: stats.active,
                    percentage: stats.total_contacts > 0 ? ((stats.active / stats.total_contacts) * 100).toFixed(1) : 0
                },
                at_risk: {
                    count: stats.at_risk,
                    percentage: stats.total_contacts > 0 ? ((stats.at_risk / stats.total_contacts) * 100).toFixed(1) : 0
                },
                cold: {
                    count: stats.cold,
                    percentage: stats.total_contacts > 0 ? ((stats.cold / stats.total_contacts) * 100).toFixed(1) : 0
                },
                churned: {
                    count: stats.churned,
                    percentage: stats.total_contacts > 0 ? ((stats.churned / stats.total_contacts) * 100).toFixed(1) : 0
                }
            }
        });
    } catch (error) {
        console.error('Error fetching triage stats:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch triage statistics'
            },
            { status: 500 }
        );
    }
}
