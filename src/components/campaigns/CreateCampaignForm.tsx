'use client';

import React, { useState } from 'react';
import { useUI } from '@/context/UIContext';
import { Send, Layout, Mail, CheckCircle2, BarChart2, Zap, ArrowRight, Eye } from 'lucide-react';

export const CreateCampaignForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
    const { showToast, closeModal } = useUI();
    const [submitting, setSubmitting] = useState(false);
    const [created, setCreated] = useState<{ name: string } | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'marketing',
        subject: '',
        content: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch('/api/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error('Failed to create campaign');

            setCreated({ name: formData.name });
        } catch (error) {
            console.error(error);
            showToast('Failed to create campaign', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        onSuccess();
        closeModal();
    };

    // Success screen
    if (created) {
        return (
            <div className="space-y-6">
                <div className="text-center py-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={24} className="text-green-600" />
                    </div>
                    <h3 className="text-2xl font-serif mb-2">Campaign Created</h3>
                    <p className="text-sm font-sans text-zinc-600">
                        "{created.name}" is ready to send.
                    </p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-sm space-y-4">
                    <p className="text-sm font-sans font-bold text-blue-900">What's Next?</p>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <Eye size={14} className="text-blue-600 mt-1 flex-shrink-0" />
                            <div>
                                <p className="text-[10px] font-sans font-bold text-blue-900">Review and send</p>
                                <p className="text-[9px] font-sans text-blue-800 mt-0.5">Open the campaign to review your message and send to your audience</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <BarChart2 size={14} className="text-blue-600 mt-1 flex-shrink-0" />
                            <div>
                                <p className="text-[10px] font-sans font-bold text-blue-900">Monitor engagement</p>
                                <p className="text-[9px] font-sans text-blue-800 mt-0.5">Track opens, clicks, and conversions in real-time from the campaigns page</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Zap size={14} className="text-blue-600 mt-1 flex-shrink-0" />
                            <div>
                                <p className="text-[10px] font-sans font-bold text-blue-900">Refine and resend</p>
                                <p className="text-[9px] font-sans text-blue-800 mt-0.5">Use insights to improve your next campaign</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleClose}
                        className="flex-1 ink-button flex items-center justify-center gap-2 text-xs font-sans font-bold uppercase tracking-widest p-4"
                    >
                        View in Campaigns <ArrowRight size={14} />
                    </button>
                    <button
                        onClick={handleClose}
                        className="flex-1 border border-black/5 px-4 py-3 text-xs font-sans font-bold uppercase tracking-widest hover:bg-black/5 transition-colors rounded-sm"
                    >
                        Done
                    </button>
                </div>
            </div>
        );
    }

    // Form
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Campaign Name</label>
                <input
                    required
                    type="text"
                    placeholder="Q1 Quarterly Review"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white border border-black/5 p-3 text-sm font-sans focus:ring-0 focus:border-[var(--rose-gold)] transition-colors outline-none"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Type</label>
                    <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full bg-white border border-black/5 p-3 text-sm font-sans focus:ring-0 focus:border-[var(--rose-gold)] transition-colors outline-none appearance-none"
                    >
                        <option value="marketing">Marketing</option>
                        <option value="transactional">Transactional</option>
                        <option value="newsletter">Newsletter</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Subject Line</label>
                    <input
                        required
                        type="text"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full bg-white border border-black/5 p-3 text-sm font-sans focus:ring-0 focus:border-[var(--rose-gold)] transition-colors outline-none"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Message Content (HTML/Text)</label>
                <textarea
                    required
                    rows={6}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full bg-white border border-black/5 p-3 text-sm font-sans focus:ring-0 focus:border-[var(--rose-gold)] transition-colors outline-none resize-none"
                    placeholder="Your message surfaces here..."
                />
            </div>

            <div className="pt-4">
                <button
                    disabled={submitting}
                    className="w-full ink-button flex items-center justify-center gap-2 text-xs font-sans font-bold uppercase tracking-widest p-4 disabled:opacity-50"
                >
                    {submitting ? 'Creating...' : 'Create Campaign'}
                </button>
            </div>
        </form>
    );
};
