/**
 * Campaign Outcomes Panel Component
 *
 * Displays "What Happened" metrics for a campaign:
 * - Engagement rates (opens, clicks, replies, bounces)
 * - Contact impact (score changes, hot leads created)
 * - Top engaged and unengaged contacts
 * - Recalculate button for manual refresh
 */

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertCircle, RefreshCw, Zap } from 'lucide-react';

interface CampaignOutcome {
    metrics: {
        total_sends: number;
        total_opens: number;
        total_clicks: number;
        total_replies: number;
        total_bounces: number;
        open_rate: number;
        click_rate: number;
        reply_rate: number;
        bounce_rate: number;
    };
    impact: {
        total_contacts_affected: number;
        avg_score_impact: number;
        hot_leads_created: number;
        momentum_gained: number;
        top_engaged_contacts: Array<{
            contact_id: string;
            email: string;
            status: 'replied' | 'clicked' | 'opened' | 'unopened' | 'bounced';
        }>;
    };
}

interface Props {
    campaignId: string;
    campaignName: string;
}

export function CampaignOutcomesPanel({ campaignId, campaignName }: Props) {
    const [outcomes, setOutcomes] = useState<CampaignOutcome | null>(null);
    const [loading, setLoading] = useState(true);
    const [recalculating, setRecalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchOutcomes();
    }, [campaignId]);

    const fetchOutcomes = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`/api/campaigns/${campaignId}/outcomes`);
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
                `/api/campaigns/${campaignId}/outcomes/recalculate`,
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
                        <BarChart3 size={20} className="text-[var(--forest-green)]" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-serif">What Happened</h3>
                        <p className="text-sm text-zinc-500">Engagement & impact metrics</p>
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

            {/* Engagement Metrics Grid */}
            <div className="space-y-4">
                <h4 className="text-sm font-sans font-bold uppercase tracking-widest text-zinc-400">
                    Engagement Breakdown
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {/* Total Sends */}
                    <div className="editorial-card p-4">
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 mb-2">
                            Sends
                        </p>
                        <h3 className="text-2xl font-serif mb-1">{metrics.total_sends}</h3>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <div className="w-2 h-2 rounded-full bg-blue-400" />
                            Recipients
                        </div>
                    </div>

                    {/* Open Rate */}
                    <div className="editorial-card p-4">
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 mb-2">
                            Opens
                        </p>
                        <h3 className="text-2xl font-serif mb-1">
                            {metrics.total_opens}
                            <span className="text-sm text-zinc-400 ml-1">({metrics.open_rate.toFixed(1)}%)</span>
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                            Engaged
                        </div>
                    </div>

                    {/* Click Rate */}
                    <div className="editorial-card p-4">
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 mb-2">
                            Clicks
                        </p>
                        <h3 className="text-2xl font-serif mb-1">
                            {metrics.total_clicks}
                            <span className="text-sm text-zinc-400 ml-1">({metrics.click_rate.toFixed(1)}%)</span>
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                            Interested
                        </div>
                    </div>

                    {/* Reply Rate */}
                    <div className="editorial-card p-4">
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 mb-2">
                            Replies
                        </p>
                        <h3 className="text-2xl font-serif mb-1">
                            {metrics.total_replies}
                            <span className="text-sm text-zinc-400 ml-1">({metrics.reply_rate.toFixed(1)}%)</span>
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <div className="w-2 h-2 rounded-full bg-orange-400" />
                            Responded
                        </div>
                    </div>

                    {/* Bounce Rate */}
                    <div className="editorial-card p-4">
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 mb-2">
                            Bounces
                        </p>
                        <h3 className="text-2xl font-serif mb-1">
                            {metrics.total_bounces}
                            <span className="text-sm text-zinc-400 ml-1">({metrics.bounce_rate.toFixed(1)}%)</span>
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <div className="w-2 h-2 rounded-full bg-red-400" />
                            Failed
                        </div>
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
                        <h3 className="text-2xl font-serif">{impact.total_contacts_affected}</h3>
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
                        <h3 className="text-2xl font-serif text-violet-700">{impact.momentum_gained}</h3>
                        <p className="text-[10px] text-zinc-500 mt-1">total points</p>
                    </div>
                </div>
            </div>

            {/* Top Contacts */}
            {impact.top_engaged_contacts.length > 0 && (
                <div className="space-y-4">
                    <h4 className="text-sm font-sans font-bold uppercase tracking-widest text-zinc-400">
                        Most Engaged Contacts
                    </h4>
                    <div className="space-y-0 divide-y divide-black/5">
                        {impact.top_engaged_contacts.slice(0, 5).map((contact, i) => (
                            <div
                                key={contact.contact_id}
                                className="flex items-center justify-between py-3 px-4 hover:bg-black/[0.02] transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-sans font-bold text-zinc-300">
                                        {(i + 1).toString().padStart(2, '0')}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-sans truncate">{contact.email}</p>
                                        <p className="text-[10px] text-zinc-500 capitalize">
                                            {contact.status.replace('_', ' ')}
                                        </p>
                                    </div>
                                </div>
                                <div
                                    className={`w-2 h-2 rounded-full ${
                                        contact.status === 'replied'
                                            ? 'bg-orange-400'
                                            : contact.status === 'clicked'
                                              ? 'bg-amber-400'
                                              : contact.status === 'opened'
                                                ? 'bg-emerald-400'
                                                : 'bg-zinc-300'
                                    }`}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
