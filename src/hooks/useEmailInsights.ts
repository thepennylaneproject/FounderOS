/**
 * useEmailInsights Hook
 *
 * Custom hook for fetching email analysis insights for a contact
 */

import { useState, useEffect } from 'react';

export interface EmailInsightData {
    id: string;
    email_log_id: string;
    intent: 'inquiry' | 'objection' | 'buying_signal' | 'low_interest' | 'technical' | 'unknown';
    sentiment: 'positive' | 'neutral' | 'negative';
    urgency: 'high' | 'medium' | 'low';
    timeline_mentioned?: string;
    decision_timeline: 'immediate' | 'short_term' | '30-90_days' | 'long_term' | 'undefined';
    buying_signals: string[];
    objections: string[];
    action_items: string[];
    questions_asked: string[];
    recommended_action: 'immediate_outreach' | 'schedule_call' | 'send_proposal' | 'nurture' | 'wait';
    recommended_action_description: string;
    suggested_score_delta: number;
    suggested_momentum_delta: number;
    should_mark_hot_lead: boolean;
    suggested_closer_signal?: string;
    confidence_score: number;
    created_at: string;
    subject: string;
    email_received_at: string;
}

export interface UseEmailInsightsResult {
    insights: EmailInsightData[];
    loading: boolean;
    error: string | null;
    total: number;
    hasMore: boolean;
    refetch: () => Promise<void>;
    loadMore: () => Promise<void>;
}

export function useEmailInsights(contactId: string): UseEmailInsightsResult {
    const [insights, setInsights] = useState<EmailInsightData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);

    const fetchInsights = async (currentOffset = 0) => {
        try {
            if (currentOffset === 0) {
                setLoading(true);
            }
            setError(null);

            const response = await fetch(
                `/api/contacts/${contactId}/email-insights?limit=20&offset=${currentOffset}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch email insights');
            }

            const data = await response.json();

            if (currentOffset === 0) {
                setInsights(data.insights);
            } else {
                setInsights(prev => [...prev, ...data.insights]);
            }

            setTotal(data.pagination.total);
            setHasMore(data.pagination.has_more);
            setOffset(currentOffset);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const loadMore = async () => {
        await fetchInsights(offset + 20);
    };

    useEffect(() => {
        if (contactId) {
            fetchInsights(0);
        }
    }, [contactId]);

    return { insights, loading, error, total, hasMore, refetch: () => fetchInsights(0), loadMore };
}

/**
 * useDailyEmailIntelligenceJob Hook
 *
 * Trigger and monitor the daily email intelligence analysis job
 */

export interface JobResult {
    status: 'running' | 'completed' | 'failed';
    startedAt: string;
    completedAt?: string;
    emailsProcessed: number;
    contactsUpdated: number;
    contactsUpscored: number;
    triggers_fired: number;
    errors: string[];
}

export interface UseDailyEmailIntelligenceJobResult {
    running: boolean;
    error: string | null;
    result: JobResult | null;
    runJob: () => Promise<void>;
}

export function useDailyEmailIntelligenceJob(): UseDailyEmailIntelligenceJobResult {
    const [running, setRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<JobResult | null>(null);

    const runJob = async () => {
        try {
            setRunning(true);
            setError(null);

            const response = await fetch('/api/jobs/daily-email-intelligence', { method: 'POST' });
            if (!response.ok) {
                throw new Error('Failed to run email intelligence job');
            }

            const data = await response.json();
            setResult(data.result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setRunning(false);
        }
    };

    return { running, error, result, runJob };
}
