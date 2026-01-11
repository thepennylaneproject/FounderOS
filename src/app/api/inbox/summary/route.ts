import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const TILE_CATEGORIES = [
    'operations',
    'people',
    'growth',
    'receipts',
    'needs_reply',
    'waiting_on'
];

export async function GET() {
    try {
        const threadsRes = await query(
            `
            WITH latest AS (
                SELECT DISTINCT ON (thread_id) thread_id, from_name, from_email, received_at
                FROM email_messages
                ORDER BY thread_id, received_at DESC
            )
            SELECT ts.*, lm.from_name, lm.from_email, lm.received_at
            FROM thread_states ts
            JOIN latest lm ON lm.thread_id = ts.thread_id
        `
        );

        const highRiskThreads = new Set(
            threadsRes.rows
                .filter((r: any) => r.risk_level === 'high')
                .map((r: any) => r.thread_id)
        );

        const tiles = TILE_CATEGORIES.map((category) => {
            const rows = threadsRes.rows.filter((r: any) => r.category === category);
            const count = rows.length;
            const oldest = rows.reduce((acc: number | null, r: any) => {
                const ts = new Date(r.received_at).getTime();
                if (!acc || ts < acc) return ts;
                return acc;
            }, null);
            const oldestDays = oldest ? Math.ceil((Date.now() - oldest) / (1000 * 60 * 60 * 24)) : 0;
            const senders = rows.map((r: any) => r.from_name || r.from_email || 'Unknown');
            const senderCounts = senders.reduce((acc: Record<string, number>, name: string) => {
                acc[name] = (acc[name] || 0) + 1;
                return acc;
            }, {});
            const topSenders = Object.entries(senderCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([name]) => name);
            const riskCount = rows.filter((r: any) => highRiskThreads.has(r.thread_id)).length;

            return {
                category,
                count,
                oldest_days: oldestDays,
                top_senders: topSenders,
                risk_count: riskCount
            };
        });

        return NextResponse.json({ tiles });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
