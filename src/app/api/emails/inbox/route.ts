import { NextResponse } from 'next/server';
import { emailClient } from '@/lib/email';

export async function POST(request: Request) {
    try {
        const config = await request.json();

        if (!config.host || !config.user || !config.pass) {
            return NextResponse.json({ error: 'Missing mailbox credentials' }, { status: 400 });
        }

        const messages = await emailClient.fetchInbox({
            host: config.host,
            port: config.port || 993,
            user: config.user,
            pass: config.pass
        });

        return NextResponse.json(messages);
    } catch (error: any) {
        console.error('Inbox fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
