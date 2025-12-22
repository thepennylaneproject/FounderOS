/**
 * GET /api/contacts/{id}/email-insights
 *
 * Get all email analyses for a specific contact
 * Shows recent emails received, their analysis, and sentiment/intent
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const contactId = params.id;
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        // Validate inputs
        if (limit < 1 || limit > 100) {
            return NextResponse.json(
                { error: 'limit must be between 1 and 100' },
                { status: 400 }
            );
        }

        // Get email insights for contact
        const result = await query(
            `SELECT
                ae.id,
                ae.email_log_id,
                ae.intent,
                ae.sentiment,
                ae.urgency,
                ae.timeline_mentioned,
                ae.decision_timeline,
                ae.buying_signals,
                ae.objections,
                ae.action_items,
                ae.questions_asked,
                ae.recommended_action,
                ae.recommended_action_description,
                ae.suggested_score_delta,
                ae.suggested_momentum_delta,
                ae.should_mark_hot_lead,
                ae.suggested_closer_signal,
                ae.confidence_score,
                ae.created_at,
                el.subject,
                el.created_at as email_received_at
            FROM analyzed_emails ae
            JOIN email_logs el ON ae.email_log_id = el.id
            WHERE ae.contact_id = $1
            ORDER BY el.created_at DESC
            LIMIT $2 OFFSET $3`,
            [contactId, limit, offset]
        );

        // Get total count
        const countResult = await query(
            'SELECT COUNT(*) as total FROM analyzed_emails WHERE contact_id = $1',
            [contactId]
        );

        const insights = result.rows || [];
        const total = parseInt(countResult.rows?.[0]?.total || '0', 10);

        return NextResponse.json({
            success: true,
            contact_id: contactId,
            insights,
            pagination: {
                limit,
                offset,
                total,
                has_more: offset + limit < total
            }
        });
    } catch (error) {
        console.error('Error fetching email insights:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch email insights'
            },
            { status: 500 }
        );
    }
}
