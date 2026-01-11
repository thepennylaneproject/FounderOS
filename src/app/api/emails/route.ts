import { NextResponse } from 'next/server';
import { emailClient } from '@/lib/email';

export async function GET() {
    const host = process.env.IMAP_HOST;
    const port = process.env.IMAP_PORT ? parseInt(process.env.IMAP_PORT, 10) : 993;
    const user = process.env.IMAP_USER;
    const pass = process.env.IMAP_PASS;

    if (!host || !user || !pass) {
        return NextResponse.json([]);
    }

    try {
        const messages = await emailClient.fetchInbox({ host, port, user, pass });
        return NextResponse.json(messages);
    } catch (error: any) {
        console.error('Inbox fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
