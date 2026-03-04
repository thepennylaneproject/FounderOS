'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ChevronRight, FileText, RefreshCw, Edit } from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { EmailComposer } from '@/components/email/EmailComposer';
import { EmailActionButtons } from '@/components/email/EmailActionButtons';
import { Action, LoadingStateList, Frame } from '@/components/editorial';

type Lane = 'now' | 'next' | 'waiting' | 'info' | 'noise';

const LANE_LABELS: Record<Lane, string> = {
    now: 'Priority',
    next: 'Scheduled',
    waiting: 'Pending',
    info: 'Archive',
    noise: 'Archive'
};

interface ThreadRow {
    thread_id: string;
    lane: Lane;
    needs_review: boolean;
    category: string;
    reason: string;
    rule_id: string | null;
    confidence: number;
    risk_level: 'low' | 'medium' | 'high';
    evidence: string[];
    subject: string;
    snippet: string;
    received_at: string;
    from_name: string;
    from_email: string;
    message_count: number;
    has_receipt: boolean;
}

interface Tile {
    category: string;
    count: number;
    oldest_days: number;
    top_senders: string[];
    risk_count: number;
}

export default function InboxPage() {
    return (
        <Suspense fallback={
            <div className="p-10">
                <LoadingStateList items={8} />
            </div>
        }>
            <InboxContent />
        </Suspense>
    );
}

