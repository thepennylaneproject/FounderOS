/**
 * Triaged Contacts List Component
 *
 * Displays contacts organized by triage tier with their scores and next actions
 */

import { useState, useEffect } from 'react';
import { ChevronRight, RefreshCw, AlertCircle, Zap } from 'lucide-react';

type TriageTier = 'hot_lead' | 'active' | 'at_risk' | 'cold' | 'churned';

interface TriagedContact {
    contact_id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
    health_score: number;
    momentum_score: number;
    triage_tier: TriageTier;
    next_best_action: string;
    reason: string;
    days_since_engagement: number;
    recent_opens: number;
    recent_clicks: number;
}

interface Props {
    tier?: TriageTier;
    limit?: number;
}

const tierConfig: Record<TriageTier, { color: string; bgColor: string; icon: string; description: string }> = {
    hot_lead: { color: 'orange', bgColor: 'bg-orange-50', icon: '🔥', description: 'High value, ready to convert' },
    active: { color: 'emerald', bgColor: 'bg-emerald-50', icon: '✓', description: 'Engaged and responsive' },
    at_risk: { color: 'amber', bgColor: 'bg-amber-50', icon: '⚠', description: 'Declining engagement' },
    cold: { color: 'blue', bgColor: 'bg-blue-50', icon: '❄', description: 'Low or no engagement' },
    churned: { color: 'red', bgColor: 'bg-red-50', icon: '✕', description: 'No longer active' }
};

const actionConfig: Record<string, { label: string; color: string }> = {
    schedule_call: { label: 'Schedule Call', color: 'text-orange-600' },
    send_urgent_campaign: { label: 'Send Campaign', color: 'text-emerald-600' },
    send_nurture: { label: 'Send Nurture', color: 'text-blue-600' },
    send_re_engagement: { label: 'Re-engage', color: 'text-amber-600' },
    enrich_profile: { label: 'Enrich', color: 'text-violet-600' },
    remove_from_list: { label: 'Remove', color: 'text-red-600' },
    wait: { label: 'Wait', color: 'text-zinc-600' }
};

export function TriagedContactsList({ tier, limit = 20 }: Props) {
    const [contacts, setContacts] = useState<TriagedContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        fetchContacts();
    }, [tier]);

    const fetchContacts = async () => {
        try {
            setLoading(true);
            setError(null);

            let url = `/api/contacts/triage?limit=${limit}`;
            if (tier) {
                url += `&tier=${tier}`;
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch contacts');

            const data = await res.json();
            setContacts(data.contacts);
            setTotal(data.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="editorial-card p-8 flex items-center justify-center min-h-64">
                <RefreshCw size={20} className="animate-spin text-zinc-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="editorial-card p-6 bg-red-50 border border-red-200">
                <div className="flex items-center gap-3 mb-2">
                    <AlertCircle size={18} className="text-red-600" />
                    <h3 className="text-lg font-serif text-red-900">Failed to Load Contacts</h3>
                </div>
                <p className="text-sm text-red-700 mb-4">{error}</p>
                <button
                    onClick={fetchContacts}
                    className="text-sm font-sans font-bold uppercase tracking-widest text-red-600 hover:text-red-700"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (contacts.length === 0) {
        return (
            <div className="editorial-card p-8 text-center">
                <p className="text-zinc-500">No contacts found in this tier</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-black/5">
                <div>
                    <h3 className="text-lg font-serif">
                        {tier ? `${tier.replace('_', ' ').toUpperCase()} Contacts` : 'All Contacts'}
                    </h3>
                    <p className="text-sm text-zinc-500">
                        Showing {contacts.length} of {total} {tier ? `${tier} ` : ''}contacts
                    </p>
                </div>
                <button
                    onClick={fetchContacts}
                    className="p-2 hover:bg-black/[0.02] rounded-sm transition-colors"
                >
                    <RefreshCw size={16} className="text-zinc-400" />
                </button>
            </div>

            <div className="space-y-2 divide-y divide-black/5">
                {contacts.map((contact, i) => {
                    const config = tierConfig[contact.triage_tier];
                    const actionConfig_ = actionConfig[contact.next_best_action] || { label: contact.next_best_action, color: 'text-zinc-600' };

                    return (
                        <div
                            key={contact.contact_id}
                            className="py-4 px-4 hover:bg-black/[0.02] transition-colors cursor-pointer group -mx-4 px-4"
                        >
                            <div className="flex items-center gap-4">
                                {/* Index & Tier */}
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-sans font-bold text-zinc-300">
                                        {(i + 1).toString().padStart(2, '0')}
                                    </span>
                                    <div className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center text-sm`}>
                                        {config.icon}
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-sans truncate">
                                            {contact.first_name ? `${contact.first_name} ` : ''}
                                            {contact.last_name}
                                        </p>
                                        {contact.company_name && (
                                            <span className="text-[10px] font-sans text-zinc-400">
                                                {contact.company_name}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-zinc-500 truncate mt-1">{contact.email}</p>
                                    <p className="text-[10px] text-zinc-400 italic mt-1">{contact.reason}</p>
                                </div>

                                {/* Scores */}
                                <div className="flex items-center gap-6">
                                    {/* Health Score */}
                                    <div className="text-right hidden md:block">
                                        <p className="text-sm font-serif">{contact.health_score}</p>
                                        <p className="text-[10px] font-sans uppercase tracking-widest text-zinc-400">
                                            Health
                                        </p>
                                    </div>

                                    {/* Momentum Score */}
                                    <div className="text-right hidden md:block">
                                        <p className="text-sm font-serif">{contact.momentum_score}</p>
                                        <p className="text-[10px] font-sans uppercase tracking-widest text-zinc-400">
                                            Momentum
                                        </p>
                                    </div>

                                    {/* Next Action */}
                                    <div className="text-right">
                                        <p className={`text-[10px] font-sans font-bold uppercase tracking-widest ${actionConfig_.color}`}>
                                            {actionConfig_.label}
                                        </p>
                                        <p className="text-[10px] text-zinc-500 mt-1">
                                            {contact.days_since_engagement}d ago
                                        </p>
                                    </div>

                                    {/* Hot Lead Indicator */}
                                    {contact.triage_tier === 'hot_lead' && (
                                        <Zap size={14} className="text-orange-500 animate-pulse" />
                                    )}

                                    {/* Chevron */}
                                    <ChevronRight size={16} className="text-zinc-300 group-hover:text-zinc-600 transition-colors" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {total > limit && (
                <div className="text-center py-4">
                    <button className="text-sm font-sans font-bold uppercase tracking-widest text-[var(--forest-green)] hover:text-[var(--forest-green)]/80">
                        Load More ({total - limit} remaining)
                    </button>
                </div>
            )}
        </div>
    );
}
