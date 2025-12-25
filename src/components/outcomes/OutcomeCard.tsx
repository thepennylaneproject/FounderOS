/**
 * Outcome Card Component
 *
 * Compact card showing key "What Happened" metrics
 * Can be used inline on campaign/workflow lists or detail headers
 */

import { TrendingUp, AlertCircle, Zap, BarChart3 } from 'lucide-react';

interface OutcomeCardProps {
    type: 'campaign' | 'workflow';
    metrics: {
        total_sends?: number;
        open_rate?: number;
        click_rate?: number;
        total_executions?: number;
        success_rate?: number;
    };
    impact: {
        total_contacts_affected?: number;
        avg_score_impact: number;
        hot_leads_created: number;
        momentum_gained?: number;
        momentum_gain?: number;
    };
}

export function OutcomeCard({ type, metrics, impact }: OutcomeCardProps) {
    const momentumValue = impact.momentum_gained ?? impact.momentum_gain ?? 0;

    if (type === 'campaign') {
        return (
            <div className="editorial-card p-6 space-y-4">
                <h4 className="text-sm font-sans font-bold uppercase tracking-widest text-zinc-400">
                    Campaign Performance
                </h4>

                <div className="grid grid-cols-3 gap-4">
                    {/* Engagement */}
                    <div className="bg-white/5 p-3 rounded-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <BarChart3 size={14} className="text-blue-400" />
                            <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">
                                Open Rate
                            </span>
                        </div>
                        <p className="text-lg font-serif">
                            {metrics.open_rate ? metrics.open_rate.toFixed(1) : 0}%
                        </p>
                    </div>

                    {/* Clicks */}
                    <div className="bg-white/5 p-3 rounded-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp size={14} className="text-amber-400" />
                            <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">
                                Click Rate
                            </span>
                        </div>
                        <p className="text-lg font-serif">
                            {metrics.click_rate ? metrics.click_rate.toFixed(1) : 0}%
                        </p>
                    </div>

                    {/* Score Impact */}
                    <div
                        className={`p-3 rounded-sm ${
                            impact.avg_score_impact > 0
                                ? 'bg-emerald-50'
                                : impact.avg_score_impact < 0
                                  ? 'bg-red-50'
                                  : 'bg-white/5'
                        }`}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle
                                size={14}
                                className={
                                    impact.avg_score_impact > 0
                                        ? 'text-emerald-600'
                                        : impact.avg_score_impact < 0
                                          ? 'text-red-600'
                                          : 'text-zinc-400'
                                }
                            />
                            <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">
                                Score Δ
                            </span>
                        </div>
                        <p
                            className={`text-lg font-serif ${
                                impact.avg_score_impact > 0
                                    ? 'text-emerald-700'
                                    : impact.avg_score_impact < 0
                                      ? 'text-red-700'
                                      : ''
                            }`}
                        >
                            {impact.avg_score_impact > 0 ? '+' : ''}
                            {impact.avg_score_impact.toFixed(1)}
                        </p>
                    </div>
                </div>

                {/* Hot Leads and Momentum */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-sm border border-orange-200">
                        <Zap size={14} className="text-orange-500 animate-pulse" />
                        <div>
                            <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-orange-600">
                                Hot Leads
                            </p>
                            <p className="text-sm font-serif text-orange-700">{impact.hot_leads_created}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 rounded-sm border border-violet-200">
                        <TrendingUp size={14} className="text-violet-600" />
                        <div>
                            <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-violet-600">
                                Momentum
                            </p>
                            <p className="text-sm font-serif text-violet-700">{momentumValue}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Workflow type
    return (
        <div className="editorial-card p-6 space-y-4">
            <h4 className="text-sm font-sans font-bold uppercase tracking-widest text-zinc-400">
                Execution Performance
            </h4>

            <div className="grid grid-cols-3 gap-4">
                {/* Success Rate */}
                <div className="bg-white/5 p-3 rounded-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <BarChart3 size={14} className="text-emerald-400" />
                        <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">
                            Success Rate
                        </span>
                    </div>
                    <p className="text-lg font-serif">
                        {metrics.success_rate ? metrics.success_rate.toFixed(1) : 0}%
                    </p>
                </div>

                {/* Executions */}
                <div className="bg-white/5 p-3 rounded-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={14} className="text-blue-400" />
                        <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">
                            Executions
                        </span>
                    </div>
                    <p className="text-lg font-serif">{metrics.total_executions || 0}</p>
                </div>

                {/* Score Impact */}
                <div
                    className={`p-3 rounded-sm ${
                        impact.avg_score_impact > 0
                            ? 'bg-emerald-50'
                            : impact.avg_score_impact < 0
                              ? 'bg-red-50'
                              : 'bg-white/5'
                    }`}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle
                            size={14}
                            className={
                                impact.avg_score_impact > 0
                                    ? 'text-emerald-600'
                                    : impact.avg_score_impact < 0
                                      ? 'text-red-600'
                                      : 'text-zinc-400'
                            }
                        />
                        <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">
                            Score Δ
                        </span>
                    </div>
                    <p
                        className={`text-lg font-serif ${
                            impact.avg_score_impact > 0
                                ? 'text-emerald-700'
                                : impact.avg_score_impact < 0
                                  ? 'text-red-700'
                                  : ''
                        }`}
                    >
                        {impact.avg_score_impact > 0 ? '+' : ''}
                        {impact.avg_score_impact.toFixed(1)}
                    </p>
                </div>
            </div>

            {/* Hot Leads and Momentum */}
            <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-sm border border-orange-200">
                    <Zap size={14} className="text-orange-500 animate-pulse" />
                    <div>
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-orange-600">
                            Hot Leads
                        </p>
                        <p className="text-sm font-serif text-orange-700">{impact.hot_leads_created}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 rounded-sm border border-violet-200">
                    <TrendingUp size={14} className="text-violet-600" />
                    <div>
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-violet-600">
                            Momentum
                        </p>
                        <p className="text-sm font-serif text-violet-700">{momentumValue}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
