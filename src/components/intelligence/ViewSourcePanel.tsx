'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileCode2, RefreshCw, ChevronDown, ChevronRight, Database, Cpu, Box, Palette, BarChart2, DollarSign, ShieldCheck, Network, AlertTriangle, FileText } from 'lucide-react';

interface ViewSourceSection {
    title: string;
    content: string;
}

interface DataSnapshot {
    contactCount: number;
    campaignCount: number;
    domainCount: number;
    workflowCount: number;
    inboxThreadCount: number;
    receiptCount: number;
    receiptTotalAmount: number;
    recentCampaignNames: string[];
    stageCounts: Record<string, number>;
    campaignStatusCounts: Record<string, number>;
    laneCounts: Record<string, number>;
    generatedAt: string;
}

interface ViewSourceReport {
    projectName: string;
    generatedAt: string;
    dataSnapshot: DataSnapshot;
    sections: ViewSourceSection[];
    metadata: {
        confidenceLevel: 'high' | 'medium' | 'low';
        totalTablesQueried: number;
        sectionsWithGaps: number[];
    };
}

const SECTION_ICONS = [
    FileText,
    Cpu,
    Box,
    Palette,
    BarChart2,
    DollarSign,
    ShieldCheck,
    Network,
    AlertTriangle,
    FileCode2,
];

