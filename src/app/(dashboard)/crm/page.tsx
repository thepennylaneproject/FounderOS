'use client';

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Heart, Sparkles, Flame, Target, HelpCircle, RefreshCw, TrendingUp, X } from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { Tooltip } from '@/components/ui/Tooltip';
import { AddContactForm } from '@/components/crm/AddContactForm';
import { AIDraftModal } from '@/components/crm/AIDraftModal';

interface ContactWithMomentum {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    company_name: string | null;
    stage: string;
    health_score: number;
    momentum_score?: number;
    is_hot_lead?: boolean;
    closer_signal?: string | null;
}

export default function CRMPage() {
    const [contacts, setContacts] = useState<ContactWithMomentum[]>([]);
    const [loading, setLoading] = useState(true);
    const [showMomentumExplainer, setShowMomentumExplainer] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const { openModal, showToast } = useUI();

    // Show momentum explainer on first CRM visit
    useEffect(() => {
        const hasSeenMomentumExplainer = localStorage.getItem('hasSeenMomentumExplainer');
        if (!hasSeenMomentumExplainer) {
            setShowMomentumExplainer(true);
            localStorage.setItem('hasSeenMomentumExplainer', 'true');
        }
    }, []);

    const fetchContacts = async () => {
        setFetchError(null);
        setLoading(true);
        try {
            const [contactsRes, momentumRes] = await Promise.all([
                fetch('/api/contacts'),
                fetch('/api/intelligence/momentum')
            ]);

            const contactsData = await contactsRes.json();
            const momentumData = await momentumRes.json();

            // Merge momentum data into contacts
            const enriched = contactsData.map((c: ContactWithMomentum) => {
                const momentum = momentumData.find((m: any) => m.email === c.email);
                return {
                    ...c,
                    momentum_score: momentum?.momentumScore || 0,
                    is_hot_lead: momentum?.isHotLead || false,
                    closer_signal: momentum?.closerSignal || null
                };
            });

            // Sort by momentum score descending
            enriched.sort((a: ContactWithMomentum, b: ContactWithMomentum) =>
                (b.momentum_score || 0) - (a.momentum_score || 0)
            );

            setContacts(enriched);
        } catch (err) {
            console.error(err);
            setFetchError('We couldn’t load your contacts or intelligence scores. Please retry.');
            showToast('CRM data failed to load', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, []);


    const handleAddContact = () => {
        openModal(
            'Add New Contact',
            <AddContactForm onSuccess={fetchContacts} />
        );
    };

    const handleAIDraft = (contact: any) => {
        openModal(
            'Intelligence Email Draft',
            <AIDraftModal contact={contact} />
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Momentum Explainer Modal */}
            {showMomentumExplainer && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-sm border border-black/5 shadow-lg max-w-md w-full p-8 space-y-6 animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-[var(--forest-green)]/10 rounded-sm">
                                    <TrendingUp size={20} className="text-[var(--forest-green)]" />
                                </div>
                                <h3 className="text-lg font-serif">What is Momentum?</h3>
                            </div>
                            <button
                                onClick={() => setShowMomentumExplainer(false)}
                                className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm font-sans text-zinc-600">
                                <strong>Momentum</strong> measures your contact's recent engagement velocity—how actively they're opening and clicking your emails.
                            </p>

                            <div className="p-4 bg-[var(--forest-green)]/5 border border-[var(--forest-green)]/10 rounded-sm space-y-3">
                                <div className="flex items-start gap-2">
                                    <Flame size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-sans font-bold text-zinc-700">Score 5+</p>
                                        <p className="text-xs font-sans text-zinc-600">Hot lead—high recent engagement</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Sparkles size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-sans font-bold text-zinc-700">Score 2-4</p>
                                        <p className="text-xs font-sans text-zinc-600">Growing interest</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Heart size={16} className="text-zinc-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-sans font-bold text-zinc-700">Score 0-1</p>
                                        <p className="text-xs font-sans text-zinc-600">Not engaged recently</p>
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs font-sans text-zinc-500 italic">
                                When a hot lead appears, click <strong>Draft</strong> to generate an AI email tailored to their engagement pattern.
                            </p>
                        </div>

                        <button
                            onClick={() => setShowMomentumExplainer(false)}
                            className="w-full ink-button text-xs font-sans font-bold uppercase tracking-widest py-3"
                        >
                            Got It
                        </button>
                    </div>
                </div>
            )}

            <header className="flex justify-between items-center border-b border-black/5 pb-8">
                <div>
                    <h2 className="text-3xl font-serif italic tracking-tight">Customer Relationship Engine</h2>
                    <p className="text-sm font-sans text-zinc-500 mt-1">Manage leads, track engagement, and score health.</p>
                </div>
                <button
                    onClick={handleAddContact}
                    className="ink-button flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-widest px-6 py-3"
                >
                    <UserPlus size={16} /> Add Contact
                </button>
            </header>

            {fetchError && (
                <div className="editorial-card max-w-4xl">
                    <p className="text-sm font-sans text-amber-700 mb-4">{fetchError}</p>
                    <button
                        onClick={fetchContacts}
                        className="ink-button text-xs font-sans font-bold uppercase tracking-widest px-6 py-2"
                    >
                        Retry loading
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="editorial-card">
                    <h3 className="text-sm font-sans font-bold uppercase tracking-widest text-zinc-400 mb-4">Total Reach</h3>
                    <p className="text-4xl font-serif">{contacts.length}</p>
                </div>
                <div className="editorial-card">
                    <h3 className="text-sm font-sans font-bold uppercase tracking-widest text-zinc-400 mb-4">Avg. Engagement</h3>
                    <p className="text-4xl font-serif">
                        {contacts.length > 0
                            ? Math.round(contacts.reduce((acc, c) => acc + (c.health_score || 0), 0) / contacts.length)
                            : 0}%
                    </p>
                </div>
                <div className="editorial-card">
                    <h3 className="text-sm font-sans font-bold uppercase tracking-widest text-zinc-400 mb-4">Hot Leads</h3>
                    <p className="text-4xl font-serif">{contacts.filter(c => c.is_hot_lead).length}</p>
                </div>
            </div>

            {loading ? (
                <div className="p-12 text-center text-zinc-400 italic">Preparing your contacts...</div>
            ) : contacts.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-black/10 rounded-sm">
                    <div className="w-12 h-12 bg-[var(--ivory)] border border-black/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users size={24} className="text-zinc-300" />
                    </div>
                    <h3 className="text-lg font-serif mb-2">No contacts yet</h3>
                    <p className="text-sm font-sans text-zinc-400 mb-6 max-w-sm mx-auto">Add your first contact to start tracking engagement and momentum scores</p>
                    <button
                        onClick={handleAddContact}
                        className="ink-button text-xs font-sans font-bold uppercase tracking-widest px-6 py-2"
                    >
                        Add Contact
                    </button>
                </div>
            ) : (
                <div className="bg-white/40 backdrop-blur-sm border border-black/5 rounded-sm overflow-hidden">
                    <div className="p-4 border-b border-black/5 bg-white/20">
                        <p className="text-xs font-sans text-zinc-500 italic">Showing all active contacts. Advanced search and filtering coming soon.</p>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-black/5">
                                <th className="p-6 text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Contact</th>
                                <th className="p-6 text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Company</th>
                                <th className="p-6 text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Stage</th>
                                <th className="p-6 text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">
                                    <Tooltip text="Engagement velocity based on recent opens & clicks">
                                        <span className="flex items-center gap-1 cursor-help">
                                            Momentum
                                            <HelpCircle size={12} className="text-zinc-400" />
                                        </span>
                                    </Tooltip>
                                </th>
                                <th className="p-6 text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">
                                    <Tooltip text="Overall engagement health (0-100). Based on opens, clicks, and time active.">
                                        <span className="flex items-center gap-1 cursor-help">
                                            Score
                                            <HelpCircle size={12} className="text-zinc-400" />
                                        </span>
                                    </Tooltip>
                                </th>
                                <th className="p-6 text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                            {contacts.map(contact => (
                            <tr key={contact.id} className="hover:bg-black/[0.01] transition-colors group">
                                <td className="p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="w-8 h-8 rounded-full bg-[var(--rose-gold-muted)] flex items-center justify-center text-[var(--ink)] font-serif font-bold text-xs uppercase">
                                                {contact.first_name?.[0] || contact.email[0]}
                                            </div>
                                            {contact.is_hot_lead && (
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center animate-pulse">
                                                    <Flame size={10} className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-sans font-bold lowercase">{contact.first_name} {contact.last_name}</p>
                                                {contact.is_hot_lead && (
                                                    <Tooltip text="High recent engagement. Strong buying signals detected.">
                                                        <span className="text-[8px] font-sans font-bold uppercase tracking-widest px-1.5 py-0.5 bg-orange-500/10 text-orange-600 rounded-full cursor-help">Hot</span>
                                                    </Tooltip>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-zinc-400 tracking-tight">{contact.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6 text-sm font-serif italic text-zinc-600">
                                    {contact.company_name || '—'}
                                </td>
                                <td className="p-6">
                                    <span className="text-[10px] font-sans font-bold uppercase tracking-widest px-2 py-1 bg-[var(--ivory)] border border-black/5 rounded-full text-zinc-500">
                                        {contact.stage}
                                    </span>
                                </td>
                                <td className="p-6">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-sans font-medium">{contact.momentum_score?.toFixed(1) || '0.0'}</span>
                                        {contact.closer_signal && (
                                            <Tooltip text={`Detected ${contact.closer_signal} keyword in recent communication. Buying signal detected.`}>
                                                <span className="text-[9px] font-sans text-green-600 flex items-center gap-1 mt-0.5 cursor-help">
                                                    <Target size={10} /> {contact.closer_signal}
                                                </span>
                                            </Tooltip>
                                        )}
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-2">
                                        <Heart size={12} className={contact.health_score > 70 ? 'text-[var(--forest-green)]' : 'text-[var(--rose-gold)]'} />
                                        <span className="text-sm font-sans font-medium">{contact.health_score}%</span>
                                    </div>
                                </td>

                                <td className="p-6 text-right">
                                    <button
                                        onClick={() => handleAIDraft(contact)}
                                        className="text-xs font-sans font-bold uppercase tracking-widest text-zinc-400 hover:text-[var(--rose-gold)] transition-colors flex items-center gap-1 ml-auto"
                                        title="Generate AI Email Draft"
                                        aria-label="Generate AI email draft"
                                    >
                                        <Sparkles size={14} /> Draft
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
