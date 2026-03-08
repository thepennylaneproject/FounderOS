import { NextRequest, NextResponse } from 'next/server';
import { eventLoggingEngine } from '@/intelligence/EventLoggingEngine';

/**
 * POST /api/campaigns/{id}/log-sends
 *
 * Logs a batch of campaign sends to the campaign_sends table.
 * Called immediately after SMTP sends to create audit trail.
 *
 * Body: {
 *   recipients: [
 *     { email: string, contact_id?: string },
 *     ...
 *   ]
 * }
 *
 * Response: { success: boolean, created: number, errors: any[], campaign_id: string }
 */

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    let recipients: any[] = [];
    try {
        const { id: campaignId } = await params;
        const body = await request.json();
        recipients = body?.recipients || [];

        if (!Array.isArray(recipients) || recipients.length === 0) {
            return NextResponse.json(
                { error: 'recipients array required' },
                { status: 400 }
            );
        }

        // Log all campaign sends to database
        const result = await eventLoggingEngine.logCampaignSends(
            campaignId,
            recipients.map(r => ({
                email: r.email || r.recipient_email,
                contact_id: r.contact_id || r.recipient_id || 'unknown'
            }))
        );

        return NextResponse.json({
            success: true,
            created: result.created,
            failed: result.failed,
            campaign_id: campaignId,
            message: `Logged ${result.created} campaign sends${result.failed > 0 ? ` (${result.failed} failed)` : ''}`
        });

    } catch (error) {
        console.error('Error logging campaign sends:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to log campaign sends',
                created: 0,
                failed: recipients?.length || 0
            },
            { status: 500 }
        );
    }
}
