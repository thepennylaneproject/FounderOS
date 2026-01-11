import { EmailMessage, Receipt } from './types';

const amountRegex = /(?:\$|usd|eur|gbp)\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/i;
const currencyRegex = /\b(usd|eur|gbp)\b/i;
const dateRegex = /\b(\d{4}-\d{2}-\d{2})\b|\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/i;

export function extractReceipts(messages: EmailMessage[], inferredCategory?: Receipt['category']) {
    const receipts: Omit<Receipt, 'id'>[] = [];

    for (const message of messages) {
        const body = message.body_text || '';
        const subject = message.subject || '';
        const vendorName = message.from_name || (message.from_email || '').split('@')[1] || 'Unknown';
        const domain = message.from_email ? message.from_email.split('@')[1] : null;

        const amountMatch = body.match(amountRegex) || subject.match(amountRegex);
        const dateMatch = body.match(dateRegex) || subject.match(dateRegex);

        if (!amountMatch || !dateMatch) continue;

        const amount = parseAmount(amountMatch[0]);
        const currency = extractCurrency(amountMatch[0], body, subject);
        const date = normalizeDate(dateMatch[0]);
        if (!amount || !date) continue;

        const evidence: string[] = [
            `amount:${amountMatch[0]}`,
            `date:${dateMatch[0]}`,
            `vendor:${vendorName}`
        ];

        const paymentStatus = detectPaymentStatus(body + ' ' + subject);
        const receiptCategory = inferredCategory || 'other';

        receipts.push({
            thread_id: message.thread_id,
            source_message_id: message.id,
            vendor_name: vendorName,
            merchant_domain: domain,
            amount,
            currency,
            date,
            category: receiptCategory,
            payment_status: paymentStatus,
            transaction_reference: extractReference(body),
            amount_source: 'body',
            evidence,
            confidence: 0.7
        });
    }

    return receipts;
}

function parseAmount(raw: string): number | null {
    const cleaned = raw.replace(/[^\d.]/g, '');
    const value = parseFloat(cleaned);
    return Number.isFinite(value) ? value : null;
}

function extractCurrency(raw: string, body: string, subject: string): string {
    if (raw.includes('$')) return 'USD';
    const match = (body + ' ' + subject).match(currencyRegex);
    if (!match) return 'USD';
    return match[1].toUpperCase();
}

function normalizeDate(raw: string): string | null {
    const isoMatch = raw.match(/\d{4}-\d{2}-\d{2}/);
    if (isoMatch) return isoMatch[0];
    const slashMatch = raw.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
    if (!slashMatch) return null;
    const [m, d, y] = slashMatch[0].split('/');
    const year = y.length === 2 ? `20${y}` : y;
    const month = m.padStart(2, '0');
    const day = d.padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function detectPaymentStatus(text: string): Receipt['payment_status'] {
    const lower = text.toLowerCase();
    if (lower.includes('failed') || lower.includes('declined')) return 'failed';
    if (lower.includes('overdue') || lower.includes('due') || lower.includes('pending')) return 'pending';
    if (lower.includes('paid') || lower.includes('payment received') || lower.includes('receipt')) return 'paid';
    return 'unknown';
}

function extractReference(text: string): string | null {
    const match = text.match(/(?:invoice|receipt|transaction)\s?#?([a-z0-9\-]+)/i);
    return match ? match[1] : null;
}
