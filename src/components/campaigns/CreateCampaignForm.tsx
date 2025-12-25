'use client';

import React, { useState } from 'react';
import { useUI } from '@/context/UIContext';
import { AlertCircle } from 'lucide-react';
import { validateCampaignForm } from '@/lib/validation';

export const CreateCampaignForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
    const { showToast, closeModal } = useUI();
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formData, setFormData] = useState({
        name: '',
        type: 'marketing',
        subject: '',
        content: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate before submitting
        const validationErrors = validateCampaignForm(formData);
        if (validationErrors.length > 0) {
            const errorMap = Object.fromEntries(
                validationErrors.map(err => [err.field, err.message])
            );
            setErrors(errorMap);
            showToast('Please fix the errors below', 'error');
            return;
        }

        setErrors({});
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
                    type="text"
                    placeholder="Q1 Quarterly Review"
                    value={formData.name}
                    onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (errors.name) setErrors({ ...errors, name: '' });
                    }}
                    className={`w-full bg-white border p-3 text-sm font-sans focus:ring-0 transition-colors outline-none ${
                        errors.name ? 'border-red-500' : 'border-black/5 focus:border-[var(--rose-gold)]'
                    }`}
                />
                {errors.name && (
                    <div className="flex items-center gap-2 text-red-600 text-[10px] font-sans">
                        <AlertCircle size={12} />
                        {errors.name}
                    </div>
                )}
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
                        type="text"
                        value={formData.subject}
                        onChange={(e) => {
                            setFormData({ ...formData, subject: e.target.value });
                            if (errors.subject) setErrors({ ...errors, subject: '' });
                        }}
                        className={`w-full bg-white border p-3 text-sm font-sans focus:ring-0 transition-colors outline-none ${
                            errors.subject ? 'border-red-500' : 'border-black/5 focus:border-[var(--rose-gold)]'
                        }`}
                    />
                    {errors.subject && (
                        <div className="flex items-center gap-2 text-red-600 text-[10px] font-sans">
                            <AlertCircle size={12} />
                            {errors.subject}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Message Content (HTML/Text)</label>
                <textarea
                    rows={6}
                    value={formData.content}
                    onChange={(e) => {
                        setFormData({ ...formData, content: e.target.value });
                        if (errors.content) setErrors({ ...errors, content: '' });
                    }}
                    className={`w-full bg-white border p-3 text-sm font-sans focus:ring-0 transition-colors outline-none resize-none ${
                        errors.content ? 'border-red-500' : 'border-black/5 focus:border-[var(--rose-gold)]'
                    }`}
                    placeholder="Your message surfaces here..."
                />
                {errors.content && (
                    <div className="flex items-center gap-2 text-red-600 text-[10px] font-sans">
                        <AlertCircle size={12} />
                        {errors.content}
                    </div>
                )}
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
