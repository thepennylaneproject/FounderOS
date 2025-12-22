'use client';

/**
 * EmailInsightsPanel
 *
 * Component for displaying AI-analyzed email insights for a contact
 * Shows sentiment, intent, buying signals, objections, and recommended actions
 */

import React, { useState } from 'react';
import { useEmailInsights, useDailyEmailIntelligenceJob } from '@/hooks/useEmailInsights';

interface EmailInsightsPanelProps {
    contactId: string;
    contactName?: string;
}

const sentimentColors: Record<string, string> = {
    positive: '#10b981', // green
    neutral: '#6b7280',  // gray
    negative: '#ef4444'  // red
};

const intentColors: Record<string, string> = {
    buying_signal: '#f59e0b',  // amber
    objection: '#ef4444',      // red
    inquiry: '#3b82f6',        // blue
    low_interest: '#9ca3af',   // gray
    technical: '#8b5cf6',      // purple
    unknown: '#d1d5db'         // light gray
};

const urgencyColors: Record<string, string> = {
    high: '#ef4444',    // red
    medium: '#f59e0b',  // amber
    low: '#10b981'      // green
};

export function EmailInsightsPanel({ contactId, contactName }: EmailInsightsPanelProps) {
    const { insights, loading, error, total, hasMore, refetch, loadMore } = useEmailInsights(contactId);
    const { running: jobRunning, runJob } = useDailyEmailIntelligenceJob();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (loading) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                Loading email insights...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '20px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px' }}>
                Error loading insights: {error}
            </div>
        );
    }

    const hotLeadInsights = insights.filter(i => i.should_mark_hot_lead);
    const buyingSignalInsights = insights.filter(i => i.intent === 'buying_signal');
    const objectionsInsights = insights.filter(i => i.objections && i.objections.length > 0);

    return (
        <div style={{ borderRadius: '12px', overflow: 'hidden' }}>
            {/* Header with stats */}
            <div style={{ padding: '24px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Email Intelligence</h2>
                    <button
                        onClick={refetch}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}
                    >
                        Refresh
                    </button>
                </div>

                {/* Summary stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                    <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Emails</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>{total}</div>
                    </div>

                    <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Hot Leads</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>{hotLeadInsights.length}</div>
                    </div>

                    <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Buying Signals</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>{buyingSignalInsights.length}</div>
                    </div>

                    <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Objections</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444' }}>{objectionsInsights.length}</div>
                    </div>
                </div>
            </div>

            {/* Email insights list */}
            <div style={{ padding: '20px' }}>
                {insights.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                        <p>No analyzed emails yet</p>
                        <button
                            onClick={runJob}
                            disabled={jobRunning}
                            style={{
                                marginTop: '16px',
                                padding: '8px 16px',
                                backgroundColor: jobRunning ? '#d1d5db' : '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: jobRunning ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {jobRunning ? 'Running analysis...' : 'Run Email Analysis'}
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {insights.map((insight) => (
                            <div
                                key={insight.id}
                                onClick={() => setExpandedId(expandedId === insight.id ? null : insight.id)}
                                style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {/* Collapsed view */}
                                <div style={{ padding: '16px', backgroundColor: expandedId === insight.id ? '#f3f4f6' : 'white' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                                                {insight.subject}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                {new Date(insight.email_received_at).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                            {/* Intent badge */}
                                            <div
                                                style={{
                                                    padding: '4px 12px',
                                                    backgroundColor: intentColors[insight.intent] + '20',
                                                    color: intentColors[insight.intent],
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                {insight.intent}
                                            </div>

                                            {/* Sentiment badge */}
                                            <div
                                                style={{
                                                    padding: '4px 12px',
                                                    backgroundColor: sentimentColors[insight.sentiment] + '20',
                                                    color: sentimentColors[insight.sentiment],
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                {insight.sentiment}
                                            </div>

                                            {/* Urgency badge */}
                                            <div
                                                style={{
                                                    padding: '4px 12px',
                                                    backgroundColor: urgencyColors[insight.urgency] + '20',
                                                    color: urgencyColors[insight.urgency],
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                {insight.urgency}
                                            </div>

                                            {/* Hot lead indicator */}
                                            {insight.should_mark_hot_lead && (
                                                <div
                                                    style={{
                                                        padding: '4px 12px',
                                                        backgroundColor: '#f59e0b20',
                                                        color: '#f59e0b',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    🔥 Hot Lead
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quick action recommendation */}
                                    {!expandedId && (
                                        <div style={{ marginTop: '12px', fontSize: '13px', color: '#3b82f6', fontWeight: '500' }}>
                                            → {insight.recommended_action_description}
                                        </div>
                                    )}
                                </div>

                                {/* Expanded view */}
                                {expandedId === insight.id && (
                                    <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
                                        {/* Confidence score */}
                                        <div style={{ marginBottom: '16px' }}>
                                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                                                Analysis Confidence: {insight.confidence_score}%
                                            </div>
                                            <div
                                                style={{
                                                    width: '100%',
                                                    height: '6px',
                                                    backgroundColor: '#e5e7eb',
                                                    borderRadius: '3px',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: `${insight.confidence_score}%`,
                                                        height: '100%',
                                                        backgroundColor: '#3b82f6',
                                                        transition: 'width 0.3s'
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Buying signals */}
                                        {insight.buying_signals && insight.buying_signals.length > 0 && (
                                            <div style={{ marginBottom: '12px' }}>
                                                <div style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937', marginBottom: '6px' }}>
                                                    💰 Buying Signals
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    {insight.buying_signals.map((signal, idx) => (
                                                        <div
                                                            key={idx}
                                                            style={{
                                                                padding: '4px 10px',
                                                                backgroundColor: '#dcfce7',
                                                                color: '#166534',
                                                                borderRadius: '4px',
                                                                fontSize: '12px'
                                                            }}
                                                        >
                                                            {signal}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Objections */}
                                        {insight.objections && insight.objections.length > 0 && (
                                            <div style={{ marginBottom: '12px' }}>
                                                <div style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937', marginBottom: '6px' }}>
                                                    ⚠️ Objections
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    {insight.objections.map((obj, idx) => (
                                                        <div
                                                            key={idx}
                                                            style={{
                                                                padding: '4px 10px',
                                                                backgroundColor: '#fee2e2',
                                                                color: '#991b1b',
                                                                borderRadius: '4px',
                                                                fontSize: '12px'
                                                            }}
                                                        >
                                                            {obj}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Questions asked */}
                                        {insight.questions_asked && insight.questions_asked.length > 0 && (
                                            <div style={{ marginBottom: '12px' }}>
                                                <div style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937', marginBottom: '6px' }}>
                                                    ❓ Questions Asked
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {insight.questions_asked.map((q, idx) => (
                                                        <div
                                                            key={idx}
                                                            style={{
                                                                padding: '8px 10px',
                                                                backgroundColor: '#dbeafe',
                                                                color: '#1e40af',
                                                                borderRadius: '4px',
                                                                fontSize: '12px',
                                                                borderLeft: '3px solid #3b82f6'
                                                            }}
                                                        >
                                                            {q}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Action items */}
                                        {insight.action_items && insight.action_items.length > 0 && (
                                            <div style={{ marginBottom: '12px' }}>
                                                <div style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937', marginBottom: '6px' }}>
                                                    ✓ Action Items
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {insight.action_items.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            style={{
                                                                padding: '8px 10px',
                                                                backgroundColor: '#f0fdf4',
                                                                color: '#166534',
                                                                borderRadius: '4px',
                                                                fontSize: '12px'
                                                        }}
                                                        >
                                                            • {item}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Timeline information */}
                                        {insight.timeline_mentioned && (
                                            <div style={{ marginBottom: '12px' }}>
                                                <div style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937', marginBottom: '6px' }}>
                                                    ⏱️ Timeline
                                                </div>
                                                <div style={{ padding: '8px 10px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '4px', fontSize: '12px' }}>
                                                    {insight.timeline_mentioned}
                                                </div>
                                            </div>
                                        )}

                                        {/* Recommended action */}
                                        <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '6px', borderLeft: '4px solid #3b82f6' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#1e40af', marginBottom: '4px' }}>
                                                Recommended Action
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#1e40af' }}>
                                                {insight.recommended_action_description}
                                            </div>
                                            {insight.suggested_score_delta !== 0 && (
                                                <div style={{ fontSize: '12px', color: '#0c4a6e', marginTop: '6px' }}>
                                                    Score impact: {insight.suggested_score_delta > 0 ? '+' : ''}{insight.suggested_score_delta}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {hasMore && (
                            <button
                                onClick={loadMore}
                                style={{
                                    padding: '12px',
                                    backgroundColor: '#f3f4f6',
                                    color: '#3b82f6',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    marginTop: '12px'
                                }}
                            >
                                Load more emails ({insights.length} of {total})
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
