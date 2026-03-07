import supabase from '@/lib/supabase';
import { Rule, EmailMessage } from './types';

export async function getRules(): Promise<Rule[]> {
    const { data, error } = await supabase
        .from('rules')
        .select('*')
        .order('priority', { ascending: true });

    if (error) throw error;

    return (data || []).map((r: any) => {
        let match = {};
        let action = {};

        // Parse match safely
        try {
            match = typeof r.match === 'string' ? JSON.parse(r.match) : (r.match || {});
        } catch (parseErr) {
            console.error(`Failed to parse rule match for rule ${r.id}:`, parseErr);
            // Use empty object as fallback
            match = {};
        }

        // Parse action safely
        try {
            action = typeof r.action === 'string' ? JSON.parse(r.action) : (r.action || {});
        } catch (parseErr) {
            console.error(`Failed to parse rule action for rule ${r.id}:`, parseErr);
            // Use empty object as fallback
            action = {};
        }

        return {
            id: r.id,
            enabled: r.enabled,
            priority: r.priority,
            match,
            action,
            reason_template: r.reason_template
        };
    });
}

export async function getThreadMessages(threadId: string): Promise<EmailMessage[]> {
    const { data, error } = await supabase
        .from('email_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('received_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(normalizeMessage);
}

export async function getAllThreadIds(): Promise<string[]> {
    const { data, error } = await supabase
        .from('email_messages')
        .select('thread_id');

    if (error) throw error;
    
    // Get unique thread ids
    const uniqueIds = [...new Set((data || []).map((r: any) => r.thread_id))];
    return uniqueIds;
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
