const { Client } = require('pg');
const crypto = require('crypto');

const THREAD_COUNT = 50;
const MESSAGE_COUNT = 200;

const VENDORS = ['Stripe', 'Notion', 'GitHub', 'Figma', 'AWS', 'Gusto', 'Delta', 'Zoom'];
const NEWSLETTERS = ['Growth Weekly', 'SaaS Digest', 'Founder Pulse', 'Product Update'];
const PEOPLE = ['Ava', 'Noah', 'Liam', 'Mia', 'Zoe', 'Ethan', 'Iris'];

const run = async () => {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });
    await client.connect();

    await client.query('DELETE FROM receipts');
    await client.query('DELETE FROM thread_states');
    await client.query('DELETE FROM email_messages');
    await client.query('DELETE FROM rules');

    await seedRules(client);

    const threads = Array.from({ length: THREAD_COUNT }, () => crypto.randomUUID());
    const receiptThreads = new Set(threads.slice(0, 25));
    const newsletterThreads = new Set(threads.slice(25, 35));
    const needsReplyThreads = new Set(threads.slice(35, 50));

    const messages = [];
    let messageId = 0;

    for (const threadId of threads) {
        const messageTotal = 4;
        for (let i = 0; i < messageTotal; i++) {
            if (messages.length >= MESSAGE_COUNT) break;
            const isReceipt = receiptThreads.has(threadId) && i === 0;
            const isNewsletter = newsletterThreads.has(threadId) && i === 0;
            const threadNeedsReply = needsReplyThreads.has(threadId);
            const needsReply = threadNeedsReply && i === 0;

            const fromDomain = isReceipt
                ? `${pick(VENDORS).toLowerCase()}.com`
                : isNewsletter
                    ? 'newsletter.example.com'
                    : 'founder-network.com';

            const fromName = isNewsletter ? pick(NEWSLETTERS) : pick(PEOPLE);
            const subject = isReceipt
                ? `Invoice ${randomRef()} from ${fromName}`
                : isNewsletter
                    ? `${fromName} - Issue ${randomNumber(120)}`
                    : needsReply
                        ? `Quick question about the next steps`
                        : `Update on ${pick(VENDORS)}`;

            const body = buildBody({ isReceipt, isNewsletter, needsReply, vendor: fromName });
            const snippet = body.slice(0, 140);
            const receivedAt = new Date(Date.now() - randomNumber(7) * 24 * 60 * 60 * 1000);

            messages.push({
                id: crypto.randomUUID(),
                thread_id: threadId,
                message_id: `msg-${messageId++}`,
                source: 'mock',
                from_name: fromName,
                from_email: `${fromName.toLowerCase().replace(/\s+/g, '')}@${fromDomain}`,
                to_emails: ['admin@founderos.local'],
                subject,
                snippet,
                body_text: body,
                body_html: null,
                received_at: receivedAt.toISOString(),
                sent_at: receivedAt.toISOString(),
                headers: isNewsletter ? { 'list-unsubscribe': '<mailto:unsubscribe@example.com>' } : {},
                attachments: isReceipt ? [{ id: crypto.randomUUID(), name: 'invoice.pdf', mime: 'application/pdf', size: 24000 }] : [],
                status: 'classified'
            });
        }
        if (messages.length >= MESSAGE_COUNT) break;
    }

    const insertQuery = `
        INSERT INTO email_messages (
            id, thread_id, message_id, source, from_name, from_email, to_emails,
            subject, snippet, body_text, body_html, received_at, sent_at, headers, attachments, status
        ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
        )
    `;

    for (const msg of messages) {
        await client.query(insertQuery, [
            msg.id,
            msg.thread_id,
            msg.message_id,
            msg.source,
            msg.from_name,
            msg.from_email,
            msg.to_emails,
            msg.subject,
            msg.snippet,
            msg.body_text,
            msg.body_html,
            msg.received_at,
            msg.sent_at,
            JSON.stringify(msg.headers),
            JSON.stringify(msg.attachments),
            msg.status
        ]);
    }

    await client.end();
    const primarySummary = summarizeThreads(threads, receiptThreads, newsletterThreads, needsReplyThreads);
    console.log(`Seeded ${messages.length} messages across ${threads.length} threads.`);
    console.log(`Threads by primary type: receipts=${primarySummary.receipts}, newsletter=${primarySummary.newsletter}, needs_reply=${primarySummary.needs_reply}, other=${primarySummary.other}`);
    console.log(`Overlap counts: receipt+needs_reply=${primarySummary.overlap_receipt_reply}, receipt+newsletter=${primarySummary.overlap_receipt_newsletter}, newsletter+needs_reply=${primarySummary.overlap_newsletter_reply}`);
    console.log('Run: curl -X POST http://localhost:3000/api/inbox/reclassify');
};

