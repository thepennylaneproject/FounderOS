'use client';

import React, { useState } from 'react';
import { useUI } from '@/context/UIContext';
import { Zap, Play, ArrowRight } from 'lucide-react';

export const CreateWorkflowForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
    const { showToast, closeModal } = useUI();
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        trigger_type: 'contact_created',
        action_type: 'send_email',
        params: {}
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch('/api/workflows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error('Failed to integrate workflow');

            showToast(`Workflow ${formData.name} is now active`, 'success');
            onSuccess();
            closeModal();
        } catch (error) {
            console.error(error);
            showToast('Logic error: Workflow assembly failed', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
                <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Flow Designation</label>
                <input
                    required
                    type="text"
                    placeholder="New Lead Nurture"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white border border-black/5 p-3 text-sm font-sans focus:ring-0 focus:border-[var(--rose-gold)] transition-colors outline-none"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Play size={14} className="text-[var(--rose-gold)]" />
                        <span className="text-[10px] font-sans font-bold uppercase tracking-widest">Trigger event</span>
                    </div>
                    <select
                        value={formData.trigger_type}
                        onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })}
                        className="w-full bg-white border border-black/5 p-4 text-sm font-sans focus:ring-0 focus:border-[var(--rose-gold)] transition-colors outline-none appearance-none"
                    >
                        <option value="contact_created">Contact Created</option>
                        <option value="email_opened">Email Opened</option>
                        <option value="link_clicked">Link Clicked</option>
                        <option value="domain_validated">Domain Validated</option>
                    </select>
                </div>

                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--ivory)] p-1 rounded-full border border-black/5 z-10">
                    <ArrowRight size={14} className="text-zinc-300" />
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap size={14} className="text-[var(--forest-green)]" />
                        <span className="text-[10px] font-sans font-bold uppercase tracking-widest">Autonomous action</span>
                    </div>
                    <select
                        value={formData.action_type}
                        onChange={(e) => setFormData({ ...formData, action_type: e.target.value })}
                        className="w-full bg-white border border-black/5 p-4 text-sm font-sans focus:ring-0 focus:border-[var(--rose-gold)] transition-colors outline-none appearance-none"
                    >
                        <option value="send_email">Dispatch Email</option>
                        <option value="score_lead">Score Lead (AI)</option>
                        <option value="notify_admin">Send Notification</option>
                        <option value="enrich_contact">Enrich Data</option>
                    </select>
                </div>
            </div>

            <div className="pt-4">
                <button
                    disabled={submitting}
                    className="w-full ink-button flex items-center justify-center gap-2 text-xs font-sans font-bold uppercase tracking-widest p-4 disabled:opacity-50"
                >
                    {submitting ? 'Assembling...' : 'Deploy Automation'}
                </button>
            </div>
        </form>
    );
};
