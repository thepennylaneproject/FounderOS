import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(
    request: Request,
    { params }: { params: { threadId: string } }
) {
    try {
        const { needs_review } = await request.json();
        await query(
            `UPDATE thread_states
             SET needs_review = $1, user_overridden = true, updated_at = CURRENT_TIMESTAMP
             WHERE thread_id = $2`,
            [!!needs_review, params.threadId]
        );

        return NextResponse.json({ status: 'ok' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
