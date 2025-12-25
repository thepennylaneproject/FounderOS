'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    ShieldCheck,
    Send,
    Inbox,
    Workflow,
    Users,
    Zap,
    ChevronRight,
} from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { useUser } from '@/context/UserContext';
import { AddContactForm } from '@/components/crm/AddContactForm';
import { AddDomainForm } from '@/components/domains/AddDomainForm';
import { CreateCampaignForm } from '@/components/campaigns/CreateCampaignForm';

const SidebarItem: React.FC<{ icon: any, label: string, href: string, active?: boolean }> = ({ icon: Icon, label, href, active }) => (
    <Link href={href}>
        <div className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group ${active ? 'text-[var(--forest-green)]' : 'text-zinc-500 hover:text-[var(--ink)]'}`}>
            <Icon size={18} strokeWidth={active ? 2.5 : 2} />
            <span className={`text-sm font-sans tracking-wide ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--forest-green)]" />}
        </div>
    </Link>
);

export const DashboardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const pathname = usePathname();
    const { openModal } = useUI();
    const { user } = useUser();

    const getPageTitle = () => {
        switch (pathname) {
            case '/': return 'Founder Intelligence';
            case '/domains': return 'Email Domains';
            case '/campaigns': return 'Campaigns';
            case '/crm': return 'Customer CRM';
            case '/workflows': return 'Workflows';
            case '/inbox': return 'Unified Inbox';
            default: return 'FounderOS';
        }
    };

    const handleQuickLaunch = () => {
        openModal(
            'Quick Actions',
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={() => openModal('Add Email Domain', <AddDomainForm onSuccess={() => { }} />)}
                    className="flex items-center gap-4 p-6 border border-black/5 hover:border-[var(--forest-green)] hover:bg-black/[0.01] transition-all text-left"
                >
                    <div className="p-3 bg-[var(--ivory)] rounded-sm border border-black/5 text-[var(--forest-green)]"><ShieldCheck size={20} /></div>
                    <div><p className="text-sm font-sans font-bold uppercase tracking-widest leading-none mb-1">Email Domain</p><p className="text-[10px] text-zinc-400">Add New Domain</p></div>
                </button>
                <button
                    onClick={() => openModal('Add New Contact', <AddContactForm onSuccess={() => { }} />)}
                    className="flex items-center gap-4 p-6 border border-black/5 hover:border-[var(--rose-gold)] hover:bg-black/[0.01] transition-all text-left"
                >
                    <div className="p-3 bg-[var(--ivory)] rounded-sm border border-black/5 text-[var(--rose-gold)]"><Users size={20} /></div>
                    <div><p className="text-sm font-sans font-bold uppercase tracking-widest leading-none mb-1">CRM Growth</p><p className="text-[10px] text-zinc-400">Add New Lead</p></div>
                </button>
                <button
                    onClick={() => openModal('Create Campaign', <CreateCampaignForm onSuccess={() => { }} />)}
                    className="flex items-center gap-4 p-6 border border-black/5 hover:bg-[var(--forest-green)] hover:text-[var(--ivory)] transition-all group text-left"
                >
                    <div className="p-3 bg-[var(--ivory)] rounded-sm border border-black/5 text-[var(--ink)] group-hover:text-[var(--forest-green)]"><Send size={20} /></div>
                    <div><p className="text-sm font-sans font-bold uppercase tracking-widest leading-none mb-1 text-[var(--ink)] group-hover:text-[var(--ivory)]">Campaigns</p><p className="text-[10px] text-zinc-400 group-hover:text-white/60">Create New</p></div>
                </button>
            </div>
        );
    };

    return (
        <div className="flex min-h-screen bg-[var(--ivory)] font-sans antialiased text-[var(--ink)]">
            <aside className="w-64 border-r border-black/5 bg-white/50 backdrop-blur-sm flex flex-col pt-12 sticky top-0 h-screen z-20">
                <div className="px-8 mb-12">
                    <Link href="/">
                        <h1 className="text-2xl font-serif italic tracking-tighter flex items-center gap-2">
                            Founder<span className="text-[var(--rose-gold)]">OS</span>
                        </h1>
                    </Link>
                    <p className="text-[10px] font-sans font-bold tracking-[0.2em] uppercase text-zinc-400 mt-1">Command Center</p>
                </div>

                <nav className="flex-1 space-y-1">
                    <SidebarItem icon={Zap} label="Overview" href="/" active={pathname === '/'} />
                    <SidebarItem icon={ShieldCheck} label="Email Domains" href="/domains" active={pathname === '/domains'} />
                    <SidebarItem icon={Send} label="Campaigns" href="/campaigns" active={pathname === '/campaigns'} />
                    <SidebarItem icon={Inbox} label="Unified Inbox" href="/inbox" active={pathname === '/inbox'} />
                    <SidebarItem icon={Workflow} label="Workflows" href="/workflows" active={pathname === '/workflows'} />
                    <SidebarItem icon={Users} label="CRM" href="/crm" active={pathname === '/crm'} />
                </nav>

                <div className="mt-auto p-6 border-t border-black/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--rose-gold-muted)] border border-[var(--rose-gold)] flex items-center justify-center text-xs font-serif font-bold">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{user.name}</p>
                            <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 min-h-screen flex flex-col">
                <header className="px-12 pt-12 flex justify-between items-end mb-8 sticky top-0 bg-[var(--ivory)]/80 backdrop-blur-md z-10 pb-4 border-b border-transparent">
                    <h2 className="text-4xl font-serif tracking-tight">{getPageTitle()}</h2>
                    <button
                        onClick={handleQuickLaunch}
                        className="ink-button flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-widest hover:gap-3 transition-all px-6 py-3"
                    >
                        Quick Launch <ChevronRight size={14} />
                    </button>
                </header>

                <main className="flex-1 px-12 pb-24 max-w-7xl mx-auto w-full">
                    {children}
                </main>
            </div>
        </div>
    );
};
