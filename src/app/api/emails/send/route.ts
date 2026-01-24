import { NextRequest, NextResponse } from 'next/server';
import { emailClient } from '@/lib/email';
import supabase from '@/lib/supabase';
import { getAuthContext } from '@/lib/apiAuth';

export async function POST(request: NextRequest) {
    try {
        const auth = getAuthContext(request);
        const { from, to, subject, body, domainId, contactId, campaignId } = await request.json();
        const resolvedFrom = from || process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER || 'noreply@founderos.local';

        if (!resolvedFrom || !to || !subject || !body) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify campaign ownership if provided
        if (campaignId) {
            const { data: campaign, error: campaignError } = await supabase
                .from('campaigns')
                .select('id')
                .eq('id', campaignId)
                .eq('organization_id', auth.organizationId)
                .single();

            if (campaignError || !campaign) {
                return NextResponse.json({ error: 'Campaign not found or access denied' }, { status: 403 });
            }
        }

        // Verify contact ownership if provided
        if (contactId) {
            const { data: contact, error: contactError } = await supabase
                .from('contacts')
                .select('id')
                .eq('id', contactId)
                .eq('organization_id', auth.organizationId)
                .single();

            if (contactError || !contact) {
                return NextResponse.json({ error: 'Contact not found or access denied' }, { status: 403 });
            }
        }

        // 1. Log to DB first to get an ID for tracing
        const { data, error } = await supabase
            .from('email_logs')
            .insert({
                organization_id: auth.organizationId,
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
