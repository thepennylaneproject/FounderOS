import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const countsRes = await query(
            `
            SELECT
                COUNT(*) FILTER (WHERE lane = 'now') as now_count,
                COUNT(*) FILTER (WHERE lane = 'waiting') as waiting_count,
                COUNT(*) FILTER (WHERE category = 'needs_reply') as needs_reply_count,
                COUNT(*) FILTER (WHERE needs_review = true) as needs_review_count,
                COUNT(*) FILTER (WHERE risk_level = 'high') as risk_count
            FROM thread_states
        `
        );

        const receiptCounts = await query(
            `
            SELECT
                COUNT(*) FILTER (WHERE date >= date_trunc('month', CURRENT_DATE)) as month_receipts,
                COALESCE(SUM(amount) FILTER (WHERE date >= date_trunc('month', CURRENT_DATE)), 0) as month_total
            FROM receipts
        `
        );

        return NextResponse.json({
            now_count: Number(countsRes.rows[0]?.now_count || 0),
            waiting_count: Number(countsRes.rows[0]?.waiting_count || 0),
            needs_reply_count: Number(countsRes.rows[0]?.needs_reply_count || 0),
            needs_review_count: Number(countsRes.rows[0]?.needs_review_count || 0),
            new_receipts_count: Number(receiptCounts.rows[0]?.month_receipts || 0),
            month_total: Number(receiptCounts.rows[0]?.month_total || 0),
            risk_count: Number(countsRes.rows[0]?.risk_count || 0)
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
