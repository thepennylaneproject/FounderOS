'use client';

import React, { useState, useMemo } from 'react';
import { useUI } from '@/context/UIContext';
import { Globe, Shield, AlertCircle, RotateCcw } from 'lucide-react';
import { DomainSetupGuide } from './DomainSetupGuide';
import { useFormDraft } from '@/hooks/useFormDraft';

// Validate domain format (e.g., example.com, sub.example.co.uk)
const DOMAIN_REGEX = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;

export const AddDomainForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
    const { showToast, closeModal } = useUI();
    const [submitting, setSubmitting] = useState(false);
    const [createdDomain, setCreatedDomain] = useState<string | null>(null);
    const [touched, setTouched] = useState(false);

    const { values, setValue, clearDraft, hasRestoredDraft } = useFormDraft({
        key: 'add-domain-form',
        initialValues: { domainName: '' },
    });

    const domainName = values.domainName;
    const isValidDomain = useMemo(() => DOMAIN_REGEX.test(domainName), [domainName]);
    const showError = touched && domainName.length > 0 && !isValidDomain;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValidDomain) {
            setTouched(true);
            return;
        }
        setSubmitting(true);

        try {
            const res = await fetch('/api/domains', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: domainName }),
            });

            if (!res.ok) throw new Error('Failed to integrate domain');

            clearDraft();
            showToast(`Domain ${domainName} added successfully`, 'success');
            setCreatedDomain(domainName);
        } catch (error) {
            console.error(error);
            showToast('We couldn\'t add this domain. Check the domain name and try again.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSetupComplete = () => {
        clearDraft();
        onSuccess();
        closeModal();
    };

    if (createdDomain) {
        return <DomainSetupGuide domain={createdDomain} onComplete={handleSetupComplete} />;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {hasRestoredDraft && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <RotateCcw size={14} className="text-blue-600" />
                        <p className="text-[10px] font-sans text-blue-800">We restored your unsaved draft.</p>
                    </div>
                    <button
                        type="button"
                        onClick={clearDraft}
                        className="text-[10px] font-sans font-bold uppercase tracking-widest text-blue-600 hover:text-blue-800"
                    >
                        Discard
                    </button>
                </div>
            )}
            <div className="bg-[var(--ivory)] border border-black/5 p-6 rounded-sm flex items-start gap-4">
                <Shield className="text-[var(--forest-green)] mt-1" size={20} />
                <div className="space-y-1">
                    <p className="text-xs font-sans font-bold uppercase tracking-widest">DNS Authentication</p>
                    <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">
                        You'll add SPF and DMARC records to your domain registrar to enable secure email dispatch.
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
                        onChange={(e) => setValue('domainName', e.target.value.toLowerCase())}
                        onBlur={() => setTouched(true)}
                        className={`w-full bg-white border p-3 pl-10 text-sm font-sans focus:ring-0 transition-colors outline-none lowercase ${
                            showError ? 'border-red-300 focus:border-red-500' : 'border-black/5 focus:border-[var(--rose-gold)]'
                        }`}
                    />
                </div>
                {showError && (
                    <div className="flex items-center gap-2 text-red-600 mt-1">
                        <AlertCircle size={12} />
                        <p className="text-[10px] font-sans">Please enter a valid domain (e.g., example.com)</p>
                    </div>
                )}
            </div>

            <div className="pt-4">
                <button
                    disabled={submitting || !isValidDomain}
                    className="w-full ink-button flex items-center justify-center gap-2 text-xs font-sans font-bold uppercase tracking-widest p-4 disabled:opacity-50"
                >
                    {submitting ? 'Auditing...' : 'Add Domain'}
                </button>
            </div>
        </form>
    );
};
