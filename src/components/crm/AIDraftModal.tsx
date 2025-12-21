'use client';

import React, { useState } from 'react';
import { useUI } from '@/context/UIContext';
import { Sparkles, Send, Copy, RefreshCw } from 'lucide-react';

export const AIDraftModal: React.FC<{ contact: any }> = ({ contact }) => {
    const { showToast, closeModal } = useUI();
    const [loading, setLoading] = useState(false);
    const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
    const [intent, setIntent] = useState('outreach');

    const generateDraft = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/ai/draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contactId: contact.id, intent }),
            });

            if (!res.ok) throw new Error('AI Engine rejected request');

            const data = await res.json();
            setDraft(data);
            showToast('AI Intelligence has generated a draft', 'success');
        } catch (error) {
            console.error(error);
            showToast('AI Engine error: Drafting failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!draft) return;
        navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
        showToast('Draft archived to clipboard', 'success');
    };

    const handleSend = async () => {
        if (!draft) return;
        try {
            const res = await fetch('/api/emails/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: contact.email,
                    subject: draft.subject,
                    body: draft.body
                }),
            });

            if (!res.ok) throw new Error('Dispatch failed');

            showToast('Email dispatched successfully', 'success');
            closeModal();
        } catch (error) {
            console.error(error);
            showToast('Dispatch error: SMTP rejection', 'error');
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-[var(--forest-green)] text-[var(--ivory)] p-6 rounded-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Sparkles className="text-[var(--rose-gold)]" size={24} />
                    <div>
                        <p className="text-xs font-sans font-bold uppercase tracking-widest text-white/60">Target Context</p>
                        <p className="text-sm font-serif italic text-white">{contact.first_name} {contact.last_name} — {contact.company_name || 'Individual'}</p>
                    </div>
                </div>
                <select
                    value={intent}
                    onChange={(e) => setIntent(e.target.value)}
                    className="bg-white/10 border border-white/20 text-xs font-sans font-bold uppercase tracking-widest px-4 py-2 outline-none cursor-pointer"
                >
                    <option value="outreach" className="text-black">Outreach</option>
                    <option value="followup" className="text-black">Follow-up</option>
                    <option value="closing" className="text-black">Closing</option>
                </select>
            </div>

            {!draft ? (
                <div className="py-12 flex flex-col items-center justify-center border border-dashed border-black/10 rounded-sm">
                    <button
                        onClick={generateDraft}
                        disabled={loading}
                        className="ink-button flex items-center gap-3 text-xs font-sans font-bold uppercase tracking-widest px-8 py-4 disabled:opacity-50"
                    >
                        {loading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        {loading ? 'Consulting AI...' : 'Generate Intelligence Draft'}
                    </button>
                    <p className="text-[10px] font-sans text-zinc-400 mt-4 italic">The assistant will analyze contact health and stage before drafting.</p>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="p-4 bg-white border border-black/5">
                            <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 mb-1">Subject</p>
                            <p className="text-sm font-serif italic">{draft.subject}</p>
                        </div>
                        <div className="p-8 bg-white border border-black/5 font-serif text-lg leading-relaxed text-zinc-800 whitespace-pre-wrap">
                            {draft.body}
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={handleSend}
                            className="flex-1 ink-button flex items-center justify-center gap-2 text-xs font-sans font-bold uppercase tracking-widest py-4"
                        >
                            <Send size={14} /> Dispatch Email
                        </button>
                        <button
                            onClick={handleCopy}
                            className="px-6 border border-black/5 hover:bg-black/5 transition-colors text-[var(--ink)]"
                        >
                            <Copy size={16} />
                        </button>
                        <button
                            onClick={generateDraft}
                            disabled={loading}
                            className="px-6 border border-black/5 hover:bg-black/5 transition-colors text-zinc-400"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
