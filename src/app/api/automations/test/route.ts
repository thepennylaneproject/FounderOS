import { NextResponse } from 'next/server';
import { getRules, getThreadMessages } from '@/inbox/db';
import { classifyThread } from '@/inbox/classifier';

export async function POST(request: Request) {
    try {
        const { thread_id } = await request.json();
        if (!thread_id) {
            return NextResponse.json({ error: 'Missing thread_id' }, { status: 400 });
        }

        const [rules, messages] = await Promise.all([
            getRules(),
            getThreadMessages(thread_id)
        ]);

        if (messages.length === 0) {
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
        }

        const result = classifyThread(messages, rules);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
