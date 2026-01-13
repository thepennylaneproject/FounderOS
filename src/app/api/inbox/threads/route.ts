import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import supabase from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const lane = searchParams.get('lane');
        const category = searchParams.get('category');
        const needsReview = searchParams.get('needs_review');
        const risk = searchParams.get('risk');

        // Build query for thread_states with filters
        let query = supabase.from('thread_states').select('*');

        if (lane) {
            query = query.eq('lane', lane);
        }
        if (category) {
            query = query.eq('category', category);
        }
        if (needsReview !== null && needsReview !== undefined) {
            query = query.eq('needs_review', needsReview === 'true');
        }
        if (risk) {
            query = query.eq('risk_level', risk);
        }

        const { data: threadStates, error: tsError } = await query;
        if (tsError) throw tsError;

        // Get all messages
        const { data: messages, error: msgError } = await supabase
            .from('email_messages')
            .select('*')
            .order('received_at', { ascending: false });

        if (msgError) throw msgError;

        // Get receipts
        const { data: receipts, error: rcpError } = await supabase
            .from('receipts')
            .select('thread_id');

        if (rcpError) throw rcpError;

        const receiptThreadIds = new Set((receipts || []).map(r => r.thread_id));

        // Create a map of latest message per thread
        const latestByThread = new Map<string, any>();
        const messageCountByThread = new Map<string, number>();

        for (const msg of (messages || [])) {
            if (!latestByThread.has(msg.thread_id)) {
                latestByThread.set(msg.thread_id, msg);
            }
            messageCountByThread.set(
                msg.thread_id,
                (messageCountByThread.get(msg.thread_id) || 0) + 1
            );
        }

        // Join thread states with latest messages
        const result = (threadStates || []).map(ts => {
            const latest = latestByThread.get(ts.thread_id);
            return {
                ...ts,
                subject: latest?.subject || null,
                snippet: latest?.snippet || null,
                received_at: latest?.received_at || null,
                from_name: latest?.from_name || null,
                from_email: latest?.from_email || null,
                message_count: messageCountByThread.get(ts.thread_id) || 0,
                has_receipt: receiptThreadIds.has(ts.thread_id)
            };
        }).sort((a, b) => {
            const dateA = a.received_at ? new Date(a.received_at).getTime() : 0;
            const dateB = b.received_at ? new Date(b.received_at).getTime() : 0;
            return dateB - dateA;
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error in inbox threads:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
