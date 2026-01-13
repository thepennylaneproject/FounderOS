'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    ShieldCheck,
    Send,
    Inbox,
    Workflow,
    Settings,
    Users,
    Zap,
    ChevronRight,
    Plus,
} from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { AddContactForm } from '@/components/crm/AddContactForm';
import { AddDomainForm } from '@/components/domains/AddDomainForm';
import { CreateCampaignForm } from '@/components/campaigns/CreateCampaignForm';
import { GuidedTour } from '@/components/onboarding/GuidedTour';
import { CommandPalette, useCommandPalette } from '@/components/ui/CommandPalette';
import '@/styles/tour.css';

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
    const commandPalette = useCommandPalette();

    const handleCommandAction = (actionId: string) => {
        switch (actionId) {
            case 'new-contact':
                openModal('Add New Contact', <AddContactForm onSuccess={() => {}} />);
                break;
            case 'new-campaign':
                openModal('Initialize New Campaign', <CreateCampaignForm onSuccess={() => {}} />);
                break;
            case 'new-domain':
                openModal('Add Domain Infrastructure', <AddDomainForm onSuccess={() => {}} />);
                break;
        }
    };

    const getPageTitle = () => {
        switch (pathname) {
            case '/': return 'Founder Intelligence';
            case '/domains': return 'Domain Infrastructure';
            case '/campaigns': return 'Marketing Hub';
            case '/crm': return 'Customer CRM';
            case '/automations': return 'Automation Rules';
            case '/inbox': return 'Unified Inbox';
            case '/inbox/receipts': return 'Receipts';
            default: return 'FounderOS';
        }
    };

    const handleQuickLaunch = () => {
        openModal(
            'Quick Launch Dispatch',
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={() => openModal('Add Domain Infrastructure', <AddDomainForm onSuccess={() => { }} />)}
                    className="flex items-center gap-4 p-6 border border-black/5 hover:border-[var(--forest-green)] hover:bg-black/[0.01] transition-all text-left"
                >
                    <div className="p-3 bg-[var(--ivory)] rounded-sm border border-black/5 text-[var(--forest-green)]"><ShieldCheck size={20} /></div>
                    <div><p className="text-sm font-sans font-bold uppercase tracking-widest leading-none mb-1">Infrastructure</p><p className="text-[10px] text-zinc-400">Add New Domain</p></div>
                </button>
                <button
                    onClick={() => openModal('Add New Contact', <AddContactForm onSuccess={() => { }} />)}
                    className="flex items-center gap-4 p-6 border border-black/5 hover:border-[var(--rose-gold)] hover:bg-black/[0.01] transition-all text-left"
                >
                    <div className="p-3 bg-[var(--ivory)] rounded-sm border border-black/5 text-[var(--rose-gold)]"><Users size={20} /></div>
                    <div><p className="text-sm font-sans font-bold uppercase tracking-widest leading-none mb-1">CRM Growth</p><p className="text-[10px] text-zinc-400">Add New Lead</p></div>
                </button>
                <button
                    onClick={() => openModal('Initialize New Campaign', <CreateCampaignForm onSuccess={() => { }} />)}
                    className="flex items-center gap-4 p-6 border border-black/5 hover:bg-[var(--forest-green)] hover:text-[var(--ivory)] transition-all group text-left"
                >
                    <div className="p-3 bg-[var(--ivory)] rounded-sm border border-black/5 text-[var(--ink)] group-hover:text-[var(--forest-green)]"><Send size={20} /></div>
                    <div><p className="text-sm font-sans font-bold uppercase tracking-widest leading-none mb-1 text-[var(--ink)] group-hover:text-[var(--ivory)]">Dispatch</p><p className="text-[10px] text-zinc-400 group-hover:text-white/60">New Campaign</p></div>
                </button>
            </div>
        );
    };

    return (
        <div className="flex min-h-screen bg-[var(--ivory)] font-sans antialiased text-[var(--ink)]">
            <aside data-tour="sidebar" className="w-64 border-r border-black/5 bg-white/50 backdrop-blur-sm flex flex-col pt-12 sticky top-0 h-screen z-20">
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
                    <div data-tour="domains-link"><SidebarItem icon={ShieldCheck} label="Domain Health" href="/domains" active={pathname === '/domains'} /></div>
                    <div data-tour="campaigns-link"><SidebarItem icon={Send} label="Campaigns" href="/campaigns" active={pathname === '/campaigns'} /></div>
                    <SidebarItem icon={Inbox} label="Unified Inbox" href="/inbox" active={pathname === '/inbox'} />
                    <SidebarItem icon={Workflow} label="Automations" href="/automations" active={pathname === '/automations'} />
                    <div data-tour="crm-link"><SidebarItem icon={Users} label="CRM" href="/crm" active={pathname === '/crm'} /></div>
                </nav>

                <div className="mt-auto p-6 border-t border-black/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--rose-gold-muted)] border border-[var(--rose-gold)]" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">Admin User</p>
                            <p className="text-[10px] text-zinc-500 truncate">admin@founderos.local</p>
                        </div>
                        <Settings size={14} className="text-zinc-400 cursor-pointer hover:text-[var(--ink)]" />
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 min-h-screen flex flex-col">
                <header data-tour="dashboard-header" className="px-12 pt-12 flex justify-between items-end mb-8 sticky top-0 bg-[var(--ivory)]/80 backdrop-blur-md z-10 pb-4 border-b border-transparent">
                    <div>
                        <h2 className="text-4xl font-serif mb-1 tracking-tight">{getPageTitle()}</h2>
                        <p className="text-xs font-sans text-zinc-500 tracking-tight">System Status: <span className="text-[var(--forest-green)] font-medium underline underline-offset-4 decoration-black/5">Fully Operational</span></p>
                    </div>
                    <button
                        data-tour="quick-launch"
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
            <GuidedTour />
            <CommandPalette
                isOpen={commandPalette.isOpen}
                onClose={commandPalette.close}
                onAction={handleCommandAction}
            />
        </div>
    );
};

