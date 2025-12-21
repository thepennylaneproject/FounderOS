import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const trackingId = params.id;

    try {
        // Log the open event if not already logged
        await query(
            `UPDATE email_logs 
       SET status = 'opened', opened_at = COALESCE(opened_at, CURRENT_TIMESTAMP)
       WHERE id = $1 OR tracking_id = $1`,
            [trackingId]
        );
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
