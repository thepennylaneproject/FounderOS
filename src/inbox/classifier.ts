import { EmailMessage, Rule, ClassificationResult, Lane, Category } from './types';
import { applyRules } from './ruleEngine';
import { extractReceipts } from './receiptExtractor';

const QUESTION_PATTERNS = ['can you', 'please confirm', 'let me know', 'could you', 'would you'];
const INVOICE_KEYWORDS = ['invoice', 'receipt', 'payment', 'billing', 'statement'];
const NOISE_KEYWORDS = ['unsubscribe', 'newsletter', 'promo', 'promotion'];
const OVERDUE_KEYWORDS = ['overdue', 'past due'];
const DUE_KEYWORDS = ['due', 'payment due'];

export function classifyThread(messages: EmailMessage[], rules: Rule[]): ClassificationResult {
    const ruleOutcome = applyRules(messages, rules);
    const receipts = extractReceipts(messages, ruleOutcome?.receiptCategory as any);

    let lane: Lane = ruleOutcome?.lane || 'info';
    let category: Category = ruleOutcome?.category || 'uncategorized';
    let needsReview = ruleOutcome?.needsReview ?? false;
    let confidence = 0.5;
    const evidence: string[] = ruleOutcome?.evidence ? [...ruleOutcome.evidence] : [];
    let reason = ruleOutcome?.reason || '';
    let ruleId = ruleOutcome?.ruleId || null;

    const body = messages.map((m) => `${m.subject || ''} ${m.body_text || ''}`).join(' ').toLowerCase();
    const headers = messages.flatMap((m) => Object.keys(m.headers || {}));

    const hasInvoiceKeyword = INVOICE_KEYWORDS.some((k) => body.includes(k));
    const hasAmount = receipts.length > 0 || /\$\d/.test(body);
    const hasQuestion = body.includes('?') || QUESTION_PATTERNS.some((p) => body.includes(p));
    const hasNoise = NOISE_KEYWORDS.some((k) => body.includes(k)) || headers.some((h) => h.toLowerCase() === 'list-unsubscribe');
    const waiting = isWaiting(messages);
    const signalCount = Number(hasInvoiceKeyword) + Number(hasAmount) + Number(hasQuestion) + Number(hasNoise);

    if (hasInvoiceKeyword && hasAmount) {
        confidence += 0.2;
        evidence.push('invoice_keyword+amount');
    }
    if (hasQuestion) {
        confidence += 0.1;
        evidence.push('question_detected');
    }
    if (hasNoise && hasQuestion) {
        confidence -= 0.2;
        evidence.push('conflict:noise+question');
    }
    if (hasNoise && hasInvoiceKeyword) {
        confidence -= 0.2;
        evidence.push('conflict:noise+invoice');
    }
    if (signalCount === 0) {
        confidence -= 0.2;
        evidence.push('no_signals');
    }
    if (body.length < 80) {
        confidence -= 0.1;
        evidence.push('low_text');
    }

    const paymentStatus = resolvePaymentStatus(receipts, body);
    const risk = resolveRisk(paymentStatus, body, receipts);

    if (receipts.length > 0) {
        category = category === 'uncategorized' ? 'receipts' : category;
        if (!ruleId) {
            reason = 'Routed because: receipt fields detected';
        }
    }

    if (!ruleId && hasNoise) {
        lane = 'noise';
        if (!reason) reason = 'Routed because: newsletter patterns detected';
    }

    if (!ruleId && hasQuestion) {
        lane = 'now';
        if (receipts.length === 0 && category === 'uncategorized') {
            category = 'needs_reply';
        }
        if (!reason) reason = 'Routed because: explicit question detected';
    }

    if (!ruleId && waiting) {
        lane = 'waiting';
        category = category === 'uncategorized' ? 'waiting_on' : category;
        if (!reason) reason = 'Routed because: awaiting response';
    }

    if (risk === 'high') {
        lane = 'now';
        if (!reason) reason = 'Routed because: high risk detected';
        if (ruleId) {
            evidence.push('risk_override');
            ruleId = 'system:risk_override';
        }
    }

    if (confidence < 0.45) {
        needsReview = true;
        if (!ruleId && risk !== 'high') lane = 'info';
    }

    if (!reason) {
        reason = 'Routed because: default classification';
    }

    return {
        threadState: {
            thread_id: messages[0].thread_id,
            lane,
            needs_review: needsReview,
            category,
            reason,
            rule_id: ruleId,
            confidence: Math.max(0, Math.min(1, confidence)),
            risk_level: risk,
            evidence: evidence.slice(0, 6),
            user_overridden: false
        },
        receipts
    };
}

function isWaiting(messages: EmailMessage[]) {
    const founderEmail = process.env.FOUNDER_EMAIL || process.env.MAIL_FROM_ADDRESS || 'admin@founderos.local';
    const sorted = [...messages].sort((a, b) => {
        const aTime = new Date(a.sent_at || a.received_at || 0).getTime();
        const bTime = new Date(b.sent_at || b.received_at || 0).getTime();
        return aTime - bTime;
    });
    const last = sorted[sorted.length - 1];
    return last?.from_email?.toLowerCase() === founderEmail.toLowerCase();
}

function resolvePaymentStatus(receipts: ReturnType<typeof extractReceipts>, body: string) {
    if (receipts.some((r) => r.payment_status === 'failed')) return 'failed';
    if (receipts.some((r) => r.payment_status === 'pending')) return 'pending';
    if (receipts.some((r) => r.payment_status === 'paid')) return 'paid';
    if (OVERDUE_KEYWORDS.some((k) => body.includes(k))) return 'pending';
    if (DUE_KEYWORDS.some((k) => body.includes(k))) return 'pending';
    return 'unknown';
}

function resolveRisk(paymentStatus: string, body: string, receipts: ReturnType<typeof extractReceipts>) {
    if (paymentStatus === 'failed') return 'high';
    if (paymentStatus === 'pending' && OVERDUE_KEYWORDS.some((k) => body.includes(k))) return 'high';

    const soonDue = receipts.some((r) => {
        const days = daysUntil(r.date);
        return days !== null && days <= 3;
    });

    if (paymentStatus === 'pending' && soonDue) return 'high';
    if (body.includes('domain expires') || body.includes('expiration notice')) return 'high';
    return 'low';
}

function daysUntil(dateStr: string) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return null;
    const diff = date.getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
