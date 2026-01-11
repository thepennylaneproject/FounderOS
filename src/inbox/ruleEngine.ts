import { EmailMessage, Rule, Lane, Category } from './types';

interface RuleOutcome {
    lane?: Lane;
    category?: Category;
    needsReview?: boolean;
    receiptCategory?: string;
    reason: string;
    ruleId: string;
    evidence: string[];
}

const lower = (value: string | null | undefined) => (value || '').toLowerCase();

export function applyRules(messages: EmailMessage[], rules: Rule[]): RuleOutcome | null {
    const sorted = [...rules]
        .filter((r) => r.enabled)
        .sort((a, b) => a.priority - b.priority);

    for (const rule of sorted) {
        const outcome = matchRule(messages, rule);
        if (outcome) return outcome;
    }

    return null;
}

function matchRule(messages: EmailMessage[], rule: Rule): RuleOutcome | null {
    const match = rule.match || {};
    const evidence: string[] = [];

    const fromDomain = match.from_domain ? match.from_domain.toLowerCase() : null;
    if (fromDomain) {
        const matched = messages.some((m) => lower(m.from_email).endsWith(`@${fromDomain}`));
        if (!matched) return null;
        evidence.push(`from_domain:${fromDomain}`);
    }

    if (match.subject_contains && match.subject_contains.length > 0) {
        const terms = match.subject_contains.map((t) => t.toLowerCase());
        const matched = messages.some((m) => terms.some((t) => lower(m.subject).includes(t)));
        if (!matched) return null;
        evidence.push(`subject_contains:${terms.join(',')}`);
    }

    if (match.body_contains && match.body_contains.length > 0) {
        const terms = match.body_contains.map((t) => t.toLowerCase());
        const matched = messages.some((m) => terms.some((t) => lower(m.body_text).includes(t)));
        if (!matched) return null;
        evidence.push(`body_contains:${terms.join(',')}`);
    }

    if (typeof match.has_attachment === 'boolean') {
        const matched = messages.some((m) => (m.attachments || []).length > 0);
        if (match.has_attachment !== matched) return null;
        evidence.push(`has_attachment:${matched ? 'true' : 'false'}`);
    }

    if (typeof match.amount_present === 'boolean') {
        const amountRegex = /(?:\$|usd|eur|gbp)\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/i;
        const matched = messages.some((m) => amountRegex.test(m.body_text || '') || amountRegex.test(m.subject || ''));
        if (match.amount_present !== matched) return null;
        evidence.push(`amount_present:${matched ? 'true' : 'false'}`);
    }

    const reason = renderReason(rule.reason_template, messages);
    return {
        lane: rule.action.set_lane,
        category: rule.action.set_category,
        needsReview: rule.action.set_needs_review,
        receiptCategory: rule.action.set_receipt_category,
        reason,
        ruleId: rule.id,
        evidence
    };
}

function renderReason(template: string, messages: EmailMessage[]) {
    const first = messages[0];
    const domain = first?.from_email ? first.from_email.split('@')[1] : 'unknown';
    return template
        .replace(/\{from_domain\}/g, domain)
        .replace(/\{from_email\}/g, first?.from_email || 'unknown')
        .replace(/\{subject\}/g, first?.subject || 'message');
}
