import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import supabase from '@/lib/supabase';

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
        // Get all thread states
        const { data: threadStates, error: tsError } = await supabase
            .from('thread_states')
            .select('*');

        if (tsError) throw tsError;

        // Get latest message per thread
        const { data: messages, error: msgError } = await supabase
            .from('email_messages')
            .select('thread_id, from_name, from_email, received_at')
            .order('received_at', { ascending: false });

        if (msgError) throw msgError;

        // Create a map of latest message per thread
        const latestByThread = new Map<string, any>();
        for (const msg of (messages || [])) {
            if (!latestByThread.has(msg.thread_id)) {
                latestByThread.set(msg.thread_id, msg);
            }
        }

        // Join thread states with latest messages
        const threadsWithMessages = (threadStates || []).map(ts => {
            const latest = latestByThread.get(ts.thread_id);
            return {
                ...ts,
                from_name: latest?.from_name || null,
                from_email: latest?.from_email || null,
                received_at: latest?.received_at || null
            };
        });

        const highRiskThreads = new Set(
            threadsWithMessages
                .filter((r: any) => r.risk_level === 'high')
                .map((r: any) => r.thread_id)
        );

        const tiles = TILE_CATEGORIES.map((category) => {
            const rows = threadsWithMessages.filter((r: any) => r.category === category);
            const count = rows.length;
            const oldest = rows.reduce((acc: number | null, r: any) => {
                if (!r.received_at) return acc;
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
            const topSenders = (Object.entries(senderCounts) as Array<[string, number]>)
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
        console.error('Error in inbox summary:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
