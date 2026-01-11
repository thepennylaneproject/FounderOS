import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const lane = searchParams.get('lane');
        const category = searchParams.get('category');
        const needsReview = searchParams.get('needs_review');
        const risk = searchParams.get('risk');

        const filters: string[] = [];
        const params: any[] = [];

        if (lane) {
            params.push(lane);
            filters.push(`ts.lane = $${params.length}`);
        }
        if (category) {
            params.push(category);
            filters.push(`ts.category = $${params.length}`);
        }
        if (needsReview !== null) {
            params.push(needsReview === 'true');
            filters.push(`ts.needs_review = $${params.length}`);
        }
        if (risk) {
            params.push(risk);
            filters.push(`ts.risk_level = $${params.length}`);
        }

        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

        const result = await query(
            `
            WITH latest AS (
                SELECT DISTINCT ON (thread_id) *
                FROM email_messages
                ORDER BY thread_id, received_at DESC
            )
            SELECT
                ts.*,
                lm.subject,
                lm.snippet,
                lm.received_at,
                lm.from_name,
                lm.from_email,
                (SELECT COUNT(*) FROM email_messages em WHERE em.thread_id = ts.thread_id) as message_count,
                EXISTS(SELECT 1 FROM receipts r WHERE r.thread_id = ts.thread_id) as has_receipt
            FROM thread_states ts
            JOIN latest lm ON lm.thread_id = ts.thread_id
            ${whereClause}
            ORDER BY lm.received_at DESC
        `,
            params
        );

        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
