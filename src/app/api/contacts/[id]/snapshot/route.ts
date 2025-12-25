import { NextRequest, NextResponse } from 'next/server';
import { eventLoggingEngine } from '@/intelligence/EventLoggingEngine';

/**
 * POST /api/contacts/{id}/snapshot
 *
 * Captures a contact's current engagement metrics and saves to contact_score_snapshots.
 * Called before and after major actions (campaigns, workflows) to measure impact.
 *
 * Body: {
 *   snapshot_reason: string,    // "before_campaign", "after_workflow", "daily_recalc", "email_received"
 *   related_campaign_id?: string,
 *   related_workflow_id?: string
 * }
 *
 * Response: { success: boolean, snapshot_id: string, scores: {...}, captured_at: string }
 */

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const contactId = params.id;
        const body = await request.json();

        const {
            snapshot_reason = 'daily_recalc',
            related_campaign_id,
            related_workflow_id
        } = body;

        // Validation
        if (!snapshot_reason) {
            return NextResponse.json(
                { error: 'snapshot_reason required' },
                { status: 400 }
            );
        }

        // Capture contact snapshot to database
        const snapshot = await eventLoggingEngine.captureContactSnapshot(
            contactId,
            snapshot_reason,
            related_campaign_id,
            related_workflow_id
        );

        return NextResponse.json({
            success: true,
            snapshot_id: snapshot.id,
            contact_id: contactId,
            snapshot_reason: snapshot.snapshot_reason,
            scores: {
                health_score: snapshot.health_score,
                momentum_score: snapshot.momentum_score,
                is_hot_lead: snapshot.is_hot_lead,
                closer_signal: snapshot.closer_signal
            },
            captured_at: snapshot.captured_at
        });

    } catch (error) {
        console.error('Error creating contact snapshot:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create contact snapshot'
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/contacts/{id}/snapshot?snapshot_reason=before_campaign&limit=1
 *
 * Retrieves recent snapshots for a contact, filtered by reason.
 */

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const contactId = params.id;
        const { searchParams } = new URL(request.url);
        const snapshotReason = searchParams.get('snapshot_reason') || undefined;
        const limit = parseInt(searchParams.get('limit') || '10', 10);

        // Fetch snapshots from database
        const snapshots = await eventLoggingEngine.getContactSnapshots(
            contactId,
            snapshotReason,
            limit
        );

        return NextResponse.json({
            contact_id: contactId,
            snapshots: snapshots.map(s => ({
                id: s.id,
                snapshot_reason: s.snapshot_reason,
                related_campaign_id: s.related_campaign_id,
                related_workflow_id: s.related_workflow_id,
                health_score: s.health_score,
                momentum_score: s.momentum_score,
                is_hot_lead: s.is_hot_lead,
                closer_signal: s.closer_signal,
                captured_at: s.captured_at
            })),
            filters: { snapshot_reason: snapshotReason, limit },
            count: snapshots.length
        });

    } catch (error) {
        console.error('Error fetching contact snapshots:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch snapshots'
            },
            { status: 500 }
        );
    }
}
