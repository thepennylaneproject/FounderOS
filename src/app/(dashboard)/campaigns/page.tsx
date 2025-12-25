'use client';

import React, { useState, useEffect } from 'react';
import { Send, Plus, BarChart2, Mail, Users, Play, FileText, Edit2, Trash2 } from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { CreateCampaignForm } from '@/components/campaigns/CreateCampaignForm';
import { CampaignDetailModal } from '@/components/campaigns/CampaignDetailModal';
import { EditCampaignModal } from '@/components/campaigns/EditCampaignModal';

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);
    const { openModal, showToast } = useUI();

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

    const handleEditCampaign = (campaign: any) => {
        openModal(
            'Edit Campaign',
            <EditCampaignModal campaign={campaign} onSuccess={fetchCampaigns} />
        );
    };

    const handleDeleteCampaign = async () => {
        if (!deleteConfirm) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/campaigns/${deleteConfirm.id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete campaign');
            showToast('Campaign deleted successfully', 'success');
            setCampaigns(campaigns.filter(c => c.id !== deleteConfirm.id));
            setDeleteConfirm(null);
        } catch (error) {
            console.error(error);
            showToast('Failed to delete campaign', 'error');
        } finally {
            setDeleting(false);
        }
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
                            <div className="flex items-center gap-1">
                                <button
                                    className="p-2 text-zinc-400 hover:text-[var(--forest-green)] transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenCampaign(campaign);
                                    }}
                                    title={campaign.status === 'draft' ? 'Review & Send' : 'View Campaign'}
                                >
                                    {campaign.status === 'draft' ? <Play size={16} /> : <BarChart2 size={16} />}
                                </button>
                                <button
                                    className="p-2 text-zinc-400 hover:text-[var(--forest-green)] transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditCampaign(campaign);
                                    }}
                                    title="Edit campaign"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirm(campaign);
                                    }}
                                    title="Delete campaign"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="p-12 text-center border border-dashed border-black/10 rounded-sm">
                        <div className="w-12 h-12 bg-[var(--ivory)] border border-black/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText size={24} className="text-zinc-300" />
                        </div>
                        <h3 className="text-lg font-serif mb-2">No campaigns yet</h3>
                        <p className="text-sm font-sans text-zinc-400 mb-6 max-w-sm mx-auto">Create your first campaign to start reaching your audience</p>
                        <button
                            onClick={handleCreateCampaign}
                            className="ink-button text-xs font-sans font-bold uppercase tracking-widest px-6 py-2"
                        >
                            Create Campaign
                        </button>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-sm shadow-lg max-w-sm animate-in fade-in scale-in duration-200">
                        <h3 className="text-xl font-serif mb-3">Delete campaign?</h3>
                        <p className="text-sm font-sans text-zinc-600 mb-2">
                            Are you sure you want to delete <span className="font-bold">{deleteConfirm.name}</span>?
                        </p>
                        <p className="text-xs font-sans text-zinc-500 mb-6">
                            This action cannot be undone. All email logs for this campaign will also be deleted.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleDeleteCampaign}
                                disabled={deleting}
                                className="flex-1 bg-red-600 text-white px-4 py-2 text-xs font-sans font-bold uppercase tracking-widest hover:bg-red-700 disabled:opacity-50 transition-colors rounded-sm"
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                disabled={deleting}
                                className="flex-1 border border-black/5 px-4 py-2 text-xs font-sans font-bold uppercase tracking-widest hover:bg-black/5 disabled:opacity-50 transition-colors rounded-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
