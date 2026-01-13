import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const trackingId = params.id;

    try {
        // Log the open event if not already logged
        await supabase
            .from('email_logs')
            .update({
                status: 'opened',
                opened_at: new Date().toISOString()
            })
            .or(`id.eq.${trackingId},tracking_id.eq.${trackingId}`)
            .is('opened_at', null);
    } catch (error) {
        console.error('Error logging email open:', error);
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
