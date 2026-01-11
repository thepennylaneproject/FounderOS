'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, TrendingUp, Target, ChevronRight, Flame, RefreshCw } from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { AIDraftModal } from '@/components/crm/AIDraftModal';

interface SuggestedAction {
    type: 'follow_up' | 'rescue' | 'close';
    contactId: string;
    contactName: string;
    contactEmail: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
}

interface InfraAlert {
    domain: string;
    issue: string;
    severity: 'critical' | 'warning' | 'info';
}

interface BriefData {
    generatedAt: string;
    summary: string;
    hotLeadCount: number;
    slippingCount: number;
    closerOpportunityCount: number;
    suggestedActions: SuggestedAction[];
    infrastructureAlerts: InfraAlert[];
}

export const BriefPanel: React.FC = () => {
    const [brief, setBrief] = useState<BriefData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(true);
    const { openModal, showToast } = useUI();

    const fetchBrief = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/intelligence/brief');
            if (!res.ok) throw new Error('Failed to fetch brief');
            const data = await res.json();
            setBrief(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBrief();
    }, []);

    const handleActionClick = (action: SuggestedAction) => {
        openModal(
            'Intelligence Email Draft',
            <AIDraftModal contact={{
                id: action.contactId,
                email: action.contactEmail,
                first_name: action.contactName.split(' ')[0],
                last_name: action.contactName.split(' ')[1] || '',
                company_name: null
            }} />
        );
    };

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-[var(--forest-green)] to-[#1a2a1f] text-[var(--ivory)] p-8 rounded-sm animate-pulse">
                <div className="flex items-center gap-3">
                    <Sparkles className="text-[var(--rose-gold)]" />
                    <span className="text-sm font-sans font-bold uppercase tracking-widest">Generating Strategic Brief...</span>
                </div>
            </div>
        );
    }

    if (!brief) return null;

    return (
        <div className="bg-gradient-to-br from-[var(--forest-green)] to-[#1a2a1f] text-[var(--ivory)] rounded-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
            {/* Header */}
            <div
                className="p-6 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-[var(--rose-gold)]/20 rounded-full">
                        <Sparkles className="text-[var(--rose-gold)]" size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-white/60">Strategic Brief</p>
                        <p className="text-sm font-serif italic mt-0.5">{new Date(brief.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={(e) => { e.stopPropagation(); fetchBrief(); }}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <ChevronRight size={16} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
                </div>
            </div>

            {/* Summary */}
            {expanded && (
                <div className="px-6 pb-6 space-y-6 animate-in fade-in duration-300">
                    <p className="text-lg font-serif leading-relaxed border-l-2 border-[var(--rose-gold)] pl-4">
                        {brief.summary}
                    </p>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/5 p-4 rounded-sm text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <Flame size={14} className="text-orange-400" />
                                <span className="text-2xl font-serif">{brief.hotLeadCount}</span>
                            </div>
                            <p className="text-[10px] font-sans uppercase tracking-widest text-white/60">Hot Leads</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-sm text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <AlertTriangle size={14} className="text-amber-400" />
                                <span className="text-2xl font-serif">{brief.slippingCount}</span>
                            </div>
                            <p className="text-[10px] font-sans uppercase tracking-widest text-white/60">Slipping</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-sm text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <Target size={14} className="text-green-400" />
                                <span className="text-2xl font-serif">{brief.closerOpportunityCount}</span>
                            </div>
                            <p className="text-[10px] font-sans uppercase tracking-widest text-white/60">Closers</p>
                        </div>
                    </div>

                    {/* Suggested Actions */}
                    {brief.suggestedActions.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-white/60">Suggested Actions</p>
                            {brief.suggestedActions.slice(0, 3).map((action, i) => (
                                <div
                                    key={i}
                                    onClick={() => handleActionClick(action)}
                                    className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors rounded-sm group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${action.priority === 'high' ? 'bg-red-400' :
                                                action.priority === 'medium' ? 'bg-amber-400' : 'bg-green-400'
                                            }`} />
                                        <div>
                                            <p className="text-sm font-sans font-medium">{action.contactName}</p>
                                            <p className="text-[10px] text-white/60 italic">{action.reason}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-sans font-bold uppercase tracking-widest px-2 py-1 bg-white/10 rounded-full group-hover:bg-[var(--rose-gold)] group-hover:text-[var(--forest-green)] transition-colors">
                                        {action.type.replace('_', ' ')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Infrastructure Alerts */}
                    {brief.infrastructureAlerts.length > 0 && (
                        <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle size={14} className="text-amber-400" />
                                <p className="text-[10px] font-sans font-bold uppercase tracking-widest">Infrastructure</p>
                            </div>
                            {brief.infrastructureAlerts.map((alert, i) => (
                                <p key={i} className="text-xs font-sans text-white/80">
                                    <span className="font-medium">{alert.domain}</span>: {alert.issue}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
