import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET(
    request: Request,
    { params }: { params: { threadId: string } }
) {
    try {
        const threadId = params.threadId;

        const [threadRes, messagesRes, receiptsRes] = await Promise.all([
            supabase.from('thread_states').select('*').eq('thread_id', threadId).single(),
            supabase.from('email_messages').select('*').eq('thread_id', threadId).order('received_at', { ascending: true }),
            supabase.from('receipts').select('*').eq('thread_id', threadId)
        ]);

        return NextResponse.json({
            thread: threadRes.data || null,
            messages: messagesRes.data || [],
            receipts: receiptsRes.data || []
        });
    } catch (error: any) {
        console.error('Error fetching thread:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
