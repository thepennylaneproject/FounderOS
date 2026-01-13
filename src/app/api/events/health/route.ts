import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { eventLoggingEngine } from '@/intelligence/EventLoggingEngine';

/**
 * GET /api/events/health
 *
 * Health check endpoint for event logging system.
 * Returns status of event logging infrastructure with real data.
 *
 * Response: {
 *   status: "healthy" | "degraded" | "error",
 *   tables: { campaign_sends, workflow_executions, contact_score_snapshots, domain_health_alerts, triage_rules },
 *   recent_events: { last_campaign_send, last_workflow_execution, last_snapshot },
 *   message: string,
 *   timestamp: string
 * }
 */

export async function GET() {
    try {
        // Get health status from database
        const health = await eventLoggingEngine.getEventHealth();

        return NextResponse.json({
            status: health.status,
            tables: {
                campaign_sends: {
                    count_24h: health.tables.campaign_sends,
                    status: health.tables.campaign_sends > 0 ? 'active' : 'idle'
                },
                workflow_executions: {
                    count_24h: health.tables.workflow_executions,
                    status: health.tables.workflow_executions > 0 ? 'active' : 'idle'
                },
                contact_score_snapshots: {
                    count_24h: health.tables.contact_score_snapshots,
                    status: health.tables.contact_score_snapshots > 0 ? 'active' : 'idle'
                },
                domain_health_alerts: {
                    count_24h: health.tables.domain_health_alerts,
                    status: health.tables.domain_health_alerts > 0 ? 'active' : 'idle'
                },
                triage_rules: {
                    total: health.tables.triage_rules,
                    status: health.tables.triage_rules > 0 ? 'configured' : 'unconfigured'
                }
            },
            recent_events: {
                last_campaign_send: health.recent_events.last_campaign_send,
                last_workflow_execution: health.recent_events.last_workflow_execution,
                last_snapshot: health.recent_events.last_snapshot
            },
            timestamp: new Date().toISOString(),
            message: health.message
        });

    } catch (error) {
        console.error('Error checking event health:', error);
        return NextResponse.json(
            {
                status: 'error',
                message: 'Event logging health check failed',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}
