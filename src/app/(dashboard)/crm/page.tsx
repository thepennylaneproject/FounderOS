'use client';

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Heart, Sparkles, Flame, Target, HelpCircle, RefreshCw, TrendingUp, X } from 'lucide-react';
import { Action, LoadingStateList, Frame, Panel } from '@/components/editorial';
import { useUI } from '@/context/UIContext';
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
            {/* Momentum Explainer - Editorial Panel Treatment */}
            {showMomentumExplainer && (
                <div className="fixed inset-0 bg-ink/10 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-ivory border-2 border-ink shadow-2xl max-w-lg w-full p-xl space-y-lg animate-in fade-in duration-300">
                        <div className="flex justify-between items-start">
                            <h3 className="type-subhead">Understanding Momentum</h3>
                            <button
                                onClick={() => setShowMomentumExplainer(false)}
                                className="action-utility"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-md">
                            <p className="type-body text-zinc-600">
                                Momentum measures engagement velocity: the frequency and recency of opens, clicks, and signals.
                            </p>

                            <div className="border-t border-black/5 pt-md space-y-md">
                                <div className="flex items-start gap-md">
                                    <Flame size={16} className="text-orange-500 mt-1" />
                                    <div>
                                        <p className="type-label">Priority (5+)</p>
                                        <p className="type-body text-zinc-500">Strong buying signals detected.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-md">
                                    <Sparkles size={16} className="text-yellow-500 mt-1" />
                                    <div>
                                        <p className="type-label">Engaged (2-4)</p>
                                        <p className="type-body text-zinc-500">Consistent upward interest.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Action
                            variant="emphasized"
                            onClick={() => setShowMomentumExplainer(false)}
                            className="w-full"
                        >
                            Got It
                        </Action>
                    </div>
                </div>
            )}

            <header className="flex justify-between items-end border-b pb-xl" style={{ borderColor: 'var(--border-content)' }}>
                <div>
                    <h2 className="type-headline italic">Contacts</h2>
                    <p className="type-body text-zinc-500 mt-sm">Engagement patterns and relationships.</p>
                </div>
                <Action
                    variant="emphasized"
                    onClick={handleAddContact}
                    className="flex items-center gap-2"
                >
                    <UserPlus size={16} /> Add Contact
                </Action>
            </header>

            {fetchError && (
                <div className="py-xl max-w-4xl">
                    <p className="type-body text-amber-700 mb-lg">{fetchError}</p>
                    <Action
                        variant="emphasized"
                        onClick={fetchContacts}
                    >
                        Retry
                    </Action>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2xl mb-2xl">
                <div className="border-t pt-md" style={{ borderColor: 'var(--border-content)' }}>
                    <p className="type-micro text-zinc-400">Total Reach</p>
                    <p className="type-headline mt-2">{contacts.length}</p>
                </div>
                <div className="border-t pt-md" style={{ borderColor: 'var(--border-content)' }}>
                    <p className="type-micro text-zinc-400">Avg. Engagement</p>
                    <p className="type-headline mt-2">
                        {contacts.length > 0
                            ? Math.round(contacts.reduce((acc, c) => acc + (c.health_score || 0), 0) / contacts.length)
                            : 0}%
                    </p>
                </div>
                <div className="border-t pt-md" style={{ borderColor: 'var(--border-content)' }}>
                    <p className="type-micro text-zinc-400">Priority</p>
                    <p className="type-headline mt-2">{contacts.filter(c => c.is_hot_lead).length}</p>
                </div>
            </div>

            {loading ? (
                <div className="py-2xl">
                    <LoadingStateList items={6} />
                </div>
            ) : contacts.length === 0 ? (
                <div className="py-2xl text-center border-t" style={{ borderColor: 'var(--border-content)' }}>
                    <h3 className="type-subhead mb-2">No relationships tracked yet.</h3>
                    <p className="type-body text-zinc-400 max-w-sm mx-auto mb-lg">Add your first contact to begin mapping engagement patterns.</p>
                    <Action
                        variant="emphasized"
                        onClick={handleAddContact}
                    >
                        Add Contact
                    </Action>
                </div>
            ) : (
                <div className="overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b" style={{ borderColor: 'var(--border-emphasis)' }}>
                                <th className="py-lg px-md type-micro text-zinc-400">Contact</th>
                                <th className="py-lg px-md type-micro text-zinc-400">Company</th>
                                <th className="py-lg px-md type-micro text-zinc-400">Stage</th>
                                <th className="py-lg px-md type-micro text-zinc-400">Momentum</th>
                                <th className="py-lg px-md type-micro text-zinc-400">Health</th>
                                <th className="py-lg px-md type-micro text-zinc-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                            {contacts.map(contact => (
                            <tr key={contact.id} className="hover:bg-black/[0.01] transition-colors group border-b border-black/5 last:border-0">
                                <td className="py-lg px-md">
                                    <div className="flex items-center gap-lg">
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-full bg-ivory border border-black/5 flex items-center justify-center text-ink type-label">
                                                {contact.first_name?.[0] || contact.email[0]}
                                            </div>
                                            {contact.is_hot_lead && (
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                                                    <Flame size={10} className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-md">
                                                <p className="type-label">{contact.first_name} {contact.last_name}</p>
                                                {contact.is_hot_lead && (
                                                    <span className="type-micro text-orange-600">priority</span>
                                                )}
                                            </div>
                                            <p className="type-micro text-zinc-400 mt-1">{contact.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-lg px-md type-body italic text-zinc-500">
                                    {contact.company_name || '—'}
                                </td>
                                <td className="py-lg px-md">
                                    <span className="type-micro lowercase opacity-60">
                                        {contact.stage}
                                    </span>
                                </td>
                                <td className="py-lg px-md">
                                    <div className="flex flex-col">
                                        <span className="type-label">{contact.momentum_score?.toFixed(1) || '0.0'}</span>
                                        {contact.closer_signal && (
                                            <span className="type-micro text-green-600 flex items-center gap-1 mt-1">
                                                <Target size={10} /> {contact.closer_signal}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="py-lg px-md">
                                    <div className="flex items-center gap-md">
                                        <span className={`w-2 h-2 rounded-full ${contact.health_score > 70 ? 'bg-forest-green' : 'bg-rose-gold'}`} />
                                        <span className="type-label">{contact.health_score}%</span>
                                    </div>
                                </td>

                                <td className="py-lg px-md text-right">
                                    <Action
                                        variant="quiet"
                                        onClick={() => handleAIDraft(contact)}
                                        className="inline-flex items-center gap-1"
                                    >
                                        <Sparkles size={14} /> Draft
                                    </Action>
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
