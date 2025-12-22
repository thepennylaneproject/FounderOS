/**
 * Campaign Outcome Engine
 *
 * Purpose: Correlate campaign sends with email engagement metrics to answer
 * "What happened when we sent this campaign?"
 *
 * Key responsibilities:
 * 1. Calculate campaign engagement metrics (opens, clicks, replies, bounces)
 * 2. Measure impact on contact scores using before/after snapshots
 * 3. Identify which contacts engaged vs. ignored
 * 4. Cache outcomes for fast dashboard performance
 *
 * Dependencies:
 * - campaign_sends table (from Phase 0)
 * - email_logs table (existing)
 * - contact_score_snapshots table (from Phase 0)
 * - campaigns table (existing)
 */

import { query } from '@/lib/db';

export interface CampaignEngagementMetrics {
    campaign_id: string;
    total_sends: number;
    total_opens: number;
    total_clicks: number;
    total_replies: number;
    total_bounces: number;
    open_rate: number;
    click_rate: number;
    reply_rate: number;
    bounce_rate: number;
}

export interface ContactEngagementOutcome {
    contact_id: string;
    email: string;
    status: 'bounced' | 'unopened' | 'opened' | 'clicked' | 'replied';
    opened_at?: Date;
    clicked_at?: Date;
    replied_at?: Date;
    bounced_at?: Date;
    score_delta?: number;
}

export interface CampaignImpactAnalysis {
    campaign_id: string;
    campaign_name: string;
    total_contacts_affected: number;
    avg_score_impact: number;
    hot_leads_created: number; // Contacts that became hot leads
    momentum_gained: number; // Sum of momentum score increases
    engagement_lift: number; // % increase in open rate vs. baseline
    top_engaged_contacts: ContactEngagementOutcome[];
    top_unengaged_contacts: ContactEngagementOutcome[];
}

export class CampaignOutcomeEngine {
    /**
     * Calculate engagement metrics for a campaign
     * Correlates campaign_sends with email_logs
     */
    async calculateCampaignMetrics(
        campaignId: string
    ): Promise<CampaignEngagementMetrics> {
        try {
            const result = await query(
                `
                SELECT
                    $1::uuid as campaign_id,
                    COUNT(DISTINCT cs.id) as total_sends,
                    COUNT(DISTINCT CASE WHEN el.opened_at IS NOT NULL THEN el.id END) as total_opens,
                    COUNT(DISTINCT CASE WHEN el.clicked_at IS NOT NULL THEN el.id END) as total_clicks,
                    COUNT(DISTINCT CASE WHEN el.status = 'replied' THEN el.id END) as total_replies,
                    COUNT(DISTINCT CASE WHEN el.status = 'bounced' THEN el.id END) as total_bounces
                FROM campaign_sends cs
                LEFT JOIN email_logs el ON cs.campaign_id = el.campaign_id AND cs.recipient_id = el.contact_id
                WHERE cs.campaign_id = $1
                `,
                [campaignId]
            );

            if (!result.rows || result.rows.length === 0) {
                throw new Error('Campaign not found or no sends recorded');
            }

            const metrics = result.rows[0];

            return {
                campaign_id: campaignId,
                total_sends: parseInt(metrics.total_sends) || 0,
                total_opens: parseInt(metrics.total_opens) || 0,
                total_clicks: parseInt(metrics.total_clicks) || 0,
                total_replies: parseInt(metrics.total_replies) || 0,
                total_bounces: parseInt(metrics.total_bounces) || 0,
                open_rate: metrics.total_sends > 0 ? (parseInt(metrics.total_opens) / parseInt(metrics.total_sends)) * 100 : 0,
                click_rate: metrics.total_sends > 0 ? (parseInt(metrics.total_clicks) / parseInt(metrics.total_sends)) * 100 : 0,
                reply_rate: metrics.total_sends > 0 ? (parseInt(metrics.total_replies) / parseInt(metrics.total_sends)) * 100 : 0,
                bounce_rate: metrics.total_sends > 0 ? (parseInt(metrics.total_bounces) / parseInt(metrics.total_sends)) * 100 : 0
            };
        } catch (error) {
            console.error('Error calculating campaign metrics:', error);
            throw error;
        }
    }

