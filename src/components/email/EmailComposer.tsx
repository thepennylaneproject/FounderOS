'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Paperclip, Send, Save, Minimize2, Maximize2 } from 'lucide-react';

interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'new' | 'reply' | 'forward';
  draftId?: string;
  replyToId?: string;
  onSent?: () => void;
}

interface Attachment {
  id: string;
  filename: string;
  size: number;
  url: string;
  content_type: string;
}

export function EmailComposer({ 
  isOpen, 
  onClose, 
  mode = 'new',
  draftId,
  replyToId,
  onSent 
}: EmailComposerProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(draftId);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!isOpen) return;
    
    const interval = setInterval(() => {
      saveDraft();
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen, from, to, cc, bcc, subject, body, attachments]);

  // Load accounts
  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen]);

  // Load reply data if replying
  useEffect(() => {
    if (isOpen && mode === 'reply' && replyToId) {
      loadReply();
    }
  }, [isOpen, mode, replyToId]);

  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/emails/accounts');
      const data = await res.json();
      setAccounts(data);
      if (data.length > 0 && !from) {
        setFrom(data[0].email_address);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const loadReply = async () => {
    try {
      const res = await fetch('/api/emails/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: replyToId, reply_all: false }),
      });
      const data = await res.json();
      
      setTo(data.to_addresses || []);
      setCc(data.cc_addresses || []);
      setSubject(data.subject || '');
      setBody(data.quoted_html || '');
    } catch (error) {
      console.error('Failed to load reply data:', error);
    }
  };

  const saveDraft = useCallback(async () => {
    if (!from || to.length === 0) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/emails/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentDraftId,
          from_address: from,
          to_addresses: to,
          cc_addresses: cc,
          bcc_addresses: bcc,
          subject,
          body_html: body,
          attachments,
        }),
      });
      const draft = await res.json();
      setCurrentDraftId(draft.id);
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setSaving(false);
    }
  }, [from, to, cc, bcc, subject, body, attachments, currentDraftId]);

  const handleSend = async () => {
    if (!from || to.length === 0 || !subject) {
      alert('Please fill in all required fields');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: to.join(', '),
          subject,
          body: body,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send');
      }

      // Delete draft if exists
      if (currentDraftId) {
        await fetch(`/api/emails/drafts?id=${currentDraftId}`, {
          method: 'DELETE',
        });
      }

      onSent?.();
      onClose();
      resetForm();
    } catch (error: any) {
      alert(error.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/emails/attachments', {
          method: 'POST',
          body: formData,
        });
        const attachment = await res.json();
        setAttachments(prev => [...prev, attachment]);
      } catch (error) {
        console.error('Failed to upload attachment:', error);
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const resetForm = () => {
    setTo([]);
    setCc([]);
    setBcc([]);
    setSubject('');
    setBody('');
    setAttachments([]);
    setShowCc(false);
    setShowBcc(false);
    setCurrentDraftId(undefined);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 right-8 z-50 bg-white border-2 border-black/10 rounded-t-lg shadow-2xl"
         style={{ width: minimized ? '320px' : '600px', height: minimized ? '48px' : '600px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 bg-[var(--ivory)]">
        <h3 className="text-sm font-sans font-bold uppercase tracking-widest">
          {mode === 'reply' ? 'Reply' : mode === 'forward' ? 'Forward' : 'New Message'}
        </h3>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-zinc-400">Saving...</span>}
          <button onClick={() => setMinimized(!minimized)} className="p-1 hover:bg-black/5 rounded">
            {minimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded">
            <X size={16} />
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="flex flex-col h-[calc(100%-48px)]">
          {/* Fields */}
          <div className="p-4 space-y-2 border-b border-black/5">
            <div className="flex items-center gap-2">
              <label className="text-xs font-sans uppercase tracking-wider text-zinc-500 w-16">From:</label>
              <select 
                value={from} 
                onChange={(e) => setFrom(e.target.value)}
                className="flex-1 text-sm border-none outline-none bg-transparent"
              >
                {accounts.map(account => (
                  <option key={account.id} value={account.email_address}>
                    {account.display_name || account.email_address}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-sans uppercase tracking-wider text-zinc-500 w-16">To:</label>
              <input
                type="text"
                value={to.join(', ')}
                onChange={(e) => setTo(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="flex-1 text-sm border-none outline-none bg-transparent"
                placeholder="recipient@example.com"
              />
              <button onClick={() => setShowCc(!showCc)} className="text-xs text-zinc-500 hover:text-zinc-700">
                Cc
              </button>
              <button onClick={() => setShowBcc(!showBcc)} className="text-xs text-zinc-500 hover:text-zinc-700">
                Bcc
              </button>
            </div>

            {showCc && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-sans uppercase tracking-wider text-zinc-500 w-16">Cc:</label>
                <input
                  type="text"
                  value={cc.join(', ')}
                  onChange={(e) => setCc(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  className="flex-1 text-sm border-none outline-none bg-transparent"
                />
              </div>
            )}

            {showBcc && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-sans uppercase tracking-wider text-zinc-500 w-16">Bcc:</label>
                <input
                  type="text"
                  value={bcc.join(', ')}
                  onChange={(e) => setBcc(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  className="flex-1 text-sm border-none outline-none bg-transparent"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className="text-xs font-sans uppercase tracking-wider text-zinc-500 w-16">Subject:</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex-1 text-sm border-none outline-none bg-transparent"
                placeholder="Email subject"
              />
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 p-4 overflow-y-auto">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full h-full text-sm border-none outline-none resize-none bg-transparent font-sans"
              placeholder="Write your message..."
            />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="px-4 py-2 border-t border-black/5">
              <div className="flex flex-wrap gap-2">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center gap-2 px-3 py-1 bg-zinc-100 rounded text-xs">
                    <Paperclip size={12} />
                    <span>{att.filename}</span>
                    <button onClick={() => removeAttachment(att.id)} className="text-red-500 hover:text-red-700">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-black/10 bg-zinc-50">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--forest-green)] text-[var(--ivory)] text-xs font-sans font-bold uppercase tracking-widest hover:bg-[var(--forest-green)]/90 disabled:opacity-50"
              >
                <Send size={14} />
                {sending ? 'Sending...' : 'Send'}
              </button>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="attachment-upload"
              />
              <label
                htmlFor="attachment-upload"
                className="flex items-center gap-2 px-3 py-2 border border-black/10 cursor-pointer hover:bg-black/5 text-xs"
              >
                <Paperclip size={14} />
                Attach
              </label>
            </div>
            <button
              onClick={saveDraft}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-600 hover:text-zinc-800"
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
