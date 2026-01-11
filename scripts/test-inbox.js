const assert = require('assert');
const { Client } = require('pg');
const crypto = require('crypto');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
}

const run = async () => {
    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    const testThreads = [];
    const testRuleIds = [];

    try {
        await truncateTestData(client);

        await testRulePriority(client, testThreads, testRuleIds);
        await testNeedsReviewGating(client, testThreads, testRuleIds);
        await testReceiptParsing(client, testThreads, testRuleIds);
        await testExportTotals(client);
        await testOverridePersistence(client, testThreads, testRuleIds);

        console.log('All inbox MVP tests passed.');
    } finally {
        await cleanup(client, testThreads, testRuleIds);
        await client.end();
    }
};

const truncateTestData = async (client) => {
    await client.query("DELETE FROM rules WHERE reason_template LIKE 'TEST:%'");
    await client.query("DELETE FROM receipts WHERE vendor_name LIKE 'TestVendor%'");
    await client.query("DELETE FROM thread_states WHERE reason LIKE 'TEST:%'");
    await client.query("DELETE FROM email_messages WHERE subject LIKE 'TEST:%'");
};

const testRulePriority = async (client, testThreads, testRuleIds) => {
    const threadId = crypto.randomUUID();
    testThreads.push(threadId);

    const rule1 = await insertRule(client, {
        priority: 5,
        match: { subject_contains: ['priority'] },
        action: { set_lane: 'noise' },
        reason_template: 'TEST: rule priority 1'
    });
    const rule2 = await insertRule(client, {
        priority: 10,
        match: { subject_contains: ['priority'] },
        action: { set_lane: 'now' },
        reason_template: 'TEST: rule priority 2'
    });
    testRuleIds.push(rule1, rule2);

    await insertMessage(client, {
        thread_id: threadId,
        subject: 'TEST: priority check',
        body_text: 'priority keyword'
    });

    await reclassify();
    const state = await getThreadState(client, threadId);
    assert.strictEqual(state.lane, 'noise', 'Rule priority should pick lowest priority rule');
};

const testNeedsReviewGating = async (client, testThreads) => {
    const threadId = crypto.randomUUID();
    testThreads.push(threadId);

    await insertMessage(client, {
        thread_id: threadId,
        subject: 'TEST: low signal',
        body_text: 'ok'
    });

    await reclassify();
    const state = await getThreadState(client, threadId);
    assert.strictEqual(state.lane, 'info', 'Low-signal thread should land in info');
    assert.strictEqual(state.needs_review, true, 'Low-signal thread should require review');
};

const testReceiptParsing = async (client, testThreads) => {
    const threadId = crypto.randomUUID();
    testThreads.push(threadId);

    await insertMessage(client, {
        thread_id: threadId,
        subject: 'TEST: receipt parsing',
        body_text: 'Invoice 123 amount $1,234.56 Date 2025-01-10',
        from_name: 'TestVendor'
    });

    await reclassify();
    const receipt = await getReceipt(client, threadId);
    assert(receipt, 'Receipt should be extracted');
    assert.strictEqual(Number(receipt.amount).toFixed(2), '1234.56', 'Amount should parse correctly');
};

const testExportTotals = async (client) => {
    const res = await fetch(`${API_BASE}/api/receipts`);
    const receipts = await res.json();
    const sum = receipts.reduce((acc, r) => acc + Number(r.amount || 0), 0);

    const exportRes = await fetch(`${API_BASE}/api/receipts/export`);
    const csv = await exportRes.text();
    const lines = csv.trim().split('\n').slice(1);
    const exportSum = lines.reduce((acc, line) => {
        const parts = parseCsvLine(line);
        return acc + Number(parts[1] || 0);
    }, 0);

    assert.strictEqual(sum.toFixed(2), exportSum.toFixed(2), 'Export totals should match receipts view');
};

const testOverridePersistence = async (client, testThreads, testRuleIds) => {
    const threadId = crypto.randomUUID();
    testThreads.push(threadId);

    const ruleId = await insertRule(client, {
        priority: 15,
        match: { subject_contains: ['override'] },
        action: { set_lane: 'now' },
        reason_template: 'TEST: override rule'
    });
    testRuleIds.push(ruleId);

    await insertMessage(client, {
        thread_id: threadId,
        subject: 'TEST: override lane',
        body_text: 'override keyword'
    });

    await reclassify();
    await client.query(
        `UPDATE thread_states
         SET lane = 'next', category = 'uncategorized', user_overridden = true, reason = 'TEST: manual override'
         WHERE thread_id = $1`,
        [threadId]
    );

    await reclassify();
    const state = await getThreadState(client, threadId);
    assert.strictEqual(state.lane, 'next', 'User override should persist after reclassify');
};

const insertRule = async (client, rule) => {
    const res = await client.query(
        `INSERT INTO rules (enabled, priority, match, action, reason_template)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [true, rule.priority, rule.match, rule.action, rule.reason_template]
    );
    return res.rows[0].id;
};

const insertMessage = async (client, message) => {
    const now = new Date().toISOString();
    await client.query(
        `INSERT INTO email_messages
         (id, thread_id, message_id, source, from_name, from_email, to_emails, subject, snippet, body_text, body_html, received_at, sent_at, headers, attachments, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
            crypto.randomUUID(),
            message.thread_id,
            `test-${crypto.randomUUID()}`,
            'test',
            message.from_name || 'Test Sender',
            message.from_email || 'test@example.com',
            ['admin@founderos.local'],
            message.subject,
            message.body_text.slice(0, 120),
            message.body_text,
            null,
            now,
            now,
            JSON.stringify({}),
            JSON.stringify([]),
            'classified'
        ]
    );
};

const getThreadState = async (client, threadId) => {
    const res = await client.query('SELECT * FROM thread_states WHERE thread_id = $1', [threadId]);
    return res.rows[0];
};

const getReceipt = async (client, threadId) => {
    const res = await client.query('SELECT * FROM receipts WHERE thread_id = $1', [threadId]);
    return res.rows[0];
};

const reclassify = async () => {
    const res = await fetch(`${API_BASE}/api/inbox/reclassify`, { method: 'POST' });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Reclassify failed: ${text}`);
    }
};

const parseCsvLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && line[i + 1] === '"') {
            current += '"';
            i += 1;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
};

const cleanup = async (client, threadIds, ruleIds) => {
    if (threadIds.length > 0) {
        await client.query('DELETE FROM receipts WHERE thread_id = ANY($1)', [threadIds]);
        await client.query('DELETE FROM thread_states WHERE thread_id = ANY($1)', [threadIds]);
        await client.query('DELETE FROM email_messages WHERE thread_id = ANY($1)', [threadIds]);
    }
    if (ruleIds.length > 0) {
        await client.query('DELETE FROM rules WHERE id = ANY($1)', [ruleIds]);
    }
};

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
