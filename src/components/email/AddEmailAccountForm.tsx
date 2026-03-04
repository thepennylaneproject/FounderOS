'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUI } from '@/context/UIContext';
import { Mail, User, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFormDraft } from '@/hooks/useFormDraft';

interface Domain {
  id: string;
  name: string;
  is_verified: boolean;
}

const EMAIL_PREFIX_REGEX = /^[a-z0-9]+([._-][a-z0-9]+)*$/i;

export const AddEmailAccountForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const { showToast, closeModal } = useUI();
  const [submitting, setSubmitting] = useState(false);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [touched, setTouched] = useState({ prefix: false });

  const { values, setValue, clearDraft } = useFormDraft({
    key: 'add-email-account-form',
    initialValues: {
      prefix: '',
      domain_id: '',
      display_name: '',
      signature: '',
    },
  });

  const { prefix, domain_id, display_name, signature } = values;

  const isValidPrefix = useMemo(() => EMAIL_PREFIX_REGEX.test(prefix), [prefix]);
  const showPrefixError = touched.prefix && prefix.length > 0 && !isValidPrefix;
  const selectedDomain = domains.find(d => d.id === domain_id);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      const res = await fetch('/api/domains');
      const data = await res.json();
      // Only show verified domains
      const verifiedDomains = data
        .filter((d: any) => d.status === 'validated')
        .map((d: any) => ({
          id: d.id,
          name: d.name,
          is_verified: true,
        }));
      setDomains(verifiedDomains);
      if (verifiedDomains.length > 0 && !domain_id) {
        setValue('domain_id', verifiedDomains[0].id);
      }
    } catch (error) {
      console.error('Error fetching domains:', error);
      showToast('Failed to load domains', 'error');
    } finally {
      setLoadingDomains(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidPrefix) {
      setTouched({ prefix: true });
      return;
    }

    if (!domain_id) {
      showToast('Please select a domain', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const email_address = `${prefix}@${selectedDomain?.name}`;
      
      const res = await fetch('/api/emails/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_address,
          display_name: display_name || null,
          domain_id,
          signature: signature || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create email account');
      }

      clearDraft();
      showToast(`Email account ${email_address} created successfully`, 'success');
      onSuccess();
      closeModal();
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Failed to create email account', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingDomains) {
    return (
      <div className="p-8 text-center text-zinc-400">
        <p className="text-sm font-sans">Loading domains...</p>
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-serif mb-2">No Verified Domains</h3>
          <p className="text-sm font-sans text-zinc-600">
            You need to add and verify at least one domain before creating email accounts.
          </p>
        </div>
        <button
          onClick={() => {
            closeModal();
            window.location.href = '/domains';
          }}
          className="w-full ink-button text-xs font-sans font-bold uppercase tracking-widest p-4"
        >
          Go to Domains
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-sm">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="text-blue-600 mt-0.5" size={18} />
          <div className="space-y-1">
            <p className="text-xs font-sans font-bold uppercase tracking-widest text-blue-800">
              Create Email Address
            </p>
            <p className="text-[10px] text-blue-700 leading-relaxed font-sans">
              Create a new email address under one of your verified domains. You can use this for sending and receiving emails.
            </p>
          </div>
        </div>
      </div>

      {/* Email Prefix + Domain */}
      <div className="space-y-2">
        <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">
          Email Address
        </label>
        <div className="flex items-stretch gap-2">
          <div className="flex-1 relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              required
              type="text"
              placeholder="admin"
              value={prefix}
              onChange={(e) => setValue('prefix', e.target.value.toLowerCase())}
              onBlur={() => setTouched({ ...touched, prefix: true })}
              className={`w-full bg-white border p-3 pl-10 text-sm font-sans focus:ring-0 transition-colors outline-none lowercase ${
                showPrefixError ? 'border-red-300 focus:border-red-500' : 'border-black/5 focus:border-[var(--rose-gold)]'
              }`}
            />
          </div>
          <span className="flex items-center px-3 bg-zinc-100 border border-black/5 text-sm font-sans text-zinc-600">
            @
          </span>
          <select
            value={domain_id}
            onChange={(e) => setValue('domain_id', e.target.value)}
            className="flex-1 bg-white border border-black/5 p-3 text-sm font-sans focus:ring-0 focus:border-[var(--rose-gold)] transition-colors outline-none"
          >
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </select>
        </div>
        {showPrefixError && (
          <div className="flex items-center gap-2 text-red-600 mt-1">
            <AlertCircle size={12} />
            <p className="text-[10px] font-sans">
              Use only lowercase letters, numbers, dots, hyphens, or underscores
            </p>
          </div>
        )}
        {selectedDomain && (
          <p className="text-[10px] font-sans text-zinc-500">
            Full address: <span className="font-mono">{prefix}@{selectedDomain.name}</span>
          </p>
        )}
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">
          Display Name (Optional)
        </label>
        <div className="relative">
          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="e.g., FounderOS Admin"
            value={display_name}
            onChange={(e) => setValue('display_name', e.target.value)}
            className="w-full bg-white border border-black/5 p-3 pl-10 text-sm font-sans focus:ring-0 focus:border-[var(--rose-gold)] transition-colors outline-none"
          />
        </div>
        <p className="text-[10px] font-sans text-zinc-500">
          This name will appear in the "From" field when you send emails
        </p>
      </div>

      {/* Signature */}
      <div className="space-y-2">
        <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">
          Email Signature (Optional)
        </label>
        <div className="relative">
          <FileText size={14} className="absolute left-3 top-3 text-zinc-400" />
          <textarea
            placeholder="Best regards,&#10;Your Name&#10;Your Title"
            value={signature}
            onChange={(e) => setValue('signature', e.target.value)}
            rows={4}
            className="w-full bg-white border border-black/5 p-3 pl-10 text-sm font-sans focus:ring-0 focus:border-[var(--rose-gold)] transition-colors outline-none resize-none"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={submitting || !isValidPrefix || !domain_id}
          className="w-full ink-button flex items-center justify-center gap-2 text-xs font-sans font-bold uppercase tracking-widest p-4 disabled:opacity-50"
        >
          {submitting ? 'Creating Account...' : 'Create Email Account'}
        </button>
      </div>
    </form>
  );
};
