'use client';

import React from 'react';
import { ShieldCheck, Users, Send, Workflow, ArrowRight, Sparkles } from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { AddDomainForm } from '@/components/domains/AddDomainForm';
import { AddContactForm } from '@/components/crm/AddContactForm';
import { CreateCampaignForm } from '@/components/campaigns/CreateCampaignForm';

interface OnboardingWelcomeProps {
    onDomainAdded: () => void;
    onContactAdded: () => void;
    onCampaignCreated: () => void;
}

export const OnboardingWelcome: React.FC<OnboardingWelcomeProps> = ({
    onDomainAdded,
    onContactAdded,
    onCampaignCreated
}) => {
    const { openModal } = useUI();

    const handleAddDomain = () => {
        openModal('Add Domain Infrastructure', <AddDomainForm onSuccess={onDomainAdded} />);
    };

    const handleAddContact = () => {
        openModal('Add New Contact', <AddContactForm onSuccess={onContactAdded} />);
    };

    const handleCreateCampaign = () => {
        openModal('Initialize New Campaign', <CreateCampaignForm onSuccess={onCampaignCreated} />);
    };

    return (
        <div className="space-y-8 mb-16">
            {/* Welcome Header */}
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <Sparkles size={24} className="text-[var(--rose-gold)]" />
                    <h2 className="text-3xl font-serif">Welcome to FounderOS</h2>
                </div>
                <p className="text-lg font-sans text-zinc-600 max-w-2xl">
                    Your all-in-one platform for managing domains, email campaigns, and customer relationships.
                </p>
            </div>

            {/* Getting Started Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Step 1: Add Domain */}
                <div
                    className="editorial-card space-y-4 hover:border-[var(--forest-green)] cursor-pointer transition-all group"
                    onClick={handleAddDomain}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--forest-green)]/10 flex items-center justify-center group-hover:bg-[var(--forest-green)]/20 transition-colors">
                            <ShieldCheck size={20} className="text-[var(--forest-green)]" />
                        </div>
                        <h3 className="text-lg font-serif">Add Domain</h3>
                    </div>
                    <p className="text-sm font-sans text-zinc-600">
                        Configure your email sending infrastructure with SPF & DMARC authentication.
                    </p>
                    <button className="text-xs font-sans font-bold uppercase tracking-widest text-[var(--forest-green)] flex items-center gap-2 mt-4 group-hover:gap-3 transition-all">
                        Get Started <ArrowRight size={14} />
                    </button>
                </div>

                {/* Step 2: Add Contacts */}
                <div
                    className="editorial-card space-y-4 hover:border-[var(--rose-gold)] cursor-pointer transition-all group"
                    onClick={handleAddContact}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--rose-gold)]/10 flex items-center justify-center group-hover:bg-[var(--rose-gold)]/20 transition-colors">
                            <Users size={20} className="text-[var(--rose-gold)]" />
                        </div>
                        <h3 className="text-lg font-serif">Add Contacts</h3>
                    </div>
                    <p className="text-sm font-sans text-zinc-600">
                        Import your audience and track their engagement with AI-powered scoring.
                    </p>
                    <button className="text-xs font-sans font-bold uppercase tracking-widest text-[var(--rose-gold)] flex items-center gap-2 mt-4 group-hover:gap-3 transition-all">
                        Get Started <ArrowRight size={14} />
                    </button>
                </div>

                {/* Step 3: Send Campaign */}
                <div
                    className="editorial-card space-y-4 hover:border-[var(--forest-green)] cursor-pointer transition-all group"
                    onClick={handleCreateCampaign}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--forest-green)]/10 flex items-center justify-center group-hover:bg-[var(--forest-green)]/20 transition-colors">
                            <Send size={20} className="text-[var(--forest-green)]" />
                        </div>
                        <h3 className="text-lg font-serif">Send Campaign</h3>
                    </div>
                    <p className="text-sm font-sans text-zinc-600">
                        Create and dispatch email campaigns with tracking and AI-powered insights.
                    </p>
                    <button className="text-xs font-sans font-bold uppercase tracking-widest text-[var(--forest-green)] flex items-center gap-2 mt-4 group-hover:gap-3 transition-all">
                        Get Started <ArrowRight size={14} />
                    </button>
                </div>
            </div>

            {/* Feature Highlights */}
            <div className="p-8 bg-gradient-to-br from-[var(--forest-green)]/5 to-[var(--rose-gold)]/5 border border-[var(--forest-green)]/10 rounded-sm space-y-4">
                <h3 className="text-lg font-serif">Built for founders</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-sans">
                    <div className="flex items-start gap-3">
                        <span className="text-[var(--forest-green)] font-bold">✓</span>
                        <span>Email deliverability monitoring & optimization</span>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="text-[var(--forest-green)] font-bold">✓</span>
                        <span>AI-powered customer intelligence & scoring</span>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="text-[var(--forest-green)] font-bold">✓</span>
                        <span>Campaign management with real-time analytics</span>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="text-[var(--forest-green)] font-bold">✓</span>
                        <span>Workflow automation for repetitive tasks</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
