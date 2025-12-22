/**
 * useOutcomes Hook
 *
 * Custom hook for fetching campaign or workflow outcome data
 * Handles loading, error, and caching states
 */

import { useState, useEffect } from 'react';

export interface OutcomeData {
    metrics: Record<string, any>;
    impact: Record<string, any>;
    source?: 'cache' | 'calculated';
    calculated_at?: string;
}

export interface UseOutcomesResult {
    data: OutcomeData | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useOutcomes(
    type: 'campaign' | 'workflow',
    id: string
): UseOutcomesResult {
    const [data, setData] = useState<OutcomeData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOutcomes = async () => {
        try {
            setLoading(true);
            setError(null);

            const endpoint = type === 'campaign' ? `/api/campaigns/${id}/outcomes` : `/api/workflows/${id}/outcomes`;

            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${type} outcomes`);
            }

            const result = await response.json();
            setData(result.data || result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchOutcomes();
        }
    }, [type, id]);

    return {
        data,
        loading,
        error,
        refetch: fetchOutcomes
    };
}

/**
 * useOutcomeRecalculation Hook
 *
 * Handle manual recalculation of outcomes
 */

export interface UseOutcomeRecalculationResult {
    recalculating: boolean;
    error: string | null;
    recalculate: () => Promise<void>;
}

export function useOutcomeRecalculation(
    type: 'campaign' | 'workflow',
    id: string,
    onSuccess?: () => void
): UseOutcomeRecalculationResult {
    const [recalculating, setRecalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const recalculate = async () => {
        try {
            setRecalculating(true);
            setError(null);

            const endpoint =
                type === 'campaign'
                    ? `/api/campaigns/${id}/outcomes/recalculate`
                    : `/api/workflows/${id}/outcomes/recalculate`;

            const response = await fetch(endpoint, { method: 'POST' });
            if (!response.ok) {
                throw new Error(`Failed to recalculate ${type} outcomes`);
            }

            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setRecalculating(false);
        }
    };

    return {
        recalculating,
        error,
        recalculate
    };
}