const SectionCard: React.FC<{ section: ViewSourceSection; index: number; hasGap: boolean }> = ({
    section,
    index,
    hasGap,
}) => {
    const [open, setOpen] = useState(index < 3);
    const Icon = SECTION_ICONS[index] ?? FileText;

    // Very simple markdown-to-HTML: bold, tables, code spans, line breaks
    const renderContent = (text: string) => {
        return text.split('\n').map((line, i) => {
            // Table row
            if (line.startsWith('|')) {
                const cells = line.split('|').filter(c => c.trim());
                const isHeader = line.includes('---');
                if (isHeader) return null;
                const Tag = i === 0 ? 'th' : 'td';
                return (
                    <tr key={i} className="border-b border-black/5">
                        {cells.map((cell, j) => (
                            <Tag
                                key={j}
                                className={`px-3 py-1.5 text-xs font-sans text-left ${i === 0 ? 'font-bold uppercase tracking-wider text-zinc-500' : 'text-zinc-700'}`}
                            >
                                {cell.trim()}
                            </Tag>
                        ))}
                    </tr>
                );
            }
            // Bold headings
            if (line.startsWith('**') && line.endsWith('**')) {
                return (
                    <p key={i} className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-500 mt-4 mb-1">
                        {line.replace(/\*\*/g, '')}
                    </p>
                );
            }
            // List item
            if (line.startsWith('- ') || line.match(/^\d+\. /)) {
                return (
                    <p key={i} className="text-sm font-sans text-zinc-700 pl-4 before:content-['·'] before:mr-2 before:text-zinc-400">
                        {formatInline(line.replace(/^[-\d]+[\.\s]+/, ''))}
                    </p>
                );
            }
            // Empty line
            if (!line.trim()) return <div key={i} className="h-2" />;
            // Normal paragraph
            return (
                <p key={i} className="text-sm font-sans text-zinc-700 leading-relaxed">
                    {formatInline(line)}
                </p>
            );
        }).filter(Boolean);
    };

    const formatInline = (text: string) => {
        const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
                return <code key={i} className="font-mono text-[11px] bg-black/5 px-1 rounded">{part.slice(1, -1)}</code>;
            }
            return part;
        });
    };

    // Check if any line is a table row to wrap in <table>
    const hasTable = section.content.includes('|---|');

    return (
        <div className="border border-black/5 bg-white">
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-black/[0.01] transition-colors"
            >
                <Icon size={16} className="text-[var(--forest-green)] shrink-0" />
                <span className="flex-1 text-sm font-sans font-semibold text-zinc-800">{section.title}</span>
                {hasGap && (
                    <span className="text-[9px] font-sans font-bold uppercase tracking-widest px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full mr-2">
                        Gap
                    </span>
                )}
                {open ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
            </button>

            {open && (
                <div className="px-5 pb-5 border-t border-black/5">
                    {hasTable ? (
                        <div className="space-y-2 pt-3">
                            {(() => {
                                const blocks = section.content.split('\n\n');
                                return blocks.map((block, bi) => {
                                    if (block.includes('|---|')) {
                                        const rows = block.split('\n').filter(l => l.trim());
                                        return (
                                            <div key={bi} className="overflow-x-auto">
                                                <table className="w-full text-left border border-black/5">
                                                    <tbody>
                                                        {rows.map((row, ri) => {
                                                            if (row.includes('---')) return null;
                                                            const cells = row.split('|').filter(c => c.trim());
                                                            const Tag = ri === 0 ? 'th' : 'td';
                                                            return (
                                                                <tr key={ri} className="border-b border-black/5">
                                                                    {cells.map((cell, ci) => (
                                                                        <Tag
                                                                            key={ci}
                                                                            className={`px-3 py-2 text-xs font-sans ${ri === 0 ? 'font-bold uppercase tracking-wider bg-black/[0.02] text-zinc-500' : 'text-zinc-700'}`}
                                                                        >
                                                                            {cell.trim()}
                                                                        </Tag>
                                                                    ))}
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={bi} className="space-y-1 pt-1">
                                            {renderContent(block)}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    ) : (
                        <div className="space-y-1 pt-3">
                            {renderContent(section.content)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const ViewSourcePanel: React.FC = () => {
    const [report, setReport] = useState<ViewSourceReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/intelligence/view-source');
            if (!res.ok) throw new Error('Failed to fetch report');
            const data = await res.json();
            setReport(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[var(--ivory)] border border-black/5">
                        <FileCode2 size={20} className="text-[var(--forest-green)]" />
                    </div>
                    <div>
                        <h2 className="text-sm font-sans font-bold uppercase tracking-widest">View Source</h2>
                        <p className="text-xs text-zinc-400 font-sans mt-0.5">Codebase intelligence extraction — investor-grade profile</p>
                    </div>
                </div>
                <button
                    onClick={fetchReport}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-1.5 border border-black/10 text-xs font-sans font-medium hover:border-[var(--forest-green)] hover:text-[var(--forest-green)] transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Generating…' : 'Regenerate'}
                </button>
            </div>

            {/* Error state */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-sm text-red-700 font-sans">
                    {error}
                </div>
            )}

            {/* Loading skeleton */}
            {loading && !report && (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-12 bg-black/[0.03] animate-pulse" />
                    ))}
                </div>
            )}

            {/* Report */}
            {report && (
                <>
                    {/* Metadata bar */}
                    <div className="flex flex-wrap gap-4 p-4 bg-[var(--ivory)] border border-black/5 text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-500">
                        <span>Project: <strong className="text-zinc-700">{report.projectName}</strong></span>
                        <span>Generated: <strong className="text-zinc-700">{new Date(report.generatedAt).toLocaleString()}</strong></span>
                        <span>Confidence: <strong className={`${report.metadata.confidenceLevel === 'high' ? 'text-[var(--forest-green)]' : 'text-amber-600'}`}>{report.metadata.confidenceLevel}</strong></span>
                        <span>Tables queried: <strong className="text-zinc-700">{report.metadata.totalTablesQueried}</strong></span>
                        <span>Sections with gaps: <strong className="text-amber-600">{report.metadata.sectionsWithGaps.length}</strong></span>
                    </div>

                    {/* Live data snapshot */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                        {[
                            { label: 'Contacts', value: report.dataSnapshot.contactCount, icon: Database },
                            { label: 'Campaigns', value: report.dataSnapshot.campaignCount, icon: Database },
                            { label: 'Domains', value: report.dataSnapshot.domainCount, icon: Database },
                            { label: 'Workflows', value: report.dataSnapshot.workflowCount, icon: Database },
                            { label: 'Threads', value: report.dataSnapshot.inboxThreadCount, icon: Database },
                            { label: 'Receipts', value: report.dataSnapshot.receiptCount, icon: Database },
                        ].map(({ label, value }) => (
                            <div key={label} className="p-3 border border-black/5 bg-white text-center">
                                <p className="text-xl font-serif text-zinc-800">{value.toLocaleString()}</p>
                                <p className="text-[9px] font-sans font-bold uppercase tracking-widest text-zinc-400 mt-0.5">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Sections */}
                    <div className="space-y-2">
                        {report.sections.map((section, i) => (
                            <SectionCard
                                key={i}
                                section={section}
                                index={i}
                                hasGap={report.metadata.sectionsWithGaps.includes(i + 1)}
                            />
                        ))}
                    </div>

                    {/* Metadata footer */}
                    <div className="p-4 border border-black/5 bg-[var(--ivory)] font-mono text-[10px] text-zinc-400 space-y-0.5">
                        <p>AUDIT METADATA</p>
                        <p>Project: {report.projectName}</p>
                        <p>Date: {report.generatedAt}</p>
                        <p>Codebase access: full repo (live database)</p>
                        <p>Confidence level: {report.metadata.confidenceLevel}</p>
                        <p>Sections with gaps: [{report.metadata.sectionsWithGaps.join(', ')}]</p>
                        <p>Total tables queried: {report.metadata.totalTablesQueried}</p>
                    </div>
                </>
            )}
        </div>
    );
};