    /**
     * Get engagement outcome for each contact in a campaign
     * Shows which contacts engaged and how
     */
    async getCampaignContactOutcomes(
        campaignId: string
    ): Promise<ContactEngagementOutcome[]> {
        try {
            const result = await query(
                `
                SELECT
                    cs.recipient_id as contact_id,
                    c.email,
                    CASE
                        WHEN el.status = 'bounced' THEN 'bounced'
                        WHEN el.clicked_at IS NOT NULL THEN 'clicked'
                        WHEN el.opened_at IS NOT NULL THEN 'opened'
                        ELSE 'unopened'
                    END as status,
                    el.opened_at,
                    el.clicked_at,
                    CASE WHEN el.status = 'replied' THEN NOW() ELSE NULL END as replied_at,
                    CASE WHEN el.status = 'bounced' THEN NOW() ELSE NULL END as bounced_at
                FROM campaign_sends cs
                JOIN contacts c ON cs.recipient_id = c.id
                LEFT JOIN email_logs el ON cs.campaign_id = el.campaign_id AND cs.recipient_id = el.contact_id
                WHERE cs.campaign_id = $1
                ORDER BY
                    CASE WHEN el.status = 'replied' THEN 0
                         WHEN el.clicked_at IS NOT NULL THEN 1
                         WHEN el.opened_at IS NOT NULL THEN 2
                         WHEN el.status = 'bounced' THEN 4
                         ELSE 3
                    END,
                    el.opened_at DESC NULLS LAST
                `,
                [campaignId]
            );

            return result.rows || [];
        } catch (error) {
            console.error('Error getting campaign contact outcomes:', error);
            throw error;
        }
    }

    /**
     * Measure campaign impact using before/after snapshots
     * Shows how contact engagement scores changed
     */
    async measureCampaignImpact(
        campaignId: string
    ): Promise<CampaignImpactAnalysis> {
        try {
            // Get campaign name
            const campaignRes = await query(
                'SELECT name FROM campaigns WHERE id = $1',
                [campaignId]
            );

            if (!campaignRes.rows || campaignRes.rows.length === 0) {
                throw new Error('Campaign not found');
            }

            const campaignName = campaignRes.rows[0].name;

            // Get before/after snapshots for this campaign
            const snapshotsRes = await query(
                `
                SELECT
                    contact_id,
                    snapshot_reason,
                    health_score,
                    momentum_score,
                    is_hot_lead,
                    captured_at
                FROM contact_score_snapshots
                WHERE related_campaign_id = $1
                ORDER BY contact_id, captured_at ASC
                `,
                [campaignId]
            );

            const snapshots = snapshotsRes.rows || [];
            const contactSnapshotMap = new Map<string, any[]>();

            // Group snapshots by contact
            for (const snapshot of snapshots) {
                if (!contactSnapshotMap.has(snapshot.contact_id)) {
                    contactSnapshotMap.set(snapshot.contact_id, []);
                }
                contactSnapshotMap.get(snapshot.contact_id)!.push(snapshot);
            }

            // Calculate deltas
            let totalContactsAffected = 0;
            let totalScoreDelta = 0;
            let hotLeadsCreated = 0;
            let momentumGained = 0;

            for (const [contactId, snapshotList] of contactSnapshotMap) {
                if (snapshotList.length >= 2) {
                    const before = snapshotList[0];
                    const after = snapshotList[snapshotList.length - 1];

                    const scoreDelta = (after.health_score || 0) - (before.health_score || 0);
                    const momentumDelta = (after.momentum_score || 0) - (before.momentum_score || 0);

                    totalContactsAffected++;
                    totalScoreDelta += scoreDelta;
                    momentumGained += Math.max(0, momentumDelta);

                    if (!before.is_hot_lead && after.is_hot_lead) {
                        hotLeadsCreated++;
                    }
                }
            }

            // Get engagement outcomes
            const outcomes = await this.getCampaignContactOutcomes(campaignId);
            const sortedByEngagement = [...outcomes].sort((a, b) => {
                const engagementOrder = { replied: 0, clicked: 1, opened: 2, unopened: 3, bounced: 4 };
                return (engagementOrder[a.status as keyof typeof engagementOrder] || 5) -
                       (engagementOrder[b.status as keyof typeof engagementOrder] || 5);
            });

            const avgScoreImpact = totalContactsAffected > 0 ? totalScoreDelta / totalContactsAffected : 0;

            return {
                campaign_id: campaignId,
                campaign_name: campaignName,
                total_contacts_affected: totalContactsAffected,
                avg_score_impact: parseFloat(avgScoreImpact.toFixed(2)),
                hot_leads_created: hotLeadsCreated,
                momentum_gained: Math.round(momentumGained),
                engagement_lift: 0, // Would calculate vs. baseline in Phase 2
                top_engaged_contacts: sortedByEngagement.slice(0, 5),
                top_unengaged_contacts: sortedByEngagement.reverse().slice(0, 5)
            };
        } catch (error) {
            console.error('Error measuring campaign impact:', error);
            throw error;
        }
    }

