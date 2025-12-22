/**
 * useTriageData Hook
 *
 * Custom hook for fetching contact triage data and statistics
 */

import { useState, useEffect } from 'react';

export interface TriageStats {
    total_contacts: number;
    hot_leads: number;
    active: number;
    at_risk: number;
    cold: number;
    churned: number;
    avg_health_score: number;
    avg_momentum_score: number;
}

export interface TriageBreakdown {
    hot_leads: { count: number; percentage: string };
    active: { count: number; percentage: string };
    at_risk: { count: number; percentage: string };
    cold: { count: number; percentage: string };
    churned: { count: number; percentage: string };
}

export interface UseTriageStatsResult {
    stats: TriageStats | null;
    breakdown: TriageBreakdown | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useTriageStats(): UseTriageStatsResult {
    const [stats, setStats] = useState<TriageStats | null>(null);
    const [breakdown, setBreakdown] = useState<TriageBreakdown | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/contacts/triage/stats');
            if (!response.ok) {
                throw new Error('Failed to fetch triage statistics');
            }

            const data = await response.json();
            setStats(data.stats);
            setBreakdown(data.breakdown);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    return { stats, breakdown, loading, error, refetch: fetchStats };
}

/**
 * useTriageActions Hook
 *
 * Fetch action recommendations
 */

export interface TriageAction {
    action: string;
    count: number;
    tier: string;
    description: string;
}

export interface UseTriageActionsResult {
    actions: TriageAction[];
    loading: boolean;
    error: string | null;
    totalActions: number;
    refetch: () => Promise<void>;
}

export function useTriageActions(): UseTriageActionsResult {
    const [actions, setActions] = useState<TriageAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalActions, setTotalActions] = useState(0);

    const fetchActions = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/contacts/triage/stats?type=actions');
            if (!response.ok) {
                throw new Error('Failed to fetch action recommendations');
            }

            const data = await response.json();
            setActions(data.actions || []);
            setTotalActions(data.total_actions || 0);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActions();
    }, []);

    return { actions, loading, error, totalActions, refetch: fetchActions };
}

/**
 * useRunTriage Hook
 *
 * Trigger manual triage execution
 */

export interface TriageResult {
    contactsProcessed: number;
    contactsUpdated: number;
    hotLeadsCount: number;
    atRiskCount: number;
    actionCount: number;
    duration: string;
}

export interface UseRunTriageResult {
    running: boolean;
    error: string | null;
    result: TriageResult | null;
    runTriage: () => Promise<void>;
}

export function useRunTriage(): UseRunTriageResult {
    const [running, setRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<TriageResult | null>(null);

    const runTriage = async () => {
        try {
            setRunning(true);
            setError(null);

            const response = await fetch('/api/contacts/triage?action=run', { method: 'POST' });
            if (!response.ok) {
                throw new Error('Failed to run triage');
            }

            const data = await response.json();
            setResult(data.results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setRunning(false);
        }
    };

    return { running, error, result, runTriage };
}
