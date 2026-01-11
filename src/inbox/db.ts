import { query } from '@/lib/db';
import { Rule, EmailMessage } from './types';

export async function getRules(): Promise<Rule[]> {
    const res = await query('SELECT * FROM rules ORDER BY priority ASC');
    return res.rows.map((r: any) => ({
        id: r.id,
        enabled: r.enabled,
        priority: r.priority,
        match: typeof r.match === 'string' ? JSON.parse(r.match) : (r.match || {}),
        action: typeof r.action === 'string' ? JSON.parse(r.action) : (r.action || {}),
        reason_template: r.reason_template
    }));
}

export async function getThreadMessages(threadId: string): Promise<EmailMessage[]> {
    const res = await query(
        'SELECT * FROM email_messages WHERE thread_id = $1 ORDER BY received_at ASC',
        [threadId]
    );
    return res.rows.map(normalizeMessage);
}

export async function getAllThreadIds(): Promise<string[]> {
    const res = await query('SELECT DISTINCT thread_id FROM email_messages');
    return res.rows.map((r: any) => r.thread_id);
}

function normalizeMessage(row: any): EmailMessage {
    return {
        id: row.id,
        thread_id: row.thread_id,
        message_id: row.message_id,
        source: row.source,
        from_name: row.from_name,
        from_email: row.from_email,
        to_emails: row.to_emails,
        subject: row.subject,
        snippet: row.snippet,
        body_text: row.body_text,
        body_html: row.body_html,
        received_at: row.received_at,
        sent_at: row.sent_at,
        headers: row.headers || {},
        attachments: row.attachments || [],
        status: row.status
    };
}
