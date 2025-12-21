'use client';

import React, { useState } from 'react';
import { useUI } from '@/context/UIContext';
import { CheckCircle2, MessageSquare, Send, ArrowRight } from 'lucide-react';

export const AddContactForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
    const { showToast, closeModal } = useUI();
    const [submitting, setSubmitting] = useState(false);
    const [created, setCreated] = useState<any>(null);
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

            const data = await res.json();
            setCreated(data);
        } catch (error) {
            console.error(error);
            showToast('System error: Contact rejected', 'error');
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
                    <h3 className="text-2xl font-serif mb-2">Contact Added</h3>
                    <p className="text-sm font-sans text-zinc-600">
                        {created.first_name} {created.last_name} is now in your CRM.
                    </p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-sm">
                    <p className="text-sm font-sans font-bold text-blue-900 mb-3">What's next?</p>
                    <div className="space-y-2">
                        <div className="flex items-start gap-2">
                            <MessageSquare size={14} className="text-blue-600 mt-1 flex-shrink-0" />
                            <p className="text-[10px] font-sans text-blue-800">
                                <span className="font-bold">Draft an email:</span> Use AI to write your first message
                            </p>
                        </div>
                        <div className="flex items-start gap-2">
                            <Send size={14} className="text-blue-600 mt-1 flex-shrink-0" />
                            <p className="text-[10px] font-sans text-blue-800">
                                <span className="font-bold">Send a campaign:</span> Target this contact with an outreach
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleClose}
                        className="flex-1 ink-button flex items-center justify-center gap-2 text-xs font-sans font-bold uppercase tracking-widest p-4"
                    >
                        View in CRM <ArrowRight size={14} />
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
                    {submitting ? 'Creating...' : 'Add Contact'}
                </button>
            </div>
        </form>
    );
};