    /**
     * Cache campaign outcomes to campaigns.outcome_cache (JSONB field)
     * Used for fast dashboard queries
     */
    async cacheOutcomes(campaignId: string): Promise<void> {
        try {
            const metrics = await this.calculateCampaignMetrics(campaignId);
            const impact = await this.measureCampaignImpact(campaignId);

            const cacheData = {
                metrics,
                impact,
                cached_at: new Date().toISOString()
            };

            await query(
                `UPDATE campaigns SET outcome_cache = $1::jsonb WHERE id = $2`,
                [JSON.stringify(cacheData), campaignId]
            );

            console.log(`Cached outcomes for campaign ${campaignId}`);
        } catch (error) {
            console.error('Error caching campaign outcomes:', error);
            throw error;
        }
    }

    /**
     * Get cached outcomes (fast path for dashboard)
     */
    async getCachedOutcomes(campaignId: string): Promise<any> {
        try {
            const result = await query(
                `SELECT outcome_cache FROM campaigns WHERE id = $1`,
                [campaignId]
            );

            if (!result.rows || result.rows.length === 0) {
                return null;
            }

            return result.rows[0].outcome_cache;
        } catch (error) {
            console.error('Error fetching cached outcomes:', error);
            throw error;
        }
    }

    /**
     * Recalculate outcomes for all completed campaigns
     * Run daily or after campaign completion
     */
    async recalculateAllOutcomes(): Promise<{ success: number; failed: number }> {
        try {
            // Get all completed campaigns
            const campaignsRes = await query(
                `SELECT id FROM campaigns WHERE status = $1 ORDER BY updated_at DESC LIMIT 100`,
                ['completed']
            );

            const campaigns = campaignsRes.rows || [];
            let success = 0;
            let failed = 0;

            for (const campaign of campaigns) {
                try {
                    await this.cacheOutcomes(campaign.id);
                    success++;
                } catch (err) {
                    console.error(`Failed to cache outcomes for campaign ${campaign.id}:`, err);
                    failed++;
                }
            }

            console.log(`Outcome recalculation: ${success} succeeded, ${failed} failed`);
            return { success, failed };
        } catch (error) {
            console.error('Error recalculating all outcomes:', error);
            throw error;
        }
    }
}

// Export singleton
export const campaignOutcomeEngine = new CampaignOutcomeEngine();
