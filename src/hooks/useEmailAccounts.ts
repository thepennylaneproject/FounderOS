import { useState, useEffect, useCallback } from 'react';

export interface EmailAccount {
  id: string;
  email_address: string;
  display_name: string | null;
  domain_id: string;
  signature: string | null;
  is_active: boolean;
  created_at: string;
  email_domains?: {
    domain: string;
    is_verified: boolean;
    reputation_score: number;
  };
}

export function useEmailAccounts() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/emails/accounts');
      if (!res.ok) throw new Error('Failed to fetch email accounts');
      const data = await res.json();
      setAccounts(data);
    } catch (err: any) {
      console.error('Error fetching email accounts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createAccount = useCallback(async (accountData: {
    email_address: string;
    display_name?: string;
    domain_id: string;
    signature?: string;
  }) => {
    try {
      const res = await fetch('/api/emails/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create account');
      }
      const newAccount = await res.json();
      setAccounts(prev => [...prev, newAccount]);
      return newAccount;
    } catch (err: any) {
      console.error('Error creating email account:', err);
      throw err;
    }
  }, []);

  const updateAccount = useCallback(async (id: string, updates: {
    display_name?: string;
    signature?: string;
    is_active?: boolean;
  }) => {
    try {
      const res = await fetch('/api/emails/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update account');
      }
      const updatedAccount = await res.json();
      setAccounts(prev => prev.map(acc => acc.id === id ? updatedAccount : acc));
      return updatedAccount;
    } catch (err: any) {
      console.error('Error updating email account:', err);
      throw err;
    }
  }, []);

  const deleteAccount = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/emails/accounts?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete account');
      }
      setAccounts(prev => prev.filter(acc => acc.id !== id));
    } catch (err: any) {
      console.error('Error deleting email account:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Auto-refresh on window focus
  useEffect(() => {
    const handleFocus = () => fetchAccounts();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchAccounts]);

  return {
    accounts,
    loading,
    error,
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
  };
}
