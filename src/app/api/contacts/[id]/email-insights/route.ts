/**
 * GET /api/contacts/{id}/email-insights
 *
 * Get all email analyses for a specific contact
 */

import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: contactId } = await params;
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
        const { data: insights, error: insightsError } = await supabase
            .from('analyzed_emails')
            .select(`
                id,
                email_log_id,
                intent,
                sentiment,
                urgency,
                timeline_mentioned,
                decision_timeline,
                buying_signals,
                objections,
                action_items,
                questions_asked,
                recommended_action,
                recommended_action_description,
                suggested_score_delta,
                suggested_momentum_delta,
                should_mark_hot_lead,
                suggested_closer_signal,
                confidence_score,
                created_at
            `)
            .eq('contact_id', contactId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (insightsError) throw insightsError;

        // Get total count
        const { count, error: countError } = await supabase
            .from('analyzed_emails')
            .select('*', { count: 'exact', head: true })
            .eq('contact_id', contactId);

        if (countError) throw countError;

        const total = count || 0;

        return NextResponse.json({
            success: true,
            contact_id: contactId,
            insights: insights || [],
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
