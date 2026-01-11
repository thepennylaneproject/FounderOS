import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(
    request: Request,
    { params }: { params: { threadId: string } }
) {
    try {
        const { lane } = await request.json();
        if (!lane) {
            return NextResponse.json({ error: 'Missing lane' }, { status: 400 });
        }

        await query(
            `UPDATE thread_states
             SET lane = $1, user_overridden = true, reason = 'User override', updated_at = CURRENT_TIMESTAMP
             WHERE thread_id = $2`,
            [lane, params.threadId]
        );

        return NextResponse.json({ status: 'ok' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
