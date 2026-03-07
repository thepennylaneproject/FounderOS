import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { getRules, getThreadMessages, getAllThreadIds } from '@/inbox/db';
import { classifyThread } from '@/inbox/classifier';

export async function POST() {
    try {
        const [rules, threadIds] = await Promise.all([getRules(), getAllThreadIds()]);

        for (const threadId of threadIds) {
            const messages = await getThreadMessages(threadId);
            if (messages.length === 0) continue;

            // Get existing thread state
            const { data: existingState } = await supabase
                .from('thread_states')
                .select('*')
                .eq('thread_id', threadId)
                .single();

            const result = classifyThread(messages, rules);

            const override = existingState?.user_overridden;
            const lane = override ? existingState.lane : result.threadState.lane;
            const category = override ? existingState.category : result.threadState.category;
            const needsReview = override ? existingState.needs_review : result.threadState.needs_review;
            const reason = override ? existingState.reason : result.threadState.reason;
            const ruleId = override ? existingState.rule_id : result.threadState.rule_id;
            const confidence = override ? existingState.confidence : result.threadState.confidence;
            const evidence = override ? existingState.evidence : result.threadState.evidence;

            // Upsert thread state
            await supabase
                .from('thread_states')
                .upsert({
                    thread_id: threadId,
                    lane,
                    needs_review: needsReview,
                    category,
                    reason,
                    rule_id: ruleId,
                    confidence,
                    risk_level: result.threadState.risk_level,
                    evidence: evidence || [],
                    updated_at: new Date().toISOString(),
                    user_overridden: override || false
                }, { onConflict: 'thread_id' });

            // Delete existing receipts for this thread
            await supabase
                .from('receipts')
                .delete()
                .eq('thread_id', threadId);

            // Insert new receipts
            for (const receipt of result.receipts) {
                await supabase
                    .from('receipts')
                    .insert({
                        thread_id: receipt.thread_id,
                        source_message_id: receipt.source_message_id,
                        vendor_name: receipt.vendor_name,
                        merchant_domain: receipt.merchant_domain,
                        amount: receipt.amount,
                        currency: receipt.currency,
                        date: receipt.date,
                        category: receipt.category,
                        payment_status: receipt.payment_status,
                        transaction_reference: receipt.transaction_reference,
                        amount_source: receipt.amount_source,
                        evidence: receipt.evidence,
                        confidence: receipt.confidence
                    });
            }
        }

        return NextResponse.json({ status: 'ok', threads: threadIds.length });
    } catch (error: any) {
        console.error('Reclassify error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
