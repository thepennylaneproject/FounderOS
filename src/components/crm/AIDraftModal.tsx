'use client';

import React, { useState } from 'react';
import { useUI } from '@/context/UIContext';
import { Sparkles, Send, Copy, RefreshCw, AlertCircle } from 'lucide-react';

export const AIDraftModal: React.FC<{ contact: any }> = ({ contact }) => {
    const { showToast, closeModal } = useUI();
    const [loading, setLoading] = useState(false);
    const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
    const [intent, setIntent] = useState('outreach');
    const [error, setError] = useState<string | null>(null);

    const generateDraft = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/ai/draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contactId: contact.id, intent }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'The AI service is temporarily unavailable. Please try again.');
            }

            const data = await res.json();
            setDraft(data);
            showToast('AI has generated a draft', 'success');
        } catch (err: any) {
            console.error(err);
            const message = err.message || 'Failed to generate draft. Please try again.';
            setError(message);
            showToast(message, 'error');
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
                    contactId: contact.id,
                    to: contact.email,
                    subject: draft.subject,
                    body: draft.body
                }),
            });

            if (!res.ok) throw new Error('Send failed');

            showToast('Email sent successfully', 'success');
            closeModal();
        } catch (error) {
            console.error(error);
            showToast('Failed to send email', 'error');
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
                    <option value="follow-up" className="text-black">Follow-up</option>
                    <option value="closing" className="text-black">Closing</option>
                </select>
            </div>

            {!draft ? (
                <div className="py-12 flex flex-col items-center justify-center border border-dashed border-black/10 rounded-sm">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm w-full max-w-md">
                            <div className="flex items-start gap-3">
                                <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-sans text-red-700">{error}</p>
                                    <button
                                        onClick={generateDraft}
                                        className="mt-2 text-xs font-sans font-bold uppercase tracking-widest text-red-600 hover:text-red-800"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
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
                            <Send size={14} /> Send Email
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
