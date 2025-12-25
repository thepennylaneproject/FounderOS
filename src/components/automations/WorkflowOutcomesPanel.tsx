/**
 * Workflow Outcomes Panel Component
 *
 * Displays "What Happened" metrics for a workflow:
 * - Execution metrics (success rate, failures)
 * - Contact impact (score changes, hot leads created)
 * - Top impacted contacts
 * - Recalculate button for manual refresh
 */

import { useState, useEffect } from 'react';
import { Activity, CheckCircle, AlertCircle, RefreshCw, Zap, TrendingUp } from 'lucide-react';

interface WorkflowOutcome {
    metrics: {
        total_executions: number;
        successful_executions: number;
        failed_executions: number;
        partial_executions: number;
        success_rate: number;
        avg_recipients_affected: number;
    };
    impact: {
        total_executions: number;
        contacts_affected: number;
        total_score_gain: number;
        avg_score_impact: number;
        success_rate: number;
        hot_leads_created: number;
        momentum_gain: number;
        failed_executions: number;
        top_impacted_contacts: Array<{
            contact_id: string;
            email: string;
            execution_status: 'success' | 'failed' | 'partial';
            action_type: string;
            score_impact: number;
            momentum_impact: number;
            is_hot_lead_now: boolean;
        }>;
    };
}

interface Props {
    workflowId: string;
    workflowName: string;
}