function InboxContent() {
    const [lane, setLane] = useState<Lane>('now');
    const [threads, setThreads] = useState<ThreadRow[]>([]);
    const [selectedThread, setSelectedThread] = useState<string | null>(null);
    const [threadDetail, setThreadDetail] = useState<any>(null);
    const [tiles, setTiles] = useState<Tile[]>([]);
    const [loading, setLoading] = useState(true);
    const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
    const [riskOnly, setRiskOnly] = useState(false);
    const [composerOpen, setComposerOpen] = useState(false);
    const [composerMode, setComposerMode] = useState<'new' | 'reply' | 'forward'>('new');
    const [replyToId, setReplyToId] = useState<string | undefined>();
    const { showToast } = useUI();
    const searchParams = useSearchParams();

    const fetchThreads = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (!riskOnly) params.set('lane', lane);
            if (needsReviewOnly) params.set('needs_review', 'true');
            if (riskOnly) params.set('risk', 'high');
            const categoryFilter = searchParams.get('category');
            if (categoryFilter) params.set('category', categoryFilter);
            const res = await fetch(`/api/inbox/threads?${params.toString()}`);
            const data = await res.json();
            setThreads(data);
            if (!selectedThread && data.length > 0) {
                setSelectedThread(data[0].thread_id);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchTiles = async () => {
        const res = await fetch('/api/inbox/summary');
        const data = await res.json();
        setTiles(data.tiles || []);
    };

    const fetchThreadDetail = async (threadId: string) => {
        const res = await fetch(`/api/inbox/threads/${threadId}`);
        const data = await res.json();
        setThreadDetail(data);
    };

    useEffect(() => {
        fetchThreads();
    }, [lane, needsReviewOnly, riskOnly, searchParams]);

    useEffect(() => {
        const laneParam = searchParams.get('lane') as Lane | null;
        if (laneParam && ['now', 'next', 'waiting', 'info', 'noise'].includes(laneParam)) {
            setLane(laneParam);
        }
    }, [searchParams]);

    useEffect(() => {
        const riskParam = searchParams.get('risk');
        setRiskOnly(riskParam === 'high');
    }, [searchParams]);

    useEffect(() => {
        fetchTiles();
    }, []);

    useEffect(() => {
        if (selectedThread) fetchThreadDetail(selectedThread);
    }, [selectedThread]);

    useEffect(() => {
        if (threads.length === 0) {
            setSelectedThread(null);
            setThreadDetail(null);
            return;
        }
        if (selectedThread && threads.some((t) => t.thread_id === selectedThread)) return;
        setSelectedThread(threads[0].thread_id);
    }, [threads, selectedThread]);

    const handleLaneMove = async (threadId: string, newLane: Lane) => {
        await fetch(`/api/inbox/threads/${threadId}/lane`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lane: newLane })
        });
        showToast(`Thread moved to ${LANE_LABELS[newLane]}`, 'success');
        fetchThreads();
        fetchTiles();
    };

    const handleNeedsReviewToggle = async (threadId: string, nextValue: boolean) => {
        await fetch(`/api/inbox/threads/${threadId}/needs-review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ needs_review: nextValue })
        });
        fetchThreads();
    };

    const handleReply = () => {
        if (!selected) return;
        setComposerMode('reply');
        setReplyToId(selected.thread_id);
        setComposerOpen(true);
    };

    const handleReplyAll = () => {
        if (!selected) return;
        setComposerMode('reply');
        setReplyToId(selected.thread_id);
        setComposerOpen(true);
    };

    const handleForward = () => {
        if (!selected) return;
        setComposerMode('forward');
        setReplyToId(selected.thread_id);
        setComposerOpen(true);
    };

    const handleDelete = async () => {
        if (!selected) return;
        if (!confirm('Delete this thread?')) return;
        await handleLaneMove(selected.thread_id, 'noise');
        showToast('Thread deleted', 'success');
    };

    const handleArchive = async () => {
        if (!selected) return;
        await handleLaneMove(selected.thread_id, 'info');
        showToast('Thread archived', 'success');
    };

    const handleToggleStar = async () => {
        if (!selected) return;
        showToast('Star toggled', 'success');
    };

    const selected = useMemo(
        () => threads.find((t) => t.thread_id === selectedThread) || null,
        [threads, selectedThread]
    );

    return (
        <div style={{ marginTop: 'var(--space-xl)' }} className="space-y-xl animate-in fade-in duration-500">
            {/* Summary Tiles - Ruled format */}
            <section className="grid grid-cols-1 md:grid-cols-6 gap-xl">
                {tiles.map((tile) => (
                    <Link
                        key={tile.category}
                        href={`/inbox?category=${tile.category}`}
                        className="border-t hover:border-t-2 transition-all"
                        style={{
                            borderColor: 'var(--border-content)',
                            paddingTop: 'var(--space-md)'
                        }}
                    >
                        <p className="type-micro text-zinc-400">{tile.category.replace('_', ' ')}</p>
                        <div className="flex items-center justify-between mt-3">
                            <span className="type-subhead">{tile.count}</span>
                            {tile.risk_count > 0 && (
                                <span className="type-micro text-red-500 flex items-center gap-1">
                                    <AlertTriangle size={12} /> {tile.risk_count}
                                </span>
                            )}
                        </div>
                        <p className="type-micro text-zinc-400 mt-2 opacity-60">Oldest: {tile.oldest_days}d</p>
                    </Link>
                ))}
            </section>

            {/* Toolbar - Action primitives */}
            <section className="flex items-center gap-md border-b" style={{ borderColor: 'var(--border-content)', paddingBottom: 'var(--space-md)' }}>
                <Action
                    variant="emphasized"
                    onClick={() => {
                        setComposerMode('new');
                        setReplyToId(undefined);
                        setComposerOpen(true);
                    }}
                    className="flex items-center gap-2"
                >
                    <Edit size={14} />
                    Compose
                </Action>
                {(['now', 'next', 'waiting', 'info'] as Lane[]).map((value) => (
                    <Action
                        key={value}
                        variant={lane === value ? 'emphasized' : 'quiet'}
                        onClick={() => setLane(value)}
                    >
                        {LANE_LABELS[value]}
                    </Action>
                ))}
                
                <div className="ml-auto flex items-center gap-md">
                    <Action
                        variant={needsReviewOnly ? 'emphasized' : 'quiet'}
                        onClick={() => setNeedsReviewOnly((v) => !v)}
                    >
                        Review
                    </Action>
                    <Action
                        variant={riskOnly ? 'emphasized' : 'utility'}
                        onClick={() => setRiskOnly((v) => !v)}
                        className={riskOnly ? 'bg-red-500' : ''}
                    >
                        Risk
                    </Action>
                    <button
                        onClick={() => {
                            fetchThreads();
                            fetchTiles();
                        }}
                        className="action-utility p-xs"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <Link
                        href="/inbox/receipts"
                        className="action-quiet lowercase"
                    >
                        Receipts
                    </Link>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.4fr] gap-2xl">
                {/* Thread List - Ruled items, no card container */}
                <div className="overflow-hidden">
                    <div className="py-md border-b mb-md flex items-center justify-between" style={{ borderColor: 'var(--border-emphasis)' }}>
                        <p className="type-micro text-zinc-400">Threads</p>
                        <span className="type-micro text-zinc-400 lowercase">{threads.length} items</span>
                    </div>
                    <div className="divide-y divide-black/5">
                        {loading ? (
                            <LoadingStateList items={5} />
                        ) : threads.length === 0 ? (
                            <div className="py-xl text-center type-body text-zinc-400 italic">No threads.</div>
                        ) : threads.map((thread) => (
                            <button
                                key={thread.thread_id}
                                onClick={() => setSelectedThread(thread.thread_id)}
                                className={`w-full text-left transition-colors border-t border-black/5`}
                                style={{
                                    padding: 'var(--space-lg) var(--space-md)',
                                    backgroundColor: selectedThread === thread.thread_id ? 'var(--ivory)' : 'transparent',
                                    borderLeft: selectedThread === thread.thread_id ? '2px solid var(--ink)' : 'none'
                                }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <p className="type-label truncate">{thread.from_name || thread.from_email}</p>
                                    <p className="type-micro text-zinc-400">{new Date(thread.received_at).toLocaleDateString()}</p>
                                </div>
                                <h4 className="type-subhead truncate italic leading-tight">{thread.subject}</h4>
                                <p className="type-body text-zinc-400 line-clamp-2 mt-2 leading-relaxed">{thread.snippet}</p>
                                <div className="flex items-center gap-md mt-4">
                                    <span className="type-micro opacity-40">{LANE_LABELS[thread.lane]}</span>
                                    {thread.has_receipt && <span className="type-micro text-rose-gold">receipt</span>}
                                    {thread.needs_review && <span className="type-micro text-amber-600">review</span>}
                                    {thread.risk_level === 'high' && <span className="type-micro text-red-600">risk</span>}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Detail View - Full-bleed feel, no card container */}
                <div className="overflow-hidden min-h-[600px] flex flex-col">
                    {!selected || !threadDetail ? (
                        <div className="py-xl text-center type-body text-zinc-400 italic">Select a thread to inspect.</div>
                    ) : (
                        <div className="flex flex-col h-full animate-in fade-in duration-300">
                            <EmailActionButtons
                                messageId={selected.thread_id}
                                onReply={handleReply}
                                onReplyAll={handleReplyAll}
                                onForward={handleForward}
                                onDelete={handleDelete}
                                onArchive={handleArchive}
                                onToggleStar={handleToggleStar}
                                isStarred={false}
                            />
                            <div className="py-xl border-b" style={{ borderColor: 'var(--border-content)' }}>
                                <div className="flex items-start justify-between gap-xl">
                                    <div className="flex-1">
                                        <p className="type-micro text-zinc-400 mb-md opacity-60">Conversation</p>
                                        <h3 className="type-headline italic">{selected.subject}</h3>
                                        <p className="type-body text-zinc-500 mt-md">From {selected.from_name || selected.from_email}</p>
                                    </div>
                                    <div className="flex flex-col gap-sm min-w-[140px]">
                                        {(['now', 'next', 'waiting', 'info'] as Lane[]).map((value) => (
                                            <Action
                                                key={value}
                                                variant="quiet"
                                                onClick={() => handleLaneMove(selected.thread_id, value)}
                                                className="text-right"
                                            >
                                                → {LANE_LABELS[value]}
                                            </Action>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-xl mt-lg">
                                    <Action
                                        variant="quiet"
                                        onClick={() => handleNeedsReviewToggle(selected.thread_id, !selected.needs_review)}
                                        className="opacity-60"
                                    >
                                        {selected.needs_review ? 'Mark processed' : 'Flag for review'}
                                    </Action>
                                    <span className="type-micro opacity-30 lowercase">Rule: {selected.rule_id || 'heuristic'}</span>
                                    <span className="type-micro opacity-30 lowercase">Score: {(selected.confidence * 100).toFixed(0)}%</span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto divide-y divide-black/5 py-lg">
                                {threadDetail.messages?.map((message: any) => (
                                    <div key={message.id} className="py-xl first:pt-0">
                                        <div className="flex items-center justify-between type-micro text-zinc-400 mb-lg">
                                            <span>{message.from_name || message.from_email}</span>
                                            <span>{new Date(message.received_at).toLocaleString()}</span>
                                        </div>
                                        <p className="type-body whitespace-pre-wrap leading-relaxed">{message.body_text}</p>
                                    </div>
                                ))}
                            </div>

                            {threadDetail.receipts?.length > 0 && (
                                <div className="border-t pt-xl" style={{ borderColor: 'var(--border-emphasis)' }}>
                                    <p className="type-micro text-zinc-400 mb-lg">Extracted Details</p>
                                    {threadDetail.receipts.map((receipt: any) => (
                                        <div key={receipt.id} className="flex items-center justify-between py-md border-t border-black/5 type-label">
                                            <div className="flex items-center gap-md">
                                                <FileText size={14} className="opacity-40" />
                                                <span>{receipt.vendor_name}</span>
                                                <span className="opacity-40">{receipt.date}</span>
                                            </div>
                                            <div className="flex items-center gap-xl">
                                                <span>{receipt.currency} {receipt.amount}</span>
                                                <span className="type-micro opacity-60">{receipt.payment_status}</span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="mt-xl">
                                        <Link href="/inbox/receipts" className="action-quiet lowercase flex items-center gap-xs">
                                            view all records <ChevronRight size={12} />
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <EmailComposer
                isOpen={composerOpen}
                onClose={() => setComposerOpen(false)}
                mode={composerMode}
                replyToId={replyToId}
                onSent={() => {
                    showToast('Email sent successfully', 'success');
                    fetchThreads();
                }}
            />
        </div>
    );
}
