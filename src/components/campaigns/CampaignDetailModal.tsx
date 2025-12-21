'use client';

import React, { useState, useEffect } from 'react';
import { Send, X, Mail, Users, AlertCircle } from 'lucide-react';
import { useUI } from '@/context/UIContext';

interface Campaign {
    id: string;
    name: string;
    type: 'marketing' | 'transactional' | 'newsletter';
    subject: string;
    body: string;
    status: string;
    created_at?: string;
}

interface CampaignDetailModalProps {
    campaign: Campaign;
    onSuccess: () => void;
}

export const CampaignDetailModal: React.FC<CampaignDetailModalProps> = ({ campaign, onSuccess }) => {
    const { showToast, closeModal } = useUI();
    const [sending, setSending] = useState(false);
    const [recipientCount, setRecipientCount] = useState<number | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);

    useEffect(() => {
        // Fetch recipient count (active contacts, excluding churned)
        const fetchCount = async () => {
            try {
                const res = await fetch('/api/contacts');
                const contacts = await res.json();
                const activeContacts = contacts.filter((c: any) => c.stage !== 'churned');
                setRecipientCount(activeContacts.length);
            } catch (err) {
                console.error('Failed to fetch recipient count:', err);
                setRecipientCount(0);
            }
        };
        fetchCount();
    }, []);

    const handleSendCampaign = async () => {
        setSending(true);
        try {
            const res = await fetch(`/api/campaigns/${campaign.id}/execute`, {
                method: 'POST'
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to send campaign');
            }

            showToast(`Campaign dispatched to ${recipientCount} recipients`, 'success');
            onSuccess();
            closeModal();
        } catch (error: any) {
            showToast(`Send failed: ${error.message}`, 'error');
        } finally {
            setSending(false);
            setShowConfirmation(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Campaign Header */}
            <div className="pb-4 border-b border-black/5">
                <h3 className="text-2xl font-serif mb-2">{campaign.name}</h3>
                <div className="flex items-center gap-4 text-sm font-sans text-zinc-500">
                    <span className="px-3 py-1 bg-[var(--ivory)] border border-black/5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                        {campaign.type}
                    </span>
                    <span>Created {new Date(campaign.created_at || '').toLocaleDateString()}</span>
                </div>
            </div>

            {/* Email Preview */}
            <div className="space-y-4">
                <h4 className="text-sm font-sans font-bold uppercase tracking-widest text-zinc-400">Email Preview</h4>

                {/* Subject */}
                <div className="p-4 bg-white/50 border border-black/5 rounded-sm">
                    <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 mb-2">Subject Line</p>
                    <p className="text-lg font-serif">{campaign.subject}</p>
                </div>

                {/* Body Preview */}
                <div className="p-6 bg-white border border-black/5 rounded-sm">
                    <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 mb-4">Message</p>
                    <div className="font-serif text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {campaign.body}
                    </div>
                </div>
            </div>

            {/* Recipient Info */}
            <div className="p-4 bg-[var(--forest-green)]/5 border border-[var(--forest-green)]/10 rounded-sm">
                <div className="flex items-center gap-3">
                    <Users size={16} className="text-[var(--forest-green)]" />
                    <div className="flex-1">
                        <p className="text-sm font-sans font-bold text-zinc-800">
                            {recipientCount !== null ? (
                                <>Sending to <span className="text-[var(--forest-green)]">{recipientCount}</span> active recipients</>
                            ) : (
                                'Loading recipient count...'
                            )}
                        </p>
                        <p className="text-xs font-sans text-zinc-500 mt-1">Excluding churned contacts</p>
                    </div>
                </div>
            </div>

            {/* Warning for draft campaigns */}
            {campaign.status === 'draft' && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-sm flex gap-3">
                    <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-sans font-medium text-amber-900">Ready to dispatch?</p>
                        <p className="text-xs font-sans text-amber-800 mt-1">Once sent, this campaign cannot be undone. All recipients will receive this email.</p>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            {!showConfirmation ? (
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={() => setShowConfirmation(true)}
                        disabled={recipientCount === null || recipientCount === 0 || sending}
                        className="flex-1 ink-button flex items-center justify-center gap-2 text-xs font-sans font-bold uppercase tracking-widest p-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={16} />
                        {sending ? 'Dispatching...' : 'Send Campaign'}
                    </button>
                </div>
            ) : (
                <div className="space-y-3 p-4 bg-red-50 border border-red-200 rounded-sm">
                    <p className="text-sm font-sans font-bold text-red-900">Confirm dispatch?</p>
                    <p className="text-xs font-sans text-red-800">
                        This will send {recipientCount} emails immediately. This action cannot be reversed.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSendCampaign}
                            disabled={sending}
                            className="flex-1 bg-red-600 text-white px-4 py-2 text-xs font-sans font-bold uppercase tracking-widest hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                            {sending ? 'Dispatching...' : 'Yes, Send Now'}
                        </button>
                        <button
                            onClick={() => setShowConfirmation(false)}
                            disabled={sending}
                            className="flex-1 border border-red-200 text-red-900 px-4 py-2 text-xs font-sans font-bold uppercase tracking-widest hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
