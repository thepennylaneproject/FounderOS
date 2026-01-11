import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
    request: Request,
    { params }: { params: { threadId: string } }
) {
    try {
        const threadId = params.threadId;

        const threadRes = await query('SELECT * FROM thread_states WHERE thread_id = $1', [threadId]);
        const messagesRes = await query(
            'SELECT * FROM email_messages WHERE thread_id = $1 ORDER BY received_at ASC',
            [threadId]
        );
        const receiptsRes = await query('SELECT * FROM receipts WHERE thread_id = $1', [threadId]);

        return NextResponse.json({
            thread: threadRes.rows[0] || null,
            messages: messagesRes.rows,
            receipts: receiptsRes.rows
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
