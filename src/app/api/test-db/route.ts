import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';

/**
 * GET /api/test-db
 *
 * Lightweight database connectivity health check used by CI to confirm
 * the Next.js server is running and the database connection is ready.
 */
export async function GET() {
    try {
        await query('SELECT 1');
        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 503 }
        );
    }
}
