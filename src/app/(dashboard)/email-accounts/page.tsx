'use client';

import React from 'react';
import { Mail, RefreshCw, Plus, Inbox } from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { useEmailAccounts } from '@/hooks/useEmailAccounts';
import { AddEmailAccountForm } from '@/components/email/AddEmailAccountForm';
import { EmailAccountCard } from '@/components/email/EmailAccountCard';

export default function EmailAccountsPage() {
  const { openModal } = useUI();
  const { accounts, loading, error, fetchAccounts, updateAccount, deleteAccount } = useEmailAccounts();

  const handleAddAccount = () => {
    openModal(
      'Create Email Account',
      <AddEmailAccountForm onSuccess={fetchAccounts} />
    );
  };

  const activeAccounts = accounts.filter(acc => acc.is_active);
  const inactiveAccounts = accounts.filter(acc => !acc.is_active);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className="flex justify-between items-center border-b border-black/5 pb-8">
        <div>
          <h2 className="text-3xl font-serif italic tracking-tight">Email Accounts</h2>
          <p className="text-sm font-sans text-zinc-500 mt-1">
            Manage your email addresses and sending identities.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={fetchAccounts}
            className="p-3 border border-black/5 rounded-sm hover:bg-black/5 transition-colors"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleAddAccount}
            className="ink-button flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-widest px-6 py-3"
          >
            <Plus size={16} /> Create Account
          </button>
        </div>
      </header>

      {error && (
        <div className="editorial-card max-w-3xl">
          <div className="flex items-center gap-2 text-red-700 mb-4">
            <Mail size={18} />
            <p className="text-sm font-sans">{error}</p>
          </div>
          <button
            onClick={fetchAccounts}
            className="ink-button text-xs font-sans font-bold uppercase tracking-widest px-6 py-2"
          >
            Retry Loading
          </button>
        </div>
      )}

      {loading && !error ? (
        <div className="col-span-full p-12 text-center text-zinc-400 italic">
          Loading email accounts...
        </div>
      ) : (
        <>
          {/* Active Accounts */}
          {activeAccounts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-serif">Active Accounts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {activeAccounts.map((account) => (
                  <EmailAccountCard
                    key={account.id}
                    account={account}
                    onUpdate={updateAccount}
                    onDelete={deleteAccount}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Inactive Accounts */}
          {inactiveAccounts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-serif text-zinc-500">Inactive Accounts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {inactiveAccounts.map((account) => (
                  <EmailAccountCard
                    key={account.id}
                    account={account}
                    onUpdate={updateAccount}
                    onDelete={deleteAccount}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {accounts.length === 0 && !loading && !error && (
            <div className="col-span-full p-12 text-center border border-dashed border-black/10 rounded-sm">
              <div className="w-12 h-12 bg-[var(--ivory)] border border-black/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Inbox size={24} className="text-zinc-300" />
              </div>
              <h3 className="text-lg font-serif mb-2">No Email Accounts Yet</h3>
              <p className="text-sm font-sans text-zinc-400 mb-6 max-w-sm mx-auto">
                Create your first email account to start sending and receiving emails through FounderOS.
              </p>
              <button
                onClick={handleAddAccount}
                className="ink-button text-xs font-sans font-bold uppercase tracking-widest px-6 py-2"
              >
                Create Your First Account
              </button>
            </div>
          )}
        </>
      )}

      {/* Info Cards */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <div className="p-6 bg-blue-50 border border-blue-200 rounded-sm">
            <h4 className="text-xs font-sans font-bold uppercase tracking-widest text-blue-800 mb-2">
              💡 Using Multiple Accounts
            </h4>
            <p className="text-[10px] font-sans text-blue-700 leading-relaxed">
              When composing emails, you can select which account to send from in the "From" dropdown. 
              Each account can have its own display name and signature.
            </p>
          </div>
          <div className="p-6 bg-green-50 border border-green-200 rounded-sm">
            <h4 className="text-xs font-sans font-bold uppercase tracking-widest text-green-800 mb-2">
              ✓ Common Use Cases
            </h4>
            <ul className="text-[10px] font-sans text-green-700 leading-relaxed space-y-1">
              <li>• <span className="font-mono">admin@</span> - Administrative communications</li>
              <li>• <span className="font-mono">no-reply@</span> - Automated notifications</li>
              <li>• <span className="font-mono">support@</span> - Customer support emails</li>
              <li>• <span className="font-mono">hello@</span> - General inquiries</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
