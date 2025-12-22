/**
 * Contact Triage Overview Dashboard
 *
 * Main dashboard component showing contact segmentation by triage tier
 * and recommended next-best-actions for each group
 */

import { useState, useEffect } from 'react';
import { Users, TrendingUp, AlertCircle, RefreshCw, Zap, Target } from 'lucide-react';

interface TriageStats {
    total_contacts: number;
    hot_leads: number;
    active: number;
    at_risk: number;
    cold: number;
    churned: number;
    avg_health_score: number;
    avg_momentum_score: number;
}

interface TriageBreakdown {
    hot_leads: { count: number; percentage: string };
    active: { count: number; percentage: string };
    at_risk: { count: number; percentage: string };
    cold: { count: number; percentage: string };
    churned: { count: number; percentage: string };
}

interface ActionItem {
    action: string;
    count: number;
    tier: string;
    description: string;
}

export function ContactTriageOverview() {
    const [stats, setStats] = useState<TriageStats | null>(null);
    const [breakdown, setBreakdown] = useState<TriageBreakdown | null>(null);
    const [actions, setActions] = useState<ActionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTriageData();
    }, []);

    const fetchTriageData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch stats
            const statsRes = await fetch('/api/contacts/triage/stats');
            if (!statsRes.ok) throw new Error('Failed to fetch stats');
            const statsData = await statsRes.json();

            setStats(statsData.stats);
            setBreakdown(statsData.breakdown);

            // Fetch actions
            const actionsRes = await fetch('/api/contacts/triage/stats?type=actions');
            if (!actionsRes.ok) throw new Error('Failed to fetch actions');
            const actionsData = await actionsRes.json();
            setActions(actionsData.actions);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const handleRunTriage = async () => {
        try {
            setRunning(true);
            const res = await fetch('/api/contacts/triage?action=run', { method: 'POST' });
            if (!res.ok) throw new Error('Failed to run triage');

            // Refresh data after running
            await fetchTriageData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to run triage');
        } finally {
            setRunning(false);
        }
    };

    if (loading) {
        return (
            <div className="editorial-card p-8 flex items-center justify-center min-h-96">
                <RefreshCw size={20} className="animate-spin text-zinc-400" />
            </div>
        );
    }

    if (error || !stats || !breakdown) {
        return (
            <div className="editorial-card p-6 bg-red-50 border border-red-200">
                <div className="flex items-center gap-3 mb-2">
                    <AlertCircle size={18} className="text-red-600" />
                    <h3 className="text-lg font-serif text-red-900">Failed to Load Triage Data</h3>
                </div>
                <p className="text-sm text-red-700 mb-4">{error}</p>
                <button
                    onClick={fetchTriageData}
                    className="text-sm font-sans font-bold uppercase tracking-widest text-red-600 hover:text-red-700"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-black/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-[var(--ivory)] border border-black/5">
                        <Users size={20} className="text-[var(--forest-green)]" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-serif">Contact Triage</h3>
                        <p className="text-sm text-zinc-500">Automated contact segmentation & recommendations</p>
                    </div>
                </div>
                <button
                    onClick={handleRunTriage}
                    disabled={running}
                    className="flex items-center gap-2 px-4 py-2 text-[10px] font-sans font-bold uppercase tracking-widest border border-black/5 rounded-sm hover:bg-black/[0.02] disabled:opacity-50"
                >
                    <RefreshCw size={12} className={running ? 'animate-spin' : ''} />
                    Run Triage
                </button>
            </div>

            {/* Summary Stats */}
            <div className="space-y-4">
                <h4 className="text-sm font-sans font-bold uppercase tracking-widest text-zinc-400">
                    Contact Breakdown
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {/* Total Contacts */}
                    <div className="editorial-card p-4">
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 mb-2">
                            Total
                        </p>
                        <h3 className="text-2xl font-serif mb-1">{stats.total_contacts}</h3>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <Users size={12} />
                            Contacts
                        </div>
                    </div>

                    {/* Hot Leads */}
                    <div className="editorial-card p-4 bg-orange-50 border-orange-200">
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-orange-600 mb-2">
                            Hot Leads
                        </p>
                        <h3 className="text-2xl font-serif text-orange-700 flex items-center gap-1">
                            {stats.hot_leads}
                            <Zap size={14} className="animate-pulse" />
                        </h3>
                        <p className="text-[10px] text-orange-600 mt-1">{breakdown.hot_leads.percentage}% of total</p>
                    </div>

                    {/* Active */}
                    <div className="editorial-card p-4 bg-emerald-50 border-emerald-200">
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-emerald-600 mb-2">
                            Active
                        </p>
                        <h3 className="text-2xl font-serif text-emerald-700">{stats.active}</h3>
                        <p className="text-[10px] text-emerald-600 mt-1">{breakdown.active.percentage}% of total</p>
                    </div>

                    {/* At Risk */}
                    <div className="editorial-card p-4 bg-amber-50 border-amber-200">
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-amber-600 mb-2">
                            At Risk
                        </p>
                        <h3 className="text-2xl font-serif text-amber-700">{stats.at_risk}</h3>
                        <p className="text-[10px] text-amber-600 mt-1">{breakdown.at_risk.percentage}% of total</p>
                    </div>

                    {/* Cold */}
                    <div className="editorial-card p-4 bg-blue-50 border-blue-200">
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-blue-600 mb-2">
                            Cold
                        </p>
                        <h3 className="text-2xl font-serif text-blue-700">{stats.cold}</h3>
                        <p className="text-[10px] text-blue-600 mt-1">{breakdown.cold.percentage}% of total</p>
                    </div>
                </div>
            </div>

            {/* Health Metrics */}
            <div className="space-y-4">
                <h4 className="text-sm font-sans font-bold uppercase tracking-widest text-zinc-400">
                    Overall Health
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="editorial-card p-4">
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 mb-2">
                            Avg Health Score
                        </p>
                        <h3 className="text-2xl font-serif">{stats.avg_health_score.toFixed(1)}</h3>
                        <p className="text-[10px] text-zinc-500 mt-1">out of 100</p>
                    </div>

                    <div className="editorial-card p-4">
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 mb-2">
                            Avg Momentum
                        </p>
                        <h3 className="text-2xl font-serif">{stats.avg_momentum_score.toFixed(1)}</h3>
                        <p className="text-[10px] text-zinc-500 mt-1">out of 100</p>
                    </div>

                    <div className="editorial-card p-4 bg-green-50 border-green-200">
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-green-600 mb-2">
                            Churn Risk
                        </p>
                        <h3 className="text-2xl font-serif text-green-700">
                            {((stats.churned / stats.total_contacts) * 100).toFixed(1)}%
                        </h3>
                        <p className="text-[10px] text-green-600 mt-1">{stats.churned} contacts churned</p>
                    </div>
                </div>
            </div>

            {/* Action Recommendations */}
            {actions.length > 0 && (
                <div className="space-y-4">
                    <h4 className="text-sm font-sans font-bold uppercase tracking-widest text-zinc-400">
                        Recommended Actions
                    </h4>
                    <div className="space-y-3">
                        {actions.map((action) => (
                            <div
                                key={action.action}
                                className="editorial-card p-4 hover:border-[var(--forest-green)] transition-colors cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                        <Target size={16} className="text-[var(--forest-green)]" />
                                        <div className="flex-1">
                                            <h5 className="text-sm font-sans font-bold capitalize">
                                                {action.action.replace(/_/g, ' ')}
                                            </h5>
                                            <p className="text-xs text-zinc-500 mt-1">{action.description}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-serif">{action.count}</p>
                                        <p className="text-[10px] font-sans uppercase tracking-widest text-zinc-400">
                                            {action.tier}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
