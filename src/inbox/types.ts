export type Lane = 'now' | 'next' | 'waiting' | 'info' | 'noise';
export type Category =
    | 'operations'
    | 'people'
    | 'growth'
    | 'receipts'
    | 'needs_reply'
    | 'waiting_on'
    | 'uncategorized';

export interface EmailMessage {
    id: string;
    thread_id: string;
    message_id: string | null;
    source: string | null;
    from_name: string | null;
    from_email: string | null;
    to_emails: string[] | null;
    subject: string | null;
    snippet: string | null;
    body_text: string | null;
    body_html: string | null;
    received_at: string | null;
    sent_at: string | null;
    headers: Record<string, any>;
    attachments: Array<{ id: string; name: string; mime: string; size: number; url?: string }>;
    status: 'ingested' | 'parsed' | 'classified';
}

export interface ThreadState {
    thread_id: string;
    lane: Lane;
    needs_review: boolean;
    category: Category;
    reason: string | null;
    rule_id: string | null;
    confidence: number;
    risk_level: 'low' | 'medium' | 'high';
    evidence: string[];
    updated_at: string;
    user_overridden: boolean;
}

export interface Receipt {
    id: string;
    thread_id: string;
    source_message_id: string;
    vendor_name: string;
    merchant_domain: string | null;
    amount: number;
    currency: string;
    date: string;
    category: 'software' | 'travel' | 'payroll' | 'services' | 'ads' | 'other';
    payment_status: 'paid' | 'pending' | 'failed' | 'unknown';
    transaction_reference: string | null;
    amount_source: 'body' | 'attachment' | 'header';
    evidence: string[];
    confidence: number;
}

export interface Rule {
    id: string;
    enabled: boolean;
    priority: number;
    match: {
        from_domain?: string;
        subject_contains?: string[];
        body_contains?: string[];
        has_attachment?: boolean;
        amount_present?: boolean;
    };
    action: {
        set_lane?: Lane;
        set_category?: Category;
        set_needs_review?: boolean;
        set_receipt_category?: Receipt['category'];
    };
    reason_template: string;
}

export interface ClassificationResult {
    threadState: Omit<ThreadState, 'updated_at'>;
    receipts: Omit<Receipt, 'id'>[];
}
