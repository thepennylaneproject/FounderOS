'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ChevronRight, FileText, RefreshCw } from 'lucide-react';
import { useUI } from '@/context/UIContext';

type Lane = 'now' | 'next' | 'waiting' | 'info' | 'noise';

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
    const [lane, setLane] = useState<Lane>('now');
    const [threads, setThreads] = useState<ThreadRow[]>([]);
    const [selectedThread, setSelectedThread] = useState<string | null>(null);
    const [threadDetail, setThreadDetail] = useState<any>(null);
    const [tiles, setTiles] = useState<Tile[]>([]);
    const [loading, setLoading] = useState(true);
    const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
    const [riskOnly, setRiskOnly] = useState(false);
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
        showToast(`Thread moved to ${newLane}`, 'success');
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

    const selected = useMemo(
        () => threads.find((t) => t.thread_id === selectedThread) || null,
        [threads, selectedThread]
    );

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <section className="grid grid-cols-1 md:grid-cols-6 gap-4">
                {tiles.map((tile) => (
                    <Link
                        key={tile.category}
                        href={`/inbox?category=${tile.category}`}
                        className="editorial-card hover:border-[var(--forest-green)] transition-all"
                    >
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">{tile.category.replace('_', ' ')}</p>
                        <div className="flex items-center justify-between mt-3">
                            <span className="text-2xl font-serif">{tile.count}</span>
                            {tile.risk_count > 0 && (
                                <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-red-500 flex items-center gap-1">
                                    <AlertTriangle size={12} /> {tile.risk_count}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] font-sans text-zinc-400 mt-2">Oldest: {tile.oldest_days}d</p>
                        <p className="text-[10px] font-sans text-zinc-400">Top: {tile.top_senders.join(', ') || '—'}</p>
                    </Link>
                ))}
            </section>

            <section className="flex items-center gap-4">
                {(['now', 'next', 'waiting', 'info', 'noise'] as Lane[]).map((value) => (
                    <button
                        key={value}
                        onClick={() => setLane(value)}
                        className={`px-4 py-2 text-[10px] font-sans font-bold uppercase tracking-widest border ${lane === value ? 'bg-[var(--forest-green)] text-[var(--ivory)]' : 'border-black/5 text-zinc-500'}`}
                    >
                        {value}
                    </button>
                ))}
                <button
                    onClick={() => setNeedsReviewOnly((v) => !v)}
                    className={`ml-auto px-4 py-2 text-[10px] font-sans font-bold uppercase tracking-widest border ${needsReviewOnly ? 'bg-[var(--rose-gold)] text-[var(--ivory)]' : 'border-black/5 text-zinc-500'}`}
                >
                    Needs Review
                </button>
                <button
                    onClick={() => setRiskOnly((v) => !v)}
                    className={`px-4 py-2 text-[10px] font-sans font-bold uppercase tracking-widest border ${riskOnly ? 'bg-red-500 text-[var(--ivory)]' : 'border-black/5 text-zinc-500'}`}
                >
                    Risk
                </button>
                <button
                    onClick={() => {
                        fetchThreads();
                        fetchTiles();
                    }}
                    className="p-2 border border-black/5"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
                <Link
                    href="/inbox/receipts"
                    className="ink-button-ghost px-4 py-2 text-[10px] font-sans font-bold uppercase tracking-widest"
                >
                    Receipts View
                </Link>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.4fr] gap-8">
                <div className="bg-white/40 border border-black/5 rounded-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
                        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Threads</p>
                        <span className="text-[10px] font-sans text-zinc-400">{threads.length} items</span>
                    </div>
                    <div className="divide-y divide-black/5">
                        {loading ? (
                            <div className="p-10 text-center text-zinc-400 italic">Loading triage...</div>
                        ) : threads.length === 0 ? (
                            <div className="p-10 text-center text-zinc-400 italic">No threads in this lane.</div>
                        ) : threads.map((thread) => (
                            <button
                                key={thread.thread_id}
                                onClick={() => setSelectedThread(thread.thread_id)}
                                className={`w-full text-left p-6 hover:bg-black/[0.02] transition-colors ${selectedThread === thread.thread_id ? 'bg-black/[0.03]' : ''}`}
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-sans font-semibold truncate">{thread.from_name || thread.from_email}</p>
                                    <p className="text-[10px] text-zinc-400">{new Date(thread.received_at).toLocaleDateString()}</p>
                                </div>
                                <p className="text-sm font-serif italic mt-1 truncate">{thread.subject}</p>
                                <p className="text-[10px] text-zinc-400 line-clamp-2 mt-1">{thread.snippet}</p>
                                <div className="flex items-center gap-3 mt-3 text-[9px] font-sans uppercase tracking-widest text-zinc-500">
                                    <span className="px-2 py-1 border border-black/5">{thread.category.replace('_', ' ')}</span>
                                    <span className="px-2 py-1 border border-black/5">{thread.lane}</span>
                                    {thread.has_receipt && <span className="px-2 py-1 border border-black/5">receipt</span>}
                                    {thread.needs_review && <span className="px-2 py-1 border border-black/5 text-amber-600">needs review</span>}
                                    {thread.risk_level === 'high' && <span className="px-2 py-1 border border-black/5 text-red-600">risk</span>}
                                </div>
                                <p className="text-[10px] text-zinc-400 mt-2" title={(thread.evidence || []).join(' | ')}>
                                    Routed because: {thread.reason || 'default classification'}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white/40 border border-black/5 rounded-sm overflow-hidden">
                    {!selected || !threadDetail ? (
                        <div className="p-10 text-center text-zinc-400 italic">Select a thread to inspect.</div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="p-6 border-b border-black/5">
                                <div className="flex items-start justify-between gap-6">
                                    <div>
                                        <p className="text-xs font-sans uppercase tracking-widest text-zinc-400">Thread</p>
                                        <h3 className="text-2xl font-serif italic mt-2">{selected.subject}</h3>
                                        <p className="text-xs text-zinc-500 mt-2">From {selected.from_name || selected.from_email}</p>
                                    </div>
                                    <div className="space-y-2">
                                        {(['now', 'next', 'waiting', 'info', 'noise'] as Lane[]).map((value) => (
                                            <button
                                                key={value}
                                                onClick={() => handleLaneMove(selected.thread_id, value)}
                                                className="w-full text-[10px] font-sans uppercase tracking-widest border border-black/5 px-3 py-1.5 hover:bg-black/5"
                                            >
                                                Move to {value}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 mt-4">
                                    <button
                                        onClick={() => handleNeedsReviewToggle(selected.thread_id, !selected.needs_review)}
                                        className="text-[10px] font-sans uppercase tracking-widest border border-black/5 px-3 py-1.5"
                                    >
                                        {selected.needs_review ? 'Clear review' : 'Needs review'}
                                    </button>
                                    <span className="text-[10px] text-zinc-400">Rule: {selected.rule_id || 'heuristic'}</span>
                                    <span className="text-[10px] text-zinc-400">Confidence: {(selected.confidence * 100).toFixed(0)}%</span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto divide-y divide-black/5">
                                {threadDetail.messages?.map((message: any) => (
                                    <div key={message.id} className="p-6">
                                        <div className="flex items-center justify-between text-xs text-zinc-400">
                                            <span>{message.from_name || message.from_email}</span>
                                            <span>{new Date(message.received_at).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm font-sans mt-3 whitespace-pre-wrap">{message.body_text}</p>
                                    </div>
                                ))}
                            </div>

                            {threadDetail.receipts?.length > 0 && (
                                <div className="border-t border-black/5 p-6 bg-white/60">
                                    <p className="text-[10px] font-sans uppercase tracking-widest text-zinc-400 mb-3">Extracted Receipts</p>
                                    {threadDetail.receipts.map((receipt: any) => (
                                        <div key={receipt.id} className="flex items-center justify-between py-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                <FileText size={14} />
                                                <span>{receipt.vendor_name}</span>
                                                <span className="text-zinc-400 text-xs">{receipt.date}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs">
                                                <span>{receipt.currency} {receipt.amount}</span>
                                                <span className="text-zinc-500 uppercase">{receipt.payment_status}</span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="text-right mt-4">
                                        <Link href="/inbox/receipts" className="text-[10px] font-sans uppercase tracking-widest text-zinc-500 hover:text-[var(--ink)]">
                                            View receipts <ChevronRight size={12} className="inline-block ml-1" />
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
