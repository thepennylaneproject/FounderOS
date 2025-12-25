'use client';

import React, { useState } from 'react';
import { useUI } from '@/context/UIContext';
import { AlertCircle } from 'lucide-react';
import { validateCampaignForm } from '@/lib/validation';

interface Campaign {
    id: string;
    name: string;
    type: string;
    subject: string;
    body: string;
    status: string;
}

interface EditCampaignModalProps {
    campaign: Campaign;
    onSuccess: () => void;
}

export const EditCampaignModal: React.FC<EditCampaignModalProps> = ({ campaign, onSuccess }) => {
    const { showToast, closeModal } = useUI();
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formData, setFormData] = useState({
        name: campaign.name,
        type: campaign.type,
        subject: campaign.subject,
        content: campaign.body
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

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
            const res = await fetch(`/api/campaigns/${campaign.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    type: formData.type,
                    subject: formData.subject,
                    body: formData.content
                }),
            });

            if (!res.ok) throw new Error('Failed to update campaign');

            showToast('Campaign updated successfully', 'success');
            onSuccess();
            closeModal();
        } catch (error) {
            console.error(error);
            showToast('Failed to update campaign', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const isEditable = campaign.status === 'draft';

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {!isEditable && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-sm flex gap-3">
                    <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-sans font-bold text-amber-900">Campaign already sent</p>
                        <p className="text-xs font-sans text-amber-800 mt-1">This campaign has been executed and cannot be edited.</p>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Campaign Name</label>
                <input
                    type="text"
                    disabled={!isEditable}
                    value={formData.name}
                    onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (errors.name) setErrors({ ...errors, name: '' });
                    }}
                    className={`w-full bg-white border p-3 text-sm font-sans focus:ring-0 transition-colors outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
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
                        disabled={!isEditable}
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full bg-white border border-black/5 p-3 text-sm font-sans focus:ring-0 focus:border-[var(--rose-gold)] transition-colors outline-none appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
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
                        disabled={!isEditable}
                        value={formData.subject}
                        onChange={(e) => {
                            setFormData({ ...formData, subject: e.target.value });
                            if (errors.subject) setErrors({ ...errors, subject: '' });
                        }}
                        className={`w-full bg-white border p-3 text-sm font-sans focus:ring-0 transition-colors outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
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
                <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Message Content</label>
                <textarea
                    rows={6}
                    disabled={!isEditable}
                    value={formData.content}
                    onChange={(e) => {
                        setFormData({ ...formData, content: e.target.value });
                        if (errors.content) setErrors({ ...errors, content: '' });
                    }}
                    className={`w-full bg-white border p-3 text-sm font-sans focus:ring-0 transition-colors outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed ${
                        errors.content ? 'border-red-500' : 'border-black/5 focus:border-[var(--rose-gold)]'
                    }`}
                />
                {errors.content && (
                    <div className="flex items-center gap-2 text-red-600 text-[10px] font-sans">
                        <AlertCircle size={12} />
                        {errors.content}
                    </div>
                )}
            </div>

            {isEditable && (
                <div className="pt-4">
                    <button
                        disabled={submitting}
                        className="w-full ink-button flex items-center justify-center gap-2 text-xs font-sans font-bold uppercase tracking-widest p-4 disabled:opacity-50"
                    >
                        {submitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            )}
        </form>
    );
};
