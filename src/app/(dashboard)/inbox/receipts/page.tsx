'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Receipt = {
    id: string;
    vendor_name: string;
    amount: number;
    currency: string;
    date: string;
    category: string;
    payment_status: string;
    thread_id: string;
};

export default function ReceiptsPage() {
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    const fetchReceipts = async () => {
        const params = new URLSearchParams();
        if (statusFilter) params.set('status', statusFilter);
        if (categoryFilter) params.set('category', categoryFilter);
        const res = await fetch(`/api/receipts?${params.toString()}`);
        const data = await res.json();
        setReceipts(data);
    };

    useEffect(() => {
        fetchReceipts();
    }, [statusFilter, categoryFilter]);

    const totals = useMemo(() => {
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();
        let monthTotal = 0;
        let ytdTotal = 0;
        receipts.forEach((r) => {
            const date = new Date(r.date);
            if (date.getFullYear() === year) {
                ytdTotal += Number(r.amount || 0);
                if (date.getMonth() === month) {
                    monthTotal += Number(r.amount || 0);
                }
            }
        });
        return { monthTotal, ytdTotal };
    }, [receipts]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex items-center justify-between border-b border-black/5 pb-6">
                <div>
                    <h2 className="text-3xl font-serif italic tracking-tight">Receipts</h2>
                    <p className="text-sm font-sans text-zinc-500 mt-1">Structured records extracted from email.</p>
                </div>
                <Link
                    href="/api/receipts/export"
                    className="ink-button-ghost px-4 py-2 text-[10px] font-sans font-bold uppercase tracking-widest"
                >
                    Export CSV
                </Link>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="editorial-card">
                    <p className="text-[10px] font-sans uppercase tracking-widest text-zinc-400">This Month</p>
                    <p className="text-3xl font-serif mt-2">${totals.monthTotal.toFixed(2)}</p>
                </div>
                <div className="editorial-card">
                    <p className="text-[10px] font-sans uppercase tracking-widest text-zinc-400">Year to Date</p>
                    <p className="text-3xl font-serif mt-2">${totals.ytdTotal.toFixed(2)}</p>
                </div>
                <div className="editorial-card">
                    <p className="text-[10px] font-sans uppercase tracking-widest text-zinc-400">Records</p>
                    <p className="text-3xl font-serif mt-2">{receipts.length}</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="border border-black/5 px-3 py-2 text-xs font-sans uppercase tracking-widest"
                >
                    <option value="">All Categories</option>
                    <option value="software">Software</option>
                    <option value="travel">Travel</option>
                    <option value="payroll">Payroll</option>
                    <option value="services">Services</option>
                    <option value="ads">Ads</option>
                    <option value="other">Other</option>
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-black/5 px-3 py-2 text-xs font-sans uppercase tracking-widest"
                >
                    <option value="">All Status</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="unknown">Unknown</option>
                </select>
                <Link
                    href="/inbox"
                    className="ml-auto text-[10px] font-sans uppercase tracking-widest text-zinc-500 hover:text-[var(--ink)]"
                >
                    Back to Inbox
                </Link>
            </div>

            <div className="bg-white/40 border border-black/5 rounded-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-black/5 text-[10px] font-sans uppercase tracking-widest text-zinc-400">
                            <th className="p-4">Vendor</th>
                            <th className="p-4">Amount</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Category</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Thread</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                        {receipts.map((receipt) => (
                            <tr key={receipt.id} className="text-sm">
                                <td className="p-4 font-medium">{receipt.vendor_name}</td>
                                <td className="p-4">{receipt.currency} {Number(receipt.amount).toFixed(2)}</td>
                                <td className="p-4">{receipt.date}</td>
                                <td className="p-4">{receipt.category}</td>
                                <td className="p-4">{receipt.payment_status}</td>
                                <td className="p-4 text-[10px] text-zinc-400">{receipt.thread_id.slice(0, 8)}…</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
