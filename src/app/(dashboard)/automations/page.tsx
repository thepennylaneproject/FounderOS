'use client';

import React, { useState, useEffect } from 'react';
import { Workflow, Plus, Zap, ArrowRight, Settings2, PlayCircle } from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { CreateWorkflowForm } from '@/components/automations/CreateWorkflowForm';

export default function AutomationsPage() {
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { openModal } = useUI();

    const fetchWorkflows = () => {
        setLoading(true);
        fetch('/api/workflows')
            .then(res => res.json())
            .then(data => {
                setWorkflows(data);
                setLoading(false);
            })
            .catch(err => console.error(err));
    };

    useEffect(() => {
        fetchWorkflows();
    }, []);

    const handleCreateWorkflow = () => {
        openModal(
            'Create Workflow',
            <CreateWorkflowForm onSuccess={fetchWorkflows} />
        );
    };

    const handleTestWorkflow = (workflow: any) => {
        // Manual trigger of workflow
        alert(`Testing workflow: ${workflow.name}\n\nWorkflow will execute with test data. Check your system logs for execution details.`);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <header className="flex justify-between items-center border-b border-black/5 pb-8">
                <div>
                    <h2 className="text-3xl font-serif italic tracking-tight">Workflows</h2>
                    <p className="text-sm font-sans text-zinc-500 mt-1">Create event-driven automation to handle repetitive tasks.</p>
                </div>
                <button
                    onClick={handleCreateWorkflow}
                    className="ink-button flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-widest px-6 py-3"
                >
                    <Plus size={16} /> Create Workflow
                </button>
            </header>

            <div className="grid grid-cols-1 gap-8">
                <section>
                    <h3 className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-zinc-400 mb-6 underline underline-offset-8 decoration-black/5">Active Workflows</h3>
                    {loading ? (
                        <div className="p-12 text-center text-zinc-400 italic">Loading workflows...</div>
                    ) : workflows.length > 0 ? (
                        <div className="space-y-4">
                            {workflows.map(wf => (
                                <div key={wf.id} className="editorial-card group hover:border-[var(--forest-green)] transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className="w-10 h-10 rounded-sm bg-green-50 flex items-center justify-center">
                                            <Zap size={20} className="text-[var(--forest-green)]" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-lg font-serif">{wf.name}</h4>
                                                <span className="text-[10px] font-sans font-bold uppercase tracking-widest px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Active</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-sans text-zinc-400 mt-1 italic">
                                                When <span className="text-[var(--ink)] not-italic font-medium">{wf.trigger_type}</span> occurs
                                                <ArrowRight size={10} />
                                                Execute actions
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => handleTestWorkflow(wf)}
                                                className="p-2 text-zinc-400 hover:text-[var(--forest-green)] transition-colors"
                                                title="Test this workflow"
                                            >
                                                <PlayCircle size={18} />
                                            </button>
                                            <button className="p-2 text-zinc-400 hover:text-[var(--ink)] transition-colors" title="Configure (coming soon)">
                                                <Settings2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 text-center border border-dashed border-black/10 rounded-sm">
                            <div className="w-12 h-12 bg-[var(--ivory)] border border-black/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Zap size={24} className="text-zinc-300" />
                            </div>
                            <h3 className="text-lg font-serif mb-2">No workflows yet</h3>
                            <p className="text-sm font-sans text-zinc-400 mb-6 max-w-sm mx-auto">Create your first workflow to automate repetitive tasks</p>
                            <button
                                onClick={handleCreateWorkflow}
                                className="ink-button text-xs font-sans font-bold uppercase tracking-widest px-6 py-2"
                            >
                                Create Workflow
                            </button>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
