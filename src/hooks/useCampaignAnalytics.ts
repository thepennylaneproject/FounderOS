/**
 * useCampaignAnalytics Hook
 *
 * Custom hook for fetching campaign analytics data
 */

import { useState, useEffect } from 'react';

export interface UseCampaignAnalyticsResult {
    data: any;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useCampaignAnalytics(campaignId: string): UseCampaignAnalyticsResult {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/campaigns/${campaignId}/analytics`);
            if (!response.ok) {
                throw new Error('Failed to fetch campaign analytics');
            }

            const result = await response.json();
            setData(result.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (campaignId) {
            fetchAnalytics();
        }
    }, [campaignId]);

    return { data, loading, error, refetch: fetchAnalytics };
}

/**
 * useDashboardAnalytics Hook
 *
 * Fetch aggregate campaign analytics for dashboard
 */

export interface UseDashboardAnalyticsResult {
    data: any;
    loading: boolean;
    error: string | null;
    daysBack: number;
    setDaysBack: (days: number) => void;
}

export function useDashboardAnalytics(initialDaysBack: number = 30): UseDashboardAnalyticsResult {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [daysBack, setDaysBack] = useState(initialDaysBack);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(`/api/campaigns/analytics/dashboard?daysBack=${daysBack}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch dashboard analytics');
                }

                const result = await response.json();
                setData(result.data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [daysBack]);

    return { data, loading, error, daysBack, setDaysBack };
}
