'use client';

import React, { useState } from 'react';
import { useUI } from '@/context/UIContext';
import { AlertCircle } from 'lucide-react';
import { validateContactForm } from '@/lib/validation';

interface Contact {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    company_name: string | null;
    stage: string;
}

interface EditContactModalProps {
    contact: Contact;
    onSuccess: () => void;
}

export const EditContactModal: React.FC<EditContactModalProps> = ({ contact, onSuccess }) => {
    const { showToast, closeModal } = useUI();
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formData, setFormData] = useState({
        email: contact.email,
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        company_name: contact.company_name || '',
        stage: contact.stage || 'lead'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationErrors = validateContactForm(formData);
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
            const res = await fetch(`/api/contacts/${contact.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error('Failed to update contact');

            showToast('Contact updated successfully', 'success');
            onSuccess();
            closeModal();
        } catch (error) {
            console.error(error);
            showToast('Failed to update contact', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">First Name</label>
                    <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => {
                            setFormData({ ...formData, first_name: e.target.value });
                            if (errors.first_name) setErrors({ ...errors, first_name: '' });
                        }}
                        className={`w-full bg-white border p-3 text-sm font-sans focus:ring-0 transition-colors outline-none ${
                            errors.first_name ? 'border-red-500' : 'border-black/5 focus:border-[var(--rose-gold)]'
                        }`}
                    />
                    {errors.first_name && (
                        <div className="flex items-center gap-2 text-red-600 text-[10px] font-sans">
                            <AlertCircle size={12} />
                            {errors.first_name}
                        </div>
                    )}
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Last Name</label>
                    <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => {
                            setFormData({ ...formData, last_name: e.target.value });
                            if (errors.last_name) setErrors({ ...errors, last_name: '' });
                        }}
                        className={`w-full bg-white border p-3 text-sm font-sans focus:ring-0 transition-colors outline-none ${
                            errors.last_name ? 'border-red-500' : 'border-black/5 focus:border-[var(--rose-gold)]'
                        }`}
                    />
                    {errors.last_name && (
                        <div className="flex items-center gap-2 text-red-600 text-[10px] font-sans">
                            <AlertCircle size={12} />
                            {errors.last_name}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Email Address</label>
                <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (errors.email) setErrors({ ...errors, email: '' });
                    }}
                    className={`w-full bg-white border p-3 text-sm font-sans focus:ring-0 transition-colors outline-none lowercase ${
                        errors.email ? 'border-red-500' : 'border-black/5 focus:border-[var(--rose-gold)]'
                    }`}
                />
                {errors.email && (
                    <div className="flex items-center gap-2 text-red-600 text-[10px] font-sans">
                        <AlertCircle size={12} />
                        {errors.email}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Company Name</label>
                    <input
                        type="text"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        className="w-full bg-white border border-black/5 p-3 text-sm font-sans focus:ring-0 focus:border-[var(--rose-gold)] transition-colors outline-none"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Stage</label>
                    <select
                        value={formData.stage}
                        onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                        className="w-full bg-white border border-black/5 p-3 text-sm font-sans focus:ring-0 focus:border-[var(--rose-gold)] transition-colors outline-none appearance-none"
                    >
                        <option value="lead">Lead</option>
                        <option value="prospect">Prospect</option>
                        <option value="customer">Customer</option>
                        <option value="churned">Churned</option>
                    </select>
                </div>
            </div>

            <div className="pt-4">
                <button
                    disabled={submitting}
                    className="w-full ink-button flex items-center justify-center gap-2 text-xs font-sans font-bold uppercase tracking-widest p-4 disabled:opacity-50"
                >
                    {submitting ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </form>
    );
};
