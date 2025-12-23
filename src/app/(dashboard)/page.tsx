'use client';

import React, { useState, useEffect } from 'react';
import {
    ShieldCheck,
    Send,
    Workflow,
    Users,
    Zap,
    ChevronRight,
    TrendingUp,
    Mail,
    MoreVertical,
    AlertCircle
} from 'lucide-react';

import { useUI } from '@/context/UIContext';
import { BriefPanel } from '@/components/intelligence/BriefPanel';
import { OnboardingWelcome } from '@/components/dashboard/OnboardingWelcome';
import { CampaignDetailModal } from '@/components/campaigns/CampaignDetailModal';


const StatCard: React.FC<{ label: string, value: string | number, trend: string, icon: any }> = ({ label, value, trend, icon: Icon }) => (
    <div className="editorial-card group">
        <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-full bg-[var(--ivory)] border border-black/5 group-hover:border-[var(--rose-gold)] transition-colors">
                <Icon size={20} className="text-[var(--forest-green)]" />
            </div>
            <span className="text-[10px] font-sans font-bold tracking-widest uppercase text-zinc-400 flex items-center gap-1">
                <TrendingUp size={12} /> {trend}
            </span>
        </div>
        <h3 className="text-3xl font-serif mb-1">{value}</h3>
        <p className="text-sm font-sans text-zinc-500 tracking-tight">{label}</p>
    </div>
);

export default function OverviewPage() {
    const { showToast, openModal } = useUI();
    const [stats, setStats] = useState({
        domains: 0,
        contacts: 0,
        avgHealth: 0,
        activeWorkflows: 0
    });
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [domainsRes, contactsRes, campaignsRes, workflowsRes] = await Promise.all([
                fetch('/api/domains'),
                fetch('/api/contacts'),
                fetch('/api/campaigns'),
                fetch('/api/workflows')
            ]);

            const domains = await domainsRes.json();
            const contacts = await contactsRes.json();
            const campaigns = await campaignsRes.json();
            const workflows = await workflowsRes.json();

            const avgHealth = Math.round(contacts.length > 0
                ? contacts.reduce((acc: number, c: any) => acc + (c.health_score || 0), 0) / contacts.length
                : 100);

            setStats({
                domains: domains.length,
                contacts: contacts.length,
                avgHealth,
                activeWorkflows: workflows.filter((w: any) => w.status === 'active').length
            });

            setCampaigns(campaigns.slice(0, 5));
            setWorkflows(workflows.slice(0, 3));
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCampaign = (campaign: any) => {
        openModal(
            'Review & Send Campaign',
            <CampaignDetailModal campaign={campaign} onSuccess={fetchData} />
        );
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Show onboarding for new users
    if (stats.domains === 0 && stats.contacts === 0) {
        return (
            <OnboardingWelcome
                onDomainAdded={fetchData}
                onContactAdded={fetchData}
                onCampaignCreated={fetchData}
            />
        );
    }

    return (
        <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Strategic Brief - Proactive AI Intelligence */}
            <BriefPanel />

            {/* Essential Stats */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-x-12">
                <StatCard label="Active Domains" value={stats.domains.toString().padStart(2, '0')} trend="+0" icon={ShieldCheck} />
                <StatCard label="Total Contacts" value={stats.contacts} trend="+12%" icon={Users} />
                <StatCard label="Active Workflows" value={stats.activeWorkflows} trend="Standard" icon={Workflow} />
                <StatCard label="Customer Health" value={`${stats.avgHealth}%`} trend="Optimal" icon={Zap} />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                {/* Recent Campaigns */}
                <div className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-6 pb-2 border-b-2 border-[var(--ink)]">
                        <h3 className="text-xl font-serif lowercase tracking-tighter">recent campaigns</h3>
                        <span className="text-[10px] font-sans font-bold tracking-widest uppercase text-zinc-400 cursor-pointer hover:text-[var(--ink)] transition-colors">view all</span>
                    </div>

                    <div className="space-y-0 italic font-serif">
                        {campaigns.length > 0 ? campaigns.map((c, i) => (
                            <div key={c.id} className="group flex items-center gap-8 py-6 border-b border-black/5 hover:bg-black/[0.02] transition-colors cursor-pointer px-4 -mx-4" onClick={() => handleOpenCampaign(c)}>
                                <span className="text-xs font-sans not-italic font-bold text-zinc-300">{(i + 1).toString().padStart(2, '0')}</span>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-lg leading-tight group-hover:translate-x-1 transition-transform">{c.name}</h4>
                                    <p className="text-sm font-sans not-italic text-zinc-500 mt-1">{c.type} — {c.status}</p>
                                </div>
                                {c.status === 'draft' ? (
                                    <button className="px-3 py-1 text-xs font-sans font-bold uppercase tracking-widest text-white bg-amber-600 hover:bg-amber-700 transition-colors rounded" onClick={(e) => { e.stopPropagation(); handleOpenCampaign(c); }}>Send</button>
                                ) : (
                                    <Mail size={16} className="text-zinc-200 group-hover:text-[var(--rose-gold)] transition-colors" />
                                )}
                            </div>
                        )) : (
                            <div className="text-center py-12">
                                <p className="text-sm font-sans text-zinc-400 italic">No campaigns yet</p>
                                <p className="text-xs font-sans text-zinc-400 mt-2">Create your first campaign to get started</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions / Status */}
                <div className="space-y-12">
                    <div className="p-8 bg-[var(--forest-green)] text-[var(--ivory)] rounded-sm relative overflow-hidden group">
                        <div className="relative z-10">
                            <h3 className="text-2xl font-serif mb-4 leading-tight">Your Weekly Report <br />is ready for review.</h3>
                            <p className="text-xs font-sans opacity-70 mb-8 leading-relaxed">We've identified {stats.domains} active domains and {stats.contacts} total contacts.</p>
                            <button
                                onClick={() => {
                                    fetch('/api/contacts/score', { method: 'POST' });
                                    showToast('AI Intelligence report generation queued', 'success');
                                }}
                                className="bg-[var(--ivory)] text-[var(--forest-green)] px-4 py-2 text-xs font-sans font-bold uppercase tracking-widest hover:bg-[var(--rose-gold-muted)] transition-colors"
                            >
                                Read Analysis
                            </button>
                        </div>
                        <TrendingUp className="absolute -bottom-8 -right-8 w-48 h-48 opacity-10 group-hover:scale-110 transition-transform duration-700" />
                    </div>

                    <div className="editorial-card">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-serif italic text-lg lowercase">active automations</h3>
                            <MoreVertical size={16} className="text-zinc-400 cursor-pointer" />
                        </div>
                        <div className="space-y-4">
                            {workflows.length > 0 ? workflows.map(w => (
                                <div key={w.id} className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${w.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-zinc-300'}`} />
                                    <p className="text-sm font-sans font-medium text-zinc-600 truncate flex-1">{w.name}</p>
                                </div>
                            )) : (
                                <p className="text-xs font-sans text-zinc-400 italic text-center py-4">No workflows yet</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}