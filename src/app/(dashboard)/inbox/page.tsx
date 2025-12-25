'use client';

import React, { useState, useEffect } from 'react';
import { Inbox, Mail, Search, Archive, Trash2, Send, RefreshCw, ChevronRight } from 'lucide-react';
import { useUI } from '@/context/UIContext';

export default function InboxPage() {
    const [emails, setEmails] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmail, setSelectedEmail] = useState<any>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { showToast } = useUI();

    const fetchEmails = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/emails');
            const data = await res.json();
            setEmails(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmails();
    }, []);

    const handleRefresh = () => {
        fetchEmails();
        showToast('Synchronizing mailbox...', 'info');
    };

    const handleConfirmDelete = () => {
        if (selectedEmail) {
            // Remove email from list
            setEmails(emails.filter(e => e.id !== selectedEmail.id));
            setSelectedEmail(null);
            setShowDeleteConfirm(false);
            showToast('Email deleted', 'success');
        }
    };

    return (
        <div className="h-[calc(100vh-14rem)] flex shadow-sm border border-black/5 rounded-sm overflow-hidden bg-white/40 backdrop-blur-sm animate-in fade-in duration-500 relative">
            {/* Folder Sidebar */}
            <aside className="w-20 border-r border-black/5 flex flex-col items-center py-8 gap-8 bg-white/20">
                <button className="p-3 text-[var(--forest-green)] bg-[var(--ivory)] rounded-sm border border-black/5"><Inbox size={20} /></button>
                <button className="p-3 text-zinc-400 hover:text-[var(--ink)]"><Send size={20} /></button>
                <button className="p-3 text-zinc-400 hover:text-[var(--ink)]"><Archive size={20} /></button>
                <button
                    onClick={handleRefresh}
                    className="p-3 text-zinc-400 hover:text-[var(--ink)] mt-auto"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </aside>

            {/* Message List */}
            <div className="w-96 border-r border-black/5 flex flex-col bg-white/20">
                <div className="p-6 border-b border-black/5">
                    <h2 className="text-xl font-serif italic mb-4 lowercase tracking-tight">unified inbox</h2>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search communications..."
                            className="w-full bg-white/50 border border-black/5 text-xs font-sans pl-10 h-10 rounded-sm focus:ring-0 outline-none"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-black/5">
                    {loading ? (
                        <div className="p-12 text-center">
                            <RefreshCw size={16} className="animate-spin mx-auto mb-3 text-zinc-400" />
                            <p className="text-sm font-sans text-zinc-400 italic">Loading emails...</p>
                        </div>
                    ) : emails.length > 0 ? emails.map(email => (
                        <div
                            key={email.id}
                            onClick={() => setSelectedEmail(email)}
                            className={`p-6 cursor-pointer transition-colors hover:bg-black/[0.02] ${selectedEmail?.id === email.id ? 'bg-black/[0.01]' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <p className="text-sm font-sans font-bold lowercase truncate max-w-[180px]">{email.from}</p>
                                <span className="text-[10px] text-zinc-400">{new Date(email.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs font-serif italic text-zinc-600 truncate mb-1">{email.subject}</p>
                            <p className="text-[10px] font-sans text-zinc-400 line-clamp-2 leading-relaxed">{email.content_preview}</p>
                        </div>
                    )) : (
                        <div className="p-12 text-center">
                            <div className="w-8 h-8 bg-[var(--ivory)] border border-black/5 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Mail size={16} className="text-zinc-300" />
                            </div>
                            <p className="text-xs font-sans text-zinc-400 italic">No messages yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Message Detail */}
            <div className="flex-1 flex flex-col bg-black/[0.005]">
                {selectedEmail ? (
                    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                        <header className="p-8 border-b border-black/5 flex justify-between items-center bg-white/20">
                            <div>
                                <h3 className="text-2xl font-serif mb-1 italic leading-tight">{selectedEmail.subject}</h3>
                                <p className="text-xs font-sans text-zinc-500">From: <span className="text-[var(--ink)] font-medium lowercase italic">{selectedEmail.from}</span></p>
                            </div>
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="p-2 border border-black/5 hover:bg-red-50 transition-colors rounded-sm"
                                title="Delete email"
                            >
                                <Trash2 size={16} />
                            </button>
                        </header>
                        <div className="flex-1 p-12 overflow-y-auto">
                            <div className="max-w-2xl mx-auto bg-white p-12 shadow-sm border border-black/5 font-serif text-lg leading-relaxed text-zinc-800 whitespace-pre-wrap">
                                {selectedEmail.body || selectedEmail.content_preview}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-[var(--ivory)] border border-black/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Mail size={32} className="text-zinc-200" />
                            </div>
                            <h3 className="text-2xl font-serif italic">Your communications surface here.</h3>
                            <p className="text-sm font-sans text-zinc-400 max-w-xs mx-auto italic">Select a message from the column on the left to review its contents and respond.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-sm shadow-lg max-w-sm animate-in fade-in scale-in duration-200">
                        <h3 className="text-xl font-serif mb-3">Delete email?</h3>
                        <p className="text-sm font-sans text-zinc-600 mb-6">This action cannot be undone. The email will be permanently deleted.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleConfirmDelete}
                                className="flex-1 bg-red-600 text-white px-4 py-2 text-xs font-sans font-bold uppercase tracking-widest hover:bg-red-700 transition-colors rounded-sm"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 border border-black/5 px-4 py-2 text-xs font-sans font-bold uppercase tracking-widest hover:bg-black/5 transition-colors rounded-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
