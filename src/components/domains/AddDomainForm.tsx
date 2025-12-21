'use client';

import React, { useState } from 'react';
import { useUI } from '@/context/UIContext';
import { Globe, Shield } from 'lucide-react';

export const AddDomainForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
    const { showToast, closeModal } = useUI();
    const [submitting, setSubmitting] = useState(false);
    const [domainName, setDomainName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch('/api/domains', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain_name: domainName }),
            });

            if (!res.ok) throw new Error('Failed to integrate domain');

            showToast(`Domain ${domainName} queued for validation`, 'success');
            onSuccess();
            closeModal();
        } catch (error) {
            console.error(error);
            showToast('Infrastructure error: Domain rejected', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-[var(--ivory)] border border-black/5 p-6 rounded-sm flex items-start gap-4">
                <Shield className="text-[var(--forest-green)] mt-1" size={20} />
                <div className="space-y-1">
                    <p className="text-xs font-sans font-bold uppercase tracking-widest">DNS Authentication</p>
                    <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">
                        FounderOS will generate SPF, DKIM, and DMARC records for your domain.
                        You will need to add these to your DNS provider to enable secure dispatch.
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Target Domain</label>
                <div className="relative">
                    <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                        required
                        type="text"
                        placeholder="example.com"
                        value={domainName}
                        onChange={(e) => setDomainName(e.target.value)}
                        className="w-full bg-white border border-black/5 p-3 pl-10 text-sm font-sans focus:ring-0 focus:border-[var(--rose-gold)] transition-colors outline-none lowercase"
                    />
                </div>
            </div>

            <div className="pt-4">
                <button
                    disabled={submitting}
                    className="w-full ink-button flex items-center justify-center gap-2 text-xs font-sans font-bold uppercase tracking-widest p-4 disabled:opacity-50"
                >
                    {submitting ? 'Auditing...' : 'Initialize Infrastructure'}
                </button>
            </div>
        </form>
    );
};
