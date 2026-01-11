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
            const existing = await query('SELECT * FROM thread_states WHERE thread_id = $1', [threadId]);
            const result = classifyThread(messages, rules);

            const existingState = existing.rows[0];
            const override = existingState?.user_overridden;
            const lane = override ? existingState.lane : result.threadState.lane;
            const category = override ? existingState.category : result.threadState.category;
            const needsReview = override ? existingState.needs_review : result.threadState.needs_review;
            const reason = override ? existingState.reason : result.threadState.reason;
            const ruleId = override ? existingState.rule_id : result.threadState.rule_id;
            const confidence = override ? existingState.confidence : result.threadState.confidence;
            const evidence = override ? existingState.evidence : result.threadState.evidence;

            await query(
                `INSERT INTO thread_states
                 (thread_id, lane, needs_review, category, reason, rule_id, confidence, risk_level, evidence, updated_at, user_overridden)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10)
                 ON CONFLICT (thread_id) DO UPDATE SET
                 lane = EXCLUDED.lane,
                 needs_review = EXCLUDED.needs_review,
                 category = EXCLUDED.category,
                 reason = EXCLUDED.reason,
                 rule_id = EXCLUDED.rule_id,
                 confidence = EXCLUDED.confidence,
                 risk_level = EXCLUDED.risk_level,
                 evidence = EXCLUDED.evidence,
                 updated_at = CURRENT_TIMESTAMP
                `,
                [
                    threadId,
                    lane,
                    needsReview,
                    category,
                    reason,
                    ruleId,
                    confidence,
                    result.threadState.risk_level,
                    JSON.stringify(evidence || []),
                    override || false
                ]
            );

            await query('DELETE FROM receipts WHERE thread_id = $1', [threadId]);
            for (const receipt of result.receipts) {
                await query(
                    `INSERT INTO receipts
                     (thread_id, source_message_id, vendor_name, merchant_domain, amount, currency, date, category, payment_status, transaction_reference, amount_source, evidence, confidence)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                    [
                        receipt.thread_id,
                        receipt.source_message_id,
                        receipt.vendor_name,
                        receipt.merchant_domain,
                        receipt.amount,
                        receipt.currency,
                        receipt.date,
                        receipt.category,
                        receipt.payment_status,
                        receipt.transaction_reference,
                        receipt.amount_source,
                        receipt.evidence,
                        receipt.confidence
                    ]
                );
            }
        }

        return NextResponse.json({ status: 'ok', threads: threadIds.length });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
