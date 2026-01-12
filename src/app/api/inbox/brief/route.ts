import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET() {
    try {
        // Get thread state counts
        const { data: threadStats, error: threadError } = await supabase
            .from('thread_states')
            .select('lane, category, needs_review, risk_level');

        if (threadError) throw threadError;

        const threads = threadStats || [];
        
        const now_count = threads.filter(t => t.lane === 'now').length;
        const waiting_count = threads.filter(t => t.lane === 'waiting').length;
        const needs_reply_count = threads.filter(t => t.category === 'needs_reply').length;
        const needs_review_count = threads.filter(t => t.needs_review === true).length;
        const risk_count = threads.filter(t => t.risk_level === 'high').length;

        // Get receipt counts for current month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: receipts, error: receiptError } = await supabase
            .from('receipts')
            .select('amount')
            .gte('date', startOfMonth.toISOString().split('T')[0]);

        if (receiptError) throw receiptError;

        const monthReceipts = receipts || [];
        const month_total = monthReceipts.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

        return NextResponse.json({
            now_count,
            waiting_count,
            needs_reply_count,
            needs_review_count,
            new_receipts_count: monthReceipts.length,
            month_total,
            risk_count
        });
    } catch (error: any) {
        console.error('Error fetching inbox brief:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
