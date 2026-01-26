import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import supabase from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const lane = searchParams.get('lane');
        const category = searchParams.get('category');
        const needsReview = searchParams.get('needs_review');
        const risk = searchParams.get('risk');

        // Extract pagination parameters
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));
        const offset = (page - 1) * pageSize;

        // Build query for thread_states with filters and pagination
        let query = supabase
            .from('thread_states')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1);

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

        const { data: threadStates, error: tsError, count: totalCount } = await query;
        if (tsError) throw tsError;

        if (!threadStates || threadStates.length === 0) {
            return NextResponse.json({
                threads: [],
                pagination: {
                    page,
                    pageSize,
                    total: 0,
                    pages: 0,
                    hasMore: false
                }
            });
        }

        // Get latest message for each thread in this page
        const threadIds = threadStates.map(ts => ts.thread_id);

        const { data: messages, error: msgError } = await supabase
            .from('email_messages')
            .select('*')
            .in('thread_id', threadIds)
            .order('received_at', { ascending: false });

        if (msgError) throw msgError;

        // Get receipts for threads in this page (limited query)
        const { data: receipts, error: rcpError } = await supabase
            .from('receipts')
            .select('thread_id')
            .in('thread_id', threadIds);

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
        });

        const totalPages = Math.ceil((totalCount || 0) / pageSize);

        return NextResponse.json({
            threads: result,
            pagination: {
                page,
                pageSize,
                total: totalCount || 0,
                pages: totalPages,
                hasMore: page < totalPages
            }
        });
    } catch (error: any) {
        console.error('Error in inbox threads:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
