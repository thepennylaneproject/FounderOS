'use client';

import React, { useState } from 'react';
import { useUI } from '@/context/UIContext';

export const AddContactForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
    const { showToast, closeModal } = useUI();
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        first_name: '',
        last_name: '',
        company_name: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch('/api/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error('Failed to create contact');

            showToast('Contact integrated successfully', 'success');
            onSuccess();
            closeModal();
        } catch (error) {
            console.error(error);
            showToast('System error: CRM rejected input', 'error');
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
                        required
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="w-full bg-white border border-black/5 p-3 text-sm font-sans focus:ring-0 focus:border-[var(--rose-gold)] transition-colors outline-none"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Last Name</label>
                    <input
                        required
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="w-full bg-white border border-black/5 p-3 text-sm font-sans focus:ring-0 focus:border-[var(--rose-gold)] transition-colors outline-none"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Email Address</label>
                <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white border border-black/5 p-3 text-sm font-sans focus:ring-0 focus:border-[var(--rose-gold)] transition-colors outline-none lowercase"
                />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Company Name</label>
                <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full bg-white border border-black/5 p-3 text-sm font-sans focus:ring-0 focus:border-[var(--rose-gold)] transition-colors outline-none"
                />
            </div>

            <div className="pt-4">
                <button
                    disabled={submitting}
                    className="w-full ink-button flex items-center justify-center gap-2 text-xs font-sans font-bold uppercase tracking-widest p-4 disabled:opacity-50"
                >
                    {submitting ? 'Archiving...' : 'Secure Contact'}
                </button>
            </div>
        </form>
    );
};
