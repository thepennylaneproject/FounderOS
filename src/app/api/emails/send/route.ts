import { NextResponse } from 'next/server';
import { emailClient } from '@/lib/email';
import supabase from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const { from, to, subject, body, domainId, contactId, campaignId } = await request.json();
        const resolvedFrom = from || process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER || 'noreply@founderos.local';

        if (!resolvedFrom || !to || !subject || !body) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Log to DB first to get an ID for tracing
        const { data, error } = await supabase
            .from('email_logs')
            .insert({
                campaign_id: campaignId || null,
                contact_id: contactId || null,
                domain_id: domainId || null,
                sender: resolvedFrom,
                recipient: to,
                status: 'sent'
            })
            .select('id')
            .single();

        if (error) throw error;
        const logId = data.id;

        // 2. Send the email with the logId for tracking
        await emailClient.sendEmail({ from: resolvedFrom, to, subject, body }, logId);

        return NextResponse.json({ status: 'success', trackingId: logId });
    } catch (error: any) {
        console.error('Email send error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