const seedRules = async (client) => {
    const rules = [
        {
            enabled: true,
            priority: 10,
            match: { subject_contains: ['invoice', 'receipt'], amount_present: true },
            action: { set_lane: 'now', set_category: 'operations', set_receipt_category: 'services' },
            reason_template: 'Routed because: invoice with amount detected'
        },
        {
            enabled: true,
            priority: 20,
            match: { body_contains: ['unsubscribe', 'newsletter'] },
            action: { set_lane: 'noise', set_category: 'operations' },
            reason_template: 'Routed because: newsletter patterns detected'
        }
    ];

    for (const rule of rules) {
        await client.query(
            `INSERT INTO rules (enabled, priority, match, action, reason_template)
             VALUES ($1, $2, $3, $4, $5)`,
            [rule.enabled, rule.priority, rule.match, rule.action, rule.reason_template]
        );
    }
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomNumber = (max) => Math.floor(Math.random() * max) + 1;
const randomRef = () => `${randomNumber(9999)}-${randomNumber(9999)}`;
const pickRandom = (arr, count) => {
    const copy = [...arr];
    const picked = [];
    while (picked.length < count && copy.length > 0) {
        const idx = Math.floor(Math.random() * copy.length);
        picked.push(copy.splice(idx, 1)[0]);
    }
    return picked;
};

const buildBody = ({ isReceipt, isNewsletter, needsReply, vendor }) => {
    if (isReceipt) {
        const amount = (Math.random() * 900 + 50).toFixed(2);
        const status = pick(['paid', 'pending', 'failed']);
        const date = new Date(Date.now() - randomNumber(30) * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];
        const dueLine = status === 'pending' ? 'Payment due in 3 days.' : '';
        return `Invoice ${randomRef()} for ${vendor}\nAmount: $${amount}\nDate: ${date}\nStatus: ${status}\n${dueLine}`;
    }
    if (isNewsletter) {
        return `This week in growth: new benchmarks and tactics.\nUnsubscribe at any time.`;
    }
    if (needsReply) {
        return `Can you confirm the timeline for next week? Please let me know what works.`;
    }
    return `Sharing an update on the latest milestones and next steps.`;
};

const summarizeThreads = (threads, receiptThreads, newsletterThreads, needsReplyThreads) => {
    let receipts = 0;
    let newsletter = 0;
    let needsReply = 0;
    let other = 0;
    let overlapReceiptReply = 0;
    let overlapReceiptNewsletter = 0;
    let overlapNewsletterReply = 0;

    for (const threadId of threads) {
        const isReceipt = receiptThreads.has(threadId);
        const isNewsletter = newsletterThreads.has(threadId);
        const isNeedsReply = needsReplyThreads.has(threadId);

        if (isReceipt && isNeedsReply) overlapReceiptReply += 1;
        if (isReceipt && isNewsletter) overlapReceiptNewsletter += 1;
        if (isNewsletter && isNeedsReply) overlapNewsletterReply += 1;

        if (isReceipt) receipts += 1;
        else if (isNewsletter) newsletter += 1;
        else if (isNeedsReply) needsReply += 1;
        else other += 1;
    }

    return {
        receipts,
        newsletter,
        needs_reply: needsReply,
        other,
        overlap_receipt_reply: overlapReceiptReply,
        overlap_receipt_newsletter: overlapReceiptNewsletter,
        overlap_newsletter_reply: overlapNewsletterReply
    };
};

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
