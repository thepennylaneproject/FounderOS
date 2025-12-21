import { NextResponse } from 'next/server';
import { emailClient } from '@/lib/email';
import { query } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { from, to, subject, body, domainId, contactId, campaignId } = await request.json();

        if (!from || !to || !subject || !body) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Log to DB first to get an ID for tracing
        const logRes = await query(
            `INSERT INTO email_logs (campaign_id, contact_id, domain_id, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
            [campaignId || null, contactId || null, domainId || null, 'sent']
        );
        const logId = logRes.rows[0].id;

        // 2. Send the email with the logId for tracking
        await emailClient.sendEmail({ from, to, subject, body }, logId);

        return NextResponse.json({ status: 'success', trackingId: logId });
    } catch (error: any) {
        console.error('Email send error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
