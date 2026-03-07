import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getRules, getThreadMessages, getAllThreadIds } from '@/inbox/db';
import { classifyThread } from '@/inbox/classifier';

export async function POST() {
    try {
        const [rules, threadIds] = await Promise.all([getRules(), getAllThreadIds()]);

        for (const threadId of threadIds) {
            const messages = await getThreadMessages(threadId);
            if (messages.length === 0) continue;

            // Get existing thread state
            const existingResult = await query(
                'SELECT * FROM thread_states WHERE thread_id = $1',
                [threadId]
            );
            const existingState = existingResult.rows[0] || null;

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
            await query(
                `INSERT INTO thread_states
                    (thread_id, lane, needs_review, category, reason, rule_id, confidence, risk_level, evidence, updated_at, user_overridden)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                 ON CONFLICT (thread_id) DO UPDATE SET
                    lane = EXCLUDED.lane,
                    needs_review = EXCLUDED.needs_review,
                    category = EXCLUDED.category,
                    reason = EXCLUDED.reason,
                    rule_id = EXCLUDED.rule_id,
                    confidence = EXCLUDED.confidence,
                    risk_level = EXCLUDED.risk_level,
                    evidence = EXCLUDED.evidence,
                    updated_at = EXCLUDED.updated_at,
                    user_overridden = EXCLUDED.user_overridden`,
                [
                    threadId,
                    lane,
                    needsReview,
                    category,
                    reason,
                    ruleId ?? null,
                    confidence ?? null,
                    result.threadState.risk_level ?? null,
                    JSON.stringify(evidence || []),
                    new Date().toISOString(),
                    override || false
                ]
            );

            // Delete existing receipts for this thread
            await query('DELETE FROM receipts WHERE thread_id = $1', [threadId]);

            // Insert new receipts
            for (const receipt of result.receipts) {
                await query(
                    `INSERT INTO receipts
                        (thread_id, source_message_id, vendor_name, merchant_domain, amount, currency, date,
                         category, payment_status, transaction_reference, amount_source, evidence, confidence)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                    [
                        receipt.thread_id,
                        receipt.source_message_id,
                        receipt.vendor_name,
                        receipt.merchant_domain ?? null,
                        receipt.amount ?? null,
                        receipt.currency ?? null,
                        receipt.date ?? null,
                        receipt.category ?? null,
                        receipt.payment_status ?? null,
                        receipt.transaction_reference ?? null,
                        receipt.amount_source ?? null,
                        receipt.evidence || [],
                        receipt.confidence ?? null
                    ]
                );
            }
        }

        return NextResponse.json({ status: 'ok', threads: threadIds.length });
    } catch (error: any) {
        console.error('Reclassify error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
