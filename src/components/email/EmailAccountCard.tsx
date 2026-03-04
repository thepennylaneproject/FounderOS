'use client';

import React, { useState } from 'react';
import { Mail, User, Edit2, Trash2, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { useUI } from '@/context/UIContext';
import type { EmailAccount } from '@/hooks/useEmailAccounts';

interface EmailAccountCardProps {
  account: EmailAccount;
  onUpdate: (id: string, updates: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const EmailAccountCard: React.FC<EmailAccountCardProps> = ({ 
  account, 
  onUpdate, 
  onDelete 
}) => {
  const { openModal, closeModal, showToast } = useUI();
  const [expandedSignature, setExpandedSignature] = useState(false);

  const handleEdit = () => {
    let editedDisplayName = account.display_name || '';
    let editedSignature = account.signature || '';

    const EditForm = () => {
      const [displayName, setDisplayName] = useState(editedDisplayName);
      const [signature, setSignature] = useState(editedSignature);
      const [saving, setSaving] = useState(false);

      const handleSave = async () => {
        setSaving(true);
        try {
          await onUpdate(account.id, {
            display_name: displayName || null,
            signature: signature || null,
          });
          showToast('Account updated successfully', 'success');
          closeModal();
        } catch (error: any) {
          showToast(error.message || 'Failed to update account', 'error');
        } finally {
          setSaving(false);
        }
      };

      return (
        <div className="space-y-6">
          <div className="p-4 bg-zinc-50 border border-black/5 rounded-sm">
            <p className="text-xs font-mono text-zinc-600">{account.email_address}</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., FounderOS Admin"
              className="w-full bg-white border border-black/5 p-3 text-sm font-sans focus:ring-0 focus:border-[var(--rose-gold)] transition-colors outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">
              Email Signature
            </label>
            <textarea
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Best regards,&#10;Your Name"
              rows={6}
              className="w-full bg-white border border-black/5 p-3 text-sm font-sans focus:ring-0 focus:border-[var(--rose-gold)] transition-colors outline-none resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full ink-button text-xs font-sans font-bold uppercase tracking-widest p-4 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      );
    };

    openModal(`Edit ${account.email_address}`, <EditForm />);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${account.email_address}? This action cannot be undone.`)) {
      return;
    }

    try {
      await onDelete(account.id);
      showToast('Account deleted successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to delete account', 'error');
    }
  };

  const handleToggleActive = async () => {
    try {
      await onUpdate(account.id, { is_active: !account.is_active });
      showToast(
        `Account ${account.is_active ? 'deactivated' : 'activated'} successfully`,
        'success'
      );
    } catch (error: any) {
      showToast(error.message || 'Failed to update account', 'error');
    }
  };

  return (
    <div className="editorial-card group">
      <div className="flex justify-between items-start mb-6">
        <div className="p-3 rounded-full bg-[var(--ivory)] border border-black/5">
          <Mail size={24} className="text-[var(--forest-green)]" />
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-sans font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${
              account.is_active
                ? 'bg-green-50 text-green-600 border-green-100'
                : 'bg-zinc-100 text-zinc-500 border-zinc-200'
            }`}
          >
            {account.is_active ? 'Active' : 'Inactive'}
          </span>
          <button
            onClick={handleEdit}
            className="p-1.5 text-zinc-400 hover:text-[var(--forest-green)] hover:bg-green-50 rounded-full transition-colors"
            title="Edit Account"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            title="Delete Account"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <h3 className="text-xl font-mono mb-2 break-all">{account.email_address}</h3>
      
      {account.display_name && (
        <div className="flex items-center gap-2 text-sm font-sans text-zinc-600 mb-4">
          <User size={14} />
          <span>{account.display_name}</span>
        </div>
      )}

      {account.email_domains && (
        <p className="text-xs font-sans text-zinc-500 mb-6">
          Domain: <span className="font-mono">{account.email_domains.domain}</span>
          {account.email_domains.is_verified && (
            <CheckCircle2 size={12} className="inline ml-1 text-green-600" />
          )}
          {!account.email_domains.is_verified && (
            <AlertCircle size={12} className="inline ml-1 text-amber-500" />
          )}
        </p>
      )}

      {/* Signature Section */}
      {account.signature && (
        <div className="border-t border-black/5 pt-4 mt-4">
          <button
            onClick={() => setExpandedSignature(!expandedSignature)}
            className="w-full flex justify-between items-center py-2 hover:bg-black/[0.02] transition-colors"
          >
            <span className="text-xs font-sans font-medium text-zinc-600">Email Signature</span>
            <ChevronDown
              size={14}
              className={`text-zinc-400 transition-transform ${expandedSignature ? 'rotate-180' : ''}`}
            />
          </button>
          {expandedSignature && (
            <div className="pt-2 pb-2 px-1">
              <pre className="text-[10px] font-sans text-zinc-600 whitespace-pre-wrap break-words bg-zinc-50 p-3 rounded-sm border border-black/5">
                {account.signature}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Toggle Active Button */}
      <div className="mt-6 pt-4 border-t border-black/5">
        <button
          onClick={handleToggleActive}
          className="w-full ink-button-ghost text-[10px] font-sans font-bold uppercase tracking-widest py-2"
        >
          {account.is_active ? 'Deactivate Account' : 'Activate Account'}
        </button>
      </div>
    </div>
  );
};
