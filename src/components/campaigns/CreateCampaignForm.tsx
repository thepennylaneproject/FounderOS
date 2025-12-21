'use client';

import React, { useState } from 'react';
import { useUI } from '@/context/UIContext';
import { Send, Layout, Mail } from 'lucide-react';

export const CreateCampaignForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
    const { showToast, closeModal } = useUI();
    const [submitting, setSubmitting] = useState(false);
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

            showToast('Campaign drafted successfully', 'success');
            onSuccess();
            closeModal();
        } catch (error) {
            console.error(error);
            showToast('Failed to create campaign', 'error');
        } finally {
            setSubmitting(false);
        }
    };

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
