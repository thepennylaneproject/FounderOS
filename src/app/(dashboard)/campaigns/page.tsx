'use client';

import React, { useState, useEffect } from 'react';
import { Send, Plus, BarChart2, Mail, Users, Calendar, Play } from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { CreateCampaignForm } from '@/components/campaigns/CreateCampaignForm';
import { CampaignDetailModal } from '@/components/campaigns/CampaignDetailModal';

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { openModal } = useUI();

    const fetchCampaigns = () => {
        setLoading(true);
        fetch('/api/campaigns')
            .then(res => res.json())
            .then(data => {
                setCampaigns(data);
                setLoading(false);
            })
            .catch(err => console.error(err));
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const handleCreateCampaign = () => {
        openModal(
            'Create Campaign',
            <CreateCampaignForm onSuccess={fetchCampaigns} />
        );
    };

    const handleOpenCampaign = (campaign: any) => {
        openModal(
            'Review & Send Campaign',
            <CampaignDetailModal campaign={campaign} onSuccess={fetchCampaigns} />
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <header className="flex justify-between items-center border-b border-black/5 pb-8">
                <div>
                    <h2 className="text-3xl font-serif italic tracking-tight">Marketing Campaigns</h2>
                    <p className="text-sm font-sans text-zinc-500 mt-1">Design, execute, and analyze your outreach.</p>
                </div>
                <button
                    onClick={handleCreateCampaign}
                    className="ink-button flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-widest px-6 py-3"
                >
                    <Plus size={16} /> New Campaign
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                    { label: 'Active', value: campaigns.length, icon: Send },
                    { label: 'Open Rate', value: '—', icon: Mail },
                    { label: 'Conversions', value: '0', icon: Users },
                    { label: 'Velocity', value: 'Stable', icon: BarChart2 }
                ].map((stat) => (
                    <div key={stat.label} className="editorial-card group hover:border-[var(--forest-green)] transition-all">
                        <div className="flex justify-between items-center mb-2">
                            <stat.icon size={16} className="text-[var(--forest-green)]" />
                            <span className="text-[10px] font-sans font-bold tracking-widest uppercase text-zinc-400 group-hover:text-[var(--ink)] transition-colors">{stat.label}</span>
                        </div>
                        <p className="text-2xl font-serif">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4">
                <h3 className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2">active & scheduled</h3>
                {loading ? (
                    <div className="p-12 text-center text-zinc-400 italic">Reading campaign journals...</div>
                ) : campaigns.length > 0 ? campaigns.map(campaign => (
                    <div
                        key={campaign.id}
                        onClick={() => handleOpenCampaign(campaign)}
                        className="editorial-card flex items-center gap-6 group hover:translate-x-1 transition-transform cursor-pointer"
                    >
                        <div className="w-12 h-12 rounded-sm bg-[var(--ivory)] border border-black/5 flex items-center justify-center">
                            <Mail size={20} className="text-zinc-400 group-hover:text-[var(--rose-gold)] transition-colors" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-lg font-serif">{campaign.name}</h4>
                            <p className="text-xs font-sans text-zinc-500 lowercase">{campaign.type} — {campaign.status}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right px-8 border-x border-black/5">
                                <p className="text-xs font-sans font-bold uppercase tracking-widest text-zinc-400 mb-1">Status</p>
                                <p className={`text-sm font-sans font-medium ${campaign.status === 'completed' ? 'text-zinc-500' : campaign.status === 'active' ? 'text-[var(--forest-green)]' : 'text-amber-600'}`}>
                                    {campaign.status}
                                </p>
                            </div>
                            <button
                                className="ink-button-ghost p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenCampaign(campaign);
                                }}
                                title={campaign.status === 'draft' ? 'Review & Send' : 'View Campaign'}
                            >
                                {campaign.status === 'draft' ? <Play size={16} /> : <BarChart2 size={16} />}
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="p-12 text-center text-zinc-400 italic border border-dashed border-black/10 rounded-sm">
                        No campaigns yet. Create one to get started.
                    </div>
                )}
            </div>
        </div>
    );
}
