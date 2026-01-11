'use client';

import React, { useEffect, useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { useUI } from '@/context/UIContext';

interface Rule {
    id: string;
    enabled: boolean;
    priority: number;
    match: any;
    action: any;
    reason_template: string;
    matchText?: string;
    actionText?: string;
}

export default function AutomationsPage() {
    const [rules, setRules] = useState<Rule[]>([]);
    const [loading, setLoading] = useState(true);
    const [testThreadId, setTestThreadId] = useState('');
    const [testResult, setTestResult] = useState<any>(null);
    const { showToast } = useUI();

    const fetchRules = async () => {
        setLoading(true);
        const res = await fetch('/api/automations/rules');
        const data = await res.json();
        setRules(
            data.map((rule: Rule) => ({
                ...rule,
                matchText: JSON.stringify(rule.match || {}, null, 2),
                actionText: JSON.stringify(rule.action || {}, null, 2)
            }))
        );
        setLoading(false);
    };

    useEffect(() => {
        fetchRules();
    }, []);

    const updateRule = async (rule: Rule) => {
        const payload = {
            id: rule.id,
            enabled: rule.enabled,
            priority: rule.priority,
            match: rule.match,
            action: rule.action,
            reason_template: rule.reason_template
        };
        const res = await fetch('/api/automations/rules', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            showToast('Rule update failed', 'error');
            return;
        }
        showToast('Rule updated', 'success');
        fetchRules();
    };

    const createRule = async () => {
        const res = await fetch('/api/automations/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                enabled: true,
                priority: rules.length + 10,
                match: { subject_contains: ['invoice'] },
                action: { set_lane: 'now', set_category: 'operations' },
                reason_template: 'Routed because: invoice keywords detected'
            })
        });
        if (!res.ok) {
            showToast('Rule creation failed', 'error');
            return;
        }
        fetchRules();
    };

    const runTest = async () => {
        if (!testThreadId) return;
        const res = await fetch('/api/automations/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ thread_id: testThreadId })
        });
        const data = await res.json();
        setTestResult(data);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <header className="flex justify-between items-center border-b border-black/5 pb-8">
                <div>
                    <h2 className="text-3xl font-serif italic tracking-tight">Automation Rules</h2>
                    <p className="text-sm font-sans text-zinc-500 mt-1">Explainable routing with rule + evidence.</p>
                </div>
                <button
                    onClick={createRule}
                    className="ink-button flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-widest px-6 py-3"
                >
                    Add Rule
                </button>
            </header>

            <div className="space-y-6">
                {loading ? (
                    <div className="p-12 text-center text-zinc-400 italic">Loading rules...</div>
                ) : (
                    rules.map((rule) => (
                        <div key={rule.id} className="editorial-card space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-sans uppercase tracking-widest text-zinc-400">Rule</p>
                                    <p className="text-sm font-sans font-bold">Priority {rule.priority}</p>
                                </div>
                                <label className="text-xs font-sans flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={rule.enabled}
                                        onChange={(e) => updateRule({ ...rule, enabled: e.target.checked })}
                                    />
                                    Enabled
                                </label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-sans uppercase tracking-widest text-zinc-400 mb-2">Match</p>
                                    <textarea
                                        value={rule.matchText}
                                        onChange={(e) => {
                                            const next = e.target.value;
                                            setRules((prev) =>
                                                prev.map((r) => (r.id === rule.id ? { ...r, matchText: next } : r))
                                            );
                                        }}
                                        className="w-full border border-black/5 p-3 text-xs font-mono h-24"
                                    />
                                </div>
                                <div>
                                    <p className="text-[10px] font-sans uppercase tracking-widest text-zinc-400 mb-2">Action</p>
                                    <textarea
                                        value={rule.actionText}
                                        onChange={(e) => {
                                            const next = e.target.value;
                                            setRules((prev) =>
                                                prev.map((r) => (r.id === rule.id ? { ...r, actionText: next } : r))
                                            );
                                        }}
                                        className="w-full border border-black/5 p-3 text-xs font-mono h-24"
                                    />
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-sans uppercase tracking-widest text-zinc-400 mb-2">Reason Template</p>
                                <input
                                    type="text"
                                    value={rule.reason_template}
                                    onChange={(e) => {
                                        const next = e.target.value;
                                        setRules((prev) =>
                                            prev.map((r) => (r.id === rule.id ? { ...r, reason_template: next } : r))
                                        );
                                    }}
                                    className="w-full border border-black/5 p-3 text-xs font-sans"
                                />
                            </div>
                            <div className="flex items-center justify-end">
                                <button
                                    onClick={() => {
                                        try {
                                            const match = JSON.parse(rule.matchText || '{}');
                                            const action = JSON.parse(rule.actionText || '{}');
                                            updateRule({ ...rule, match, action });
                                        } catch (error) {
                                            showToast('Invalid JSON in rule', 'error');
                                        }
                                    }}
                                    className="ink-button-ghost px-4 py-2 text-[10px] font-sans uppercase tracking-widest"
                                >
                                    Save Rule
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <section className="editorial-card space-y-4">
                <div className="flex items-center gap-3">
                    <PlayCircle size={16} />
                    <p className="text-sm font-sans font-bold">Test Rule</p>
                </div>
                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        value={testThreadId}
                        onChange={(e) => setTestThreadId(e.target.value)}
                        placeholder="Thread ID"
                        className="flex-1 border border-black/5 p-3 text-xs font-mono"
                    />
                    <button
                        onClick={runTest}
                        className="ink-button-ghost px-4 py-2 text-[10px] font-sans uppercase tracking-widest"
                    >
                        Run Test
                    </button>
                </div>
                {testResult && (
                    <div className="text-xs font-mono bg-white/60 p-4 border border-black/5">
                        {JSON.stringify(testResult.threadState, null, 2)}
                    </div>
                )}
            </section>
        </div>
    );
}
