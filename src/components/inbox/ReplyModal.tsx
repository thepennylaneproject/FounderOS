'use client';

import React, { useState } from 'react';
import { useUI } from '@/context/UIContext';
import { Send, AlertCircle } from 'lucide-react';

interface ReplyModalProps {
    email: {
        id: string;
        from: string;
        subject: string;
    };
    onSuccess: () => void;
}

export const ReplyModal: React.FC<ReplyModalProps> = ({ email, onSuccess }) => {
    const { showToast, closeModal } = useUI();
    const [sending, setSending] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [body, setBody] = useState('');
    const [error, setError] = useState('');

    const replySubject = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`;

    const handleSend = async () => {
        if (!body.trim()) {
            setError('Please enter a message');
            return;
        }

        setSending(true);
        try {
            const res = await fetch('/api/emails/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: email.from,
                    subject: replySubject,
                    body: body
                }),
            });

            if (!res.ok) throw new Error('Failed to send reply');

            showToast('Reply sent successfully', 'success');
            onSuccess();
            closeModal();
        } catch (error) {
            console.error(error);
            showToast('Failed to send reply', 'error');
        } finally {
            setSending(false);
            setShowConfirm(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="p-4 bg-[var(--ivory)] border border-black/5 rounded-sm">
                <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 mb-2">Replying to</p>
                <p className="text-sm font-sans font-medium lowercase">{email.from}</p>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Subject</label>
                <input
                    type="text"
                    value={replySubject}
                    disabled
                    className="w-full bg-zinc-50 border border-black/5 p-3 text-sm font-sans text-zinc-500 outline-none"
                />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Message</label>
                <textarea
                    rows={8}
                    value={body}
                    onChange={(e) => {
                        setBody(e.target.value);
                        if (error) setError('');
                    }}
                    placeholder="Write your reply here..."
                    className={`w-full bg-white border p-4 text-sm font-sans focus:ring-0 transition-colors outline-none resize-none ${
                        error ? 'border-red-500' : 'border-black/5 focus:border-[var(--rose-gold)]'
                    }`}
                />
                {error && (
                    <div className="flex items-center gap-2 text-red-600 text-[10px] font-sans">
                        <AlertCircle size={12} />
                        {error}
                    </div>
                )}
            </div>

            {!showConfirm ? (
                <div className="pt-4">
                    <button
                        onClick={() => setShowConfirm(true)}
                        disabled={!body.trim()}
                        className="w-full ink-button flex items-center justify-center gap-2 text-xs font-sans font-bold uppercase tracking-widest p-4 disabled:opacity-50"
                    >
                        <Send size={14} /> Send Reply
                    </button>
                </div>
            ) : (
                <div className="space-y-3 p-4 bg-amber-50 border border-amber-200 rounded-sm">
                    <div className="flex items-start gap-3">
                        <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-sans font-bold text-amber-900">Send this reply?</p>
                            <p className="text-xs font-sans text-amber-800 mt-1">
                                This will send an email to {email.from}.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSend}
                            disabled={sending}
                            className="flex-1 bg-[var(--forest-green)] text-white px-4 py-2 text-xs font-sans font-bold uppercase tracking-widest hover:bg-[var(--ink)] disabled:opacity-50 transition-colors"
                        >
                            {sending ? 'Sending...' : 'Yes, Send'}
                        </button>
                        <button
                            onClick={() => setShowConfirm(false)}
                            disabled={sending}
                            className="flex-1 border border-amber-200 text-amber-900 px-4 py-2 text-xs font-sans font-bold uppercase tracking-widest hover:bg-amber-50 disabled:opacity-50 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
