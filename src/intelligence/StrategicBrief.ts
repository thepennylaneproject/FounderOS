'use server';

import pool from '@/lib/db';
import { getMomentumInsights, MomentumInsight } from './MomentumEngine';

export interface StrategicBriefData {
    generatedAt: string;
    summary: string;
    hotLeadCount: number;
    slippingCount: number;
    closerOpportunityCount: number;
    insights: MomentumInsight;
    suggestedActions: SuggestedAction[];
    infrastructureAlerts: InfraAlert[];
}

export interface SuggestedAction {
    type: 'follow_up' | 'rescue' | 'close';
    contactId: string;
    contactName: string;
    contactEmail: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
}

export interface InfraAlert {
    domain: string;
    issue: string;
    severity: 'critical' | 'warning' | 'info';
}

export async function generateStrategicBrief(): Promise<StrategicBriefData> {
    const insights = await getMomentumInsights();

    // Check domain health
    const domainResult = await pool.query(`
        SELECT name, spf_record, dmarc_policy, dkim_key 
        FROM domains 
        WHERE spf_record IS NULL OR dmarc_policy IS NULL OR dkim_key IS NULL
    `);

    const infrastructureAlerts: InfraAlert[] = domainResult.rows.map((d: { name: string; spf_record: string | null; dmarc_policy: string | null; dkim_key: string | null }) => ({
        domain: d.name,
        issue: !d.spf_record ? 'Missing SPF record' :
            !d.dmarc_policy ? 'Missing DMARC policy' :
                'Missing DKIM key',
        severity: 'warning' as const
    }));

    // Generate suggested actions
    const suggestedActions: SuggestedAction[] = [];

    for (const hot of insights.hotLeads.slice(0, 3)) {
        suggestedActions.push({
            type: 'follow_up',
            contactId: hot.contactId,
            contactName: `${hot.firstName} ${hot.lastName}`,
            contactEmail: hot.email,
            reason: hot.closerSignal || `${hot.recentOpens} opens in the last 7 days`,
            priority: 'high'
        });
    }

    for (const slipping of insights.slippingTargets.slice(0, 2)) {
        suggestedActions.push({
            type: 'rescue',
            contactId: slipping.contactId,
            contactName: `${slipping.firstName} ${slipping.lastName}`,
            contactEmail: slipping.email,
            reason: `Health score dropped to ${slipping.healthScore}%`,
            priority: 'medium'
        });
    }

    for (const closer of insights.closerOpportunities.filter(c => c.healthScore > 70).slice(0, 2)) {
        suggestedActions.push({
            type: 'close',
            contactId: closer.contactId,
            contactName: `${closer.firstName} ${closer.lastName}`,
            contactEmail: closer.email,
            reason: closer.closerSignal || 'Ready for closing conversation',
            priority: 'high'
        });
    }

    // Generate summary narrative
    const summary = generateNarrative(insights, infrastructureAlerts.length);

    return {
        generatedAt: new Date().toISOString(),
        summary,
        hotLeadCount: insights.hotLeads.length,
        slippingCount: insights.slippingTargets.length,
        closerOpportunityCount: insights.closerOpportunities.length,
        insights,
        suggestedActions,
        infrastructureAlerts
    };
}

function generateNarrative(insights: MomentumInsight, alertCount: number): string {
    const parts: string[] = [];

    if (insights.hotLeads.length > 0) {
        parts.push(`${insights.hotLeads.length} lead${insights.hotLeads.length > 1 ? 's are' : ' is'} showing strong engagement signals`);
    }

    if (insights.slippingTargets.length > 0) {
        parts.push(`${insights.slippingTargets.length} contact${insights.slippingTargets.length > 1 ? 's need' : ' needs'} attention before they go cold`);
    }

    if (insights.closerOpportunities.length > 0) {
        parts.push(`${insights.closerOpportunities.length} opportunit${insights.closerOpportunities.length > 1 ? 'ies' : 'y'} detected for closing conversations`);
    }

    if (alertCount > 0) {
        parts.push(`${alertCount} infrastructure alert${alertCount > 1 ? 's require' : ' requires'} your attention`);
    }

    if (parts.length === 0) {
        return "All systems nominal. Your pipeline is quiet—consider launching a new outreach campaign.";
    }

    return parts.join('. ') + '.';
}
