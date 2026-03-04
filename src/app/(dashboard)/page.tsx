'use client';

import React, { useState, useEffect } from 'react';
import {
    ShieldCheck,
    Send,
    Workflow,
    Users,
    Mail,
} from 'lucide-react';

import Link from 'next/link';

/**
 * Stat: Typeset list format (no decorative card borders)
 * Just the essential information with ruled separator
 */
const Stat: React.FC<{ label: string, value: string | number }> = ({ label, value }) => (
    <div className="border-t" style={{ borderColor: 'var(--border-content)', paddingTop: 'var(--space-md)' }}>
        <p className="type-micro text-zinc-400">{label}</p>
        <p className="type-headline mt-2">{value}</p>
    </div>
);

export default function OverviewPage() {
    const [stats, setStats] = useState({
        domains: 0,
        contacts: 0,
        avgHealth: 0,
        activeWorkflows: 0
    });
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [brief, setBrief] = useState({
        now_count: 0,
        waiting_count: 0,
        needs_reply_count: 0,
        needs_review_count: 0,
        new_receipts_count: 0,
        month_total: 0,
        risk_count: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [domainsRes, contactsRes, campaignsRes, workflowsRes, briefRes] = await Promise.all([
                    fetch('/api/domains'),
                    fetch('/api/contacts'),
                    fetch('/api/campaigns'),
                    fetch('/api/workflows'),
                    fetch('/api/inbox/brief')
                ]);

                const domains = await domainsRes.json();
                const contacts = await contactsRes.json();
                const campaigns = await campaignsRes.json();
                const workflows = await workflowsRes.json();
                const briefData = await briefRes.json();

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
                setBrief(briefData);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const briefingSentence = () => {
        if (brief.risk_count > 0) {
            return `${brief.risk_count} high-risk item${brief.risk_count === 1 ? '' : 's'} need attention. ${brief.now_count} priority, ${brief.waiting_count} pending.`;
        }
        if (brief.now_count === 0 && brief.waiting_count === 0 && brief.needs_reply_count === 0) {
            return `Inbox clear. ${brief.needs_review_count} item${brief.needs_review_count === 1 ? '' : 's'} for review.`;
        }
        return `${brief.now_count} priority, ${brief.waiting_count} pending, ${brief.needs_reply_count} need repl${brief.needs_reply_count === 1 ? 'y' : 'ies'}.`;
    };

    return (
        <div style={{ marginTop: 'var(--space-xl)' }}>
            {/* Daily Briefing - ruled separators, no card borders */}
            <section className="grid grid-cols-1 md:grid-cols-5 gap-xl mb-2xl">
                {[
                    { label: 'Priority', value: brief.now_count, href: '/inbox?lane=now' },
                    { label: 'Pending', value: brief.waiting_count, href: '/inbox?lane=waiting' },
                    { label: 'Needs Reply', value: brief.needs_reply_count, href: '/inbox?category=needs_reply' },
                    { label: 'Receipts', value: brief.new_receipts_count, href: '/inbox/receipts' },
                    { label: 'Risk', value: brief.risk_count, href: '/inbox?risk=high' }
                ].map((item) => (
                    <Link 
                        key={item.label} 
                        href={item.href} 
                        className="border-t hover:border-t-2 transition-all"
                        style={{
                            borderColor: 'var(--border-content)',
                            paddingTop: 'var(--space-md)'
                        }}
                    >
                        <p className="type-micro text-zinc-400">{item.label}</p>
                        <p className="type-headline mt-2">{item.value}</p>
                    </Link>
                ))}
            </section>

            {/* Essential Stats - typeset list format */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-xl mb-2xl">
                <Stat label="Active Domains" value={stats.domains.toString().padStart(2, '0')} />
                <Stat label="Total Contacts" value={stats.contacts} />
                <Stat label="Active Workflows" value={stats.activeWorkflows} />
                <Stat label="Engagement Health" value={`${stats.avgHealth}%`} />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2xl">
                {/* Recent Campaigns - already editorial, preserve */}
                <div className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-lg pb-md" style={{ borderBottom: 'var(--border-emphasis)' }}>
                        <h3 className="type-subhead lowercase">recent campaigns</h3>
                        <Link href="/campaigns" className="action-quiet">
                            view all
                        </Link>
                    </div>

                    <div className="space-y-0 italic font-serif">
                        {campaigns.length > 0 ? campaigns.map((c, i) => (
                            <div key={c.id} className="group flex items-center gap-8 border-b border-black/5 hover:bg-black/[0.01] transition-colors cursor-pointer" style={{ padding: 'var(--space-lg) var(--space-md)' }}>
                                <span className="type-micro text-zinc-300 not-italic">{(i + 1).toString().padStart(2, '0')}</span>
                                <div className="flex-1 min-w-0">
                                    <h4 className="type-subhead leading-tight group-hover:translate-x-1 transition-transform">{c.name}</h4>
                                    <p className="type-label not-italic text-zinc-500 mt-1">{c.type} — {c.status}</p>
                                </div>
                                <Mail size={16} className="text-zinc-200 group-hover:text-[var(--rose-gold)] transition-colors" />
                            </div>
                        )) : (
                            <p className="type-body text-zinc-400 text-center" style={{ padding: 'var(--space-xl) 0' }}>No recent campaigns to display.</p>
                        )}
                    </div>
                </div>

                {/* Quick Actions / Status */}
                <div className="space-y-xl">
                    {/* Inbox Brief - ruled box with emphasis border instead of filled background */}
                    <div 
                        className="border-2 border-[var(--ink)]"
                        style={{ padding: 'var(--space-lg)' }}
                    >
                        <h3 className="type-subhead mb-md">Inbox Brief</h3>
                        <p className="type-body text-zinc-600 mb-lg">
                            {briefingSentence()}
                        </p>
                        <Link
                            href="/inbox"
                            className="action-emphasized block text-center"
                        >
                            Open Inbox
                        </Link>
                    </div>

                    {/* Active Automations - whitespace, no card treatment */}
                    <div className="border-t" style={{ borderColor: 'var(--border-content)', paddingTop: 'var(--space-lg)' }}>
                        <h3 className="type-subhead lowercase mb-md">active automations</h3>
                        <div className="space-y-sm">
                            {workflows.length > 0 ? workflows.map(w => (
                                <div key={w.id} className="flex items-center gap-sm">
                                    <div className={`w-2 h-2 rounded-full ${w.status === 'active' ? 'bg-green-500' : 'bg-zinc-300'}`} />
                                    <p className="type-label text-zinc-600 truncate flex-1">{w.name}</p>
                                </div>
                            )) : (
                                <p className="type-label text-zinc-400 italic">No active automations.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
