'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Globe, Activity, CheckCircle2, AlertCircle, RefreshCw, TrendingUp } from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { AddDomainForm } from '@/components/domains/AddDomainForm';

interface DomainDeliverability {
    domain: string;
    hasSPF: boolean;
    hasDKIM: boolean;
    hasDMARC: boolean;
    sendingVelocity: number;
    bounceRate: number;
    inboxPlacementProbability: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
}

export default function DomainsPage() {
    const [domains, setDomains] = useState<any[]>([]);
    const [deliverability, setDeliverability] = useState<DomainDeliverability[]>([]);
    const [loading, setLoading] = useState(true);
    const { openModal } = useUI();

    const fetchDomains = async () => {
        setLoading(true);
        try {
            const [domainsRes, deliverabilityRes] = await Promise.all([
                fetch('/api/domains'),
                fetch('/api/intelligence/deliverability')
            ]);
            const domainsData = await domainsRes.json();
            const deliverabilityData = await deliverabilityRes.json();
            setDomains(domainsData);
            setDeliverability(Array.isArray(deliverabilityData) ? deliverabilityData : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDomains();
    }, []);

    const handleAddDomain = () => {
        openModal(
            'Add Domain Infrastructure',
            <AddDomainForm onSuccess={fetchDomains} />
        );
    };

    const getDeliverabilityForDomain = (domainName: string) => {
        return deliverability.find(d => d.domain === domainName);
    };


    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <header className="flex justify-between items-center border-b border-black/5 pb-8">
                <div>
                    <h2 className="text-3xl font-serif italic tracking-tight">Domain Infrastructure</h2>
                    <p className="text-sm font-sans text-zinc-500 mt-1">Health, authentication, and dispatch capacity.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={fetchDomains}
                        className="p-3 border border-black/5 rounded-sm hover:bg-black/5 transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={handleAddDomain}
                        className="ink-button flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-widest px-6 py-3"
                    >
                        <Globe size={16} /> Add Domain
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                    <div className="col-span-full p-12 text-center text-zinc-400 italic">Auditing infrastructure...</div>
                ) : domains.length > 0 ? domains.map(domain => {
                    const intel = getDeliverabilityForDomain(domain.domain_name);
                    return (
                        <div key={domain.id} className="editorial-card group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 rounded-full bg-[var(--ivory)] border border-black/5">
                                    <ShieldCheck size={24} className="text-[var(--forest-green)]" />
                                </div>
                                <span className={`text-[10px] font-sans font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${domain.status === 'validated' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                    {domain.status}
                                </span>
                            </div>
                            <h3 className="text-2xl font-serif mb-2">{domain.domain_name}</h3>
                            <p className="text-xs font-sans text-zinc-500 mb-8 lowercase italic">Registered {new Date(domain.created_at).toLocaleDateString()}</p>

                            {/* Inbox Placement Probability */}
                            {intel && (
                                <div className="mb-6 p-4 bg-white/50 border border-black/5 rounded-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Inbox Placement</span>
                                        <span className={`text-lg font-serif font-bold ${intel.riskLevel === 'low' ? 'text-green-600' :
                                                intel.riskLevel === 'medium' ? 'text-amber-500' : 'text-red-500'
                                            }`}>{intel.inboxPlacementProbability}%</span>
                                    </div>
                                    <div className="h-2 bg-black/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-500 ${intel.riskLevel === 'low' ? 'bg-green-500' :
                                                    intel.riskLevel === 'medium' ? 'bg-amber-500' : 'bg-red-500'
                                                }`}
                                            style={{ width: `${intel.inboxPlacementProbability}%` }}
                                        />
                                    </div>
                                    {intel.recommendations[0] !== 'All systems nominal' && (
                                        <p className="text-[9px] font-sans text-zinc-500 mt-2 italic">
                                            {intel.recommendations[0]}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="space-y-3">
                                {[
                                    { label: 'SPF Record', status: domain.spf_record ? 'valid' : 'missing' },
                                    { label: 'DKIM Signature', status: domain.dkim_key ? 'valid' : 'missing' },
                                    { label: 'DMARC Policy', status: domain.dmarc_policy ? 'valid' : 'missing' }
                                ].map(check => (
                                    <div key={check.label} className="flex justify-between items-center py-2 border-t border-black/5">
                                        <span className="text-xs font-sans font-medium text-zinc-600">{check.label}</span>
                                        {check.status === 'valid' ? (
                                            <CheckCircle2 size={14} className="text-[var(--forest-green)]" />
                                        ) : (
                                            <AlertCircle size={14} className="text-[var(--rose-gold)]" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }) : (

                    <div className="col-span-full p-12 text-center text-zinc-400 italic border border-dashed border-black/10 rounded-sm">
                        No domains configured for dispatch.
                    </div>
                )}
            </div>
        </div>
    );
}
