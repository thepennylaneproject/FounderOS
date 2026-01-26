import { NextResponse, NextRequest } from 'next/server';
import supabase from '@/lib/supabase';
import { query } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const trackingId = params.id;

    try {
        // First, verify the tracking ID exists and get the email log details
        const emailLogRes = await query(
            `SELECT id, campaign_id, organization_id FROM email_logs
             WHERE id = $1 OR tracking_id = $1 LIMIT 1`,
            [trackingId]
        );

        if (!emailLogRes.rows[0]) {
            // Tracking ID doesn't exist - silently return pixel (don't expose that it's invalid)
            console.warn(`Tracking pixel requested for unknown ID: ${trackingId}`);
        } else {
            const emailLog = emailLogRes.rows[0];

            // Verify campaign exists and belongs to organization (ownership check)
            if (emailLog.campaign_id) {
                const campaignRes = await query(
                    `SELECT id FROM campaigns WHERE id = $1 AND organization_id = $2 LIMIT 1`,
                    [emailLog.campaign_id, emailLog.organization_id]
                );

                if (campaignRes.rows[0]) {
                    // Campaign verified, mark email as opened
                    await supabase
                        .from('email_logs')
                        .update({
                            status: 'opened',
                            opened_at: new Date().toISOString()
                        })
                        .eq('id', emailLog.id)
                        .is('opened_at', null);

                    console.log(`Email tracked as opened: ${emailLog.id}`);
                } else {
                    console.warn(`Campaign not found or ownership mismatch for tracking ID: ${trackingId}`);
                }
            } else {
                // No campaign associated, still mark as opened (transactional emails)
                await supabase
                    .from('email_logs')
                    .update({
                        status: 'opened',
                        opened_at: new Date().toISOString()
                    })
                    .eq('id', emailLog.id)
                    .is('opened_at', null);
            }
        }
    } catch (error) {
        console.error('Error logging email open:', error);
        // Don't throw - always return pixel for tracking requests
    }

    // Return a 1x1 transparent GIF
    const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
    );

    return new NextResponse(pixel, {
        headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        },
    });
}