export function WorkflowOutcomesPanel({ workflowId, workflowName }: Props) {
    const [outcomes, setOutcomes] = useState<WorkflowOutcome | null>(null);
    const [loading, setLoading] = useState(true);
    const [recalculating, setRecalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchOutcomes();
    }, [workflowId]);

    const fetchOutcomes = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`/api/workflows/${workflowId}/outcomes`);
            if (!response.ok) throw new Error('Failed to fetch outcomes');
            const data = await response.json();
            setOutcomes(data.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const handleRecalculate = async () => {
        try {
            setRecalculating(true);
            const response = await fetch(
                `/api/workflows/${workflowId}/outcomes/recalculate`,
                { method: 'POST' }
            );
            if (!response.ok) throw new Error('Failed to recalculate');
            await fetchOutcomes();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to recalculate');
        } finally {
            setRecalculating(false);
        }
    };

    if (loading) {
        return (
            <div className="editorial-card p-8 flex items-center justify-center min-h-96">
                <RefreshCw size={20} className="animate-spin text-zinc-400" />
            </div>
        );
    }

    if (error || !outcomes) {
        return (
            <div className="editorial-card p-6 bg-red-50 border border-red-200">
                <div className="flex items-center gap-3 mb-2">
                    <AlertCircle size={18} className="text-red-600" />
                    <h3 className="text-lg font-serif text-red-900">Failed to Load Outcomes</h3>
                </div>
                <p className="text-sm text-red-700 mb-4">{error}</p>
                <button
                    onClick={fetchOutcomes}
                    className="text-sm font-sans font-bold uppercase tracking-widest text-red-600 hover:text-red-700"
                >
                    Try Again
                </button>
            </div>
        );
    }

    const { metrics, impact } = outcomes;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-black/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-[var(--ivory)] border border-black/5">
                        <Activity size={20} className="text-[var(--forest-green)]" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-serif">What Happened</h3>
                        <p className="text-sm text-zinc-500">Execution & impact metrics</p>
                    </div>
                </div>
                <button
                    onClick={handleRecalculate}
                    disabled={recalculating}
                    className="flex items-center gap-2 px-4 py-2 text-[10px] font-sans font-bold uppercase tracking-widest border border-black/5 rounded-sm hover:bg-black/[0.02] disabled:opacity-50"
                >
                    <RefreshCw size={12} className={recalculating ? 'animate-spin' : ''} />
                    Recalculate
                </button>
            </div>

            {/* Execution Metrics Grid */}
            <div className="space-y-4">
                <h4 className="text-sm font-sans font-bold uppercase tracking-widest text-zinc-400">
                    Execution Overview
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {/* Total Executions */}
                    <div className="editorial-card p-4">
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 mb-2">
                            Executions
                        </p>
                        <h3 className="text-2xl font-serif mb-1">{metrics.total_executions}</h3>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <div className="w-2 h-2 rounded-full bg-blue-400" />
                            Total
                        </div>
                    </div>

                    {/* Success Rate */}
                    <div className="editorial-card p-4 bg-emerald-50 border-emerald-200">
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-emerald-600 mb-2">
                            Success Rate
                        </p>
                        <h3 className="text-2xl font-serif text-emerald-700 mb-1">
                            {metrics.success_rate.toFixed(1)}%
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-emerald-600">
                            <CheckCircle size={12} />
                            {metrics.successful_executions} succeeded
                        </div>
                    </div>

                    {/* Partial Executions */}
                    {metrics.partial_executions > 0 && (
                        <div className="editorial-card p-4 bg-amber-50 border-amber-200">
                            <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-amber-600 mb-2">
                                Partial
                            </p>
                            <h3 className="text-2xl font-serif text-amber-700">{metrics.partial_executions}</h3>
                            <p className="text-[10px] text-amber-600 mt-1">incomplete actions</p>
                        </div>
                    )}

                    {/* Failed Executions */}
                    {metrics.failed_executions > 0 && (
                        <div className="editorial-card p-4 bg-red-50 border-red-200">
                            <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-red-600 mb-2">
                                Failed
                            </p>
                            <h3 className="text-2xl font-serif text-red-700">{metrics.failed_executions}</h3>
                            <p className="text-[10px] text-red-600 mt-1">with errors</p>
                        </div>
                    )}

                    {/* Avg Recipients */}
                    <div className="editorial-card p-4">
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 mb-2">
                            Avg Recipients
                        </p>
                        <h3 className="text-2xl font-serif">
                            {metrics.avg_recipients_affected.toFixed(1)}
                        </h3>
                        <p className="text-[10px] text-zinc-500 mt-1">per execution</p>
                    </div>
                </div>
            </div>

            {/* Impact Metrics */}
            <div className="space-y-4">
                <h4 className="text-sm font-sans font-bold uppercase tracking-widest text-zinc-400">
                    Contact Impact
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Contacts Affected */}
                    <div className="editorial-card p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">
                                Contacts Affected
                            </p>
                            <TrendingUp size={14} className="text-zinc-300" />
                        </div>
                        <h3 className="text-2xl font-serif">{impact.contacts_affected}</h3>
                    </div>

                    {/* Average Score Impact */}
                    <div
                        className={`editorial-card p-4 ${
                            impact.avg_score_impact > 0
                                ? 'bg-emerald-50 border-emerald-200'
                                : impact.avg_score_impact < 0
                                  ? 'bg-red-50 border-red-200'
                                  : ''
                        }`}
                    >
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 mb-2">
                            Avg Score Impact
                        </p>
                        <h3
                            className={`text-2xl font-serif ${
                                impact.avg_score_impact > 0
                                    ? 'text-emerald-700'
                                    : impact.avg_score_impact < 0
                                      ? 'text-red-700'
                                      : ''
                            }`}
                        >
                            {impact.avg_score_impact > 0 ? '+' : ''}
                            {impact.avg_score_impact.toFixed(1)}
                        </h3>
                        <p className="text-[10px] text-zinc-500 mt-1">points per contact</p>
                    </div>

                    {/* Hot Leads Created */}
                    <div className="editorial-card p-4 bg-orange-50 border-orange-200">
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-orange-600 mb-2">
                            Hot Leads Created
                        </p>
                        <h3 className="text-2xl font-serif text-orange-700 flex items-center gap-2">
                            {impact.hot_leads_created}
                            <Zap size={16} className="animate-pulse" />
                        </h3>
                    </div>

                    {/* Momentum Gained */}
                    <div className="editorial-card p-4 bg-violet-50 border-violet-200">
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-violet-600 mb-2">
                            Momentum Gained
                        </p>
                        <h3 className="text-2xl font-serif text-violet-700">{impact.momentum_gain}</h3>
                        <p className="text-[10px] text-zinc-500 mt-1">total points</p>
                    </div>
                </div>
            </div>

            {/* Top Impacted Contacts */}
            {impact.top_impacted_contacts.length > 0 && (
                <div className="space-y-4">
                    <h4 className="text-sm font-sans font-bold uppercase tracking-widest text-zinc-400">
                        Most Impacted Contacts
                    </h4>
                    <div className="space-y-0 divide-y divide-black/5">
                        {impact.top_impacted_contacts.slice(0, 5).map((contact, i) => (
                            <div
                                key={contact.contact_id}
                                className="flex items-center justify-between py-4 px-4 hover:bg-black/[0.02] transition-colors"
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <span className="text-[10px] font-sans font-bold text-zinc-300">
                                        {(i + 1).toString().padStart(2, '0')}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-sans truncate">{contact.email}</p>
                                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1">
                                            <span className="capitalize">{contact.action_type.replace('_', ' ')}</span>
                                            <span className="text-zinc-300">•</span>
                                            <span className={contact.execution_status === 'success' ? 'text-emerald-600' : contact.execution_status === 'failed' ? 'text-red-600' : 'text-amber-600'}>
                                                {contact.execution_status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className={`text-sm font-serif ${contact.score_impact > 0 ? 'text-emerald-600' : contact.score_impact < 0 ? 'text-red-600' : 'text-zinc-400'}`}>
                                            {contact.score_impact > 0 ? '+' : ''}
                                            {contact.score_impact.toFixed(1)}
                                        </p>
                                        <p className="text-[10px] text-zinc-500">score impact</p>
                                    </div>
                                    {contact.is_hot_lead_now && (
                                        <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 rounded-sm border border-orange-200">
                                            <Zap size={12} className="text-orange-500" />
                                            <span className="text-[10px] font-sans font-bold text-orange-600">Hot</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
