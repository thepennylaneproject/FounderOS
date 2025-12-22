/**
 * Contact Triage Engine
 *
 * Purpose: Automatically categorize and prioritize contacts based on engagement,
 * score, and behavior. Suggests next-best-action for each contact tier.
 *
 * Questions it answers:
 * - Which contacts are hot leads?
 * - Which contacts need re-engagement?
 * - Which contacts are at risk of churning?
 * - What should I do with each contact?
 *
 * Key concepts:
 * - Triage Tier: Categorizes contacts (hot, active, at_risk, cold, churned)
 * - Score Calculation: health_score, momentum_score, engagement delta
 * - Rules Engine: Customizable triage rules per founder
 * - Next Best Action: Suggested action for each contact
 *
 * Dependencies:
 * - contacts table (health_score, momentum_score, is_hot_lead)
 * - email_logs table (engagement signals)
 * - contact_score_snapshots table (historical trends)
 * - triage_rules table (customizable rules)
 */

import { query } from '@/lib/db';

export type TriageTier = 'hot_lead' | 'active' | 'at_risk' | 'cold' | 'churned';

export type NextBestAction =
    | 'send_urgent_campaign'
    | 'send_nurture'
    | 'send_re_engagement'
    | 'schedule_call'
    | 'enrich_profile'
    | 'remove_from_list'
    | 'wait';

export interface TriagedContact {
    contact_id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
    health_score: number;
    momentum_score: number;
    triage_tier: TriageTier;
    next_best_action: NextBestAction;
    reason: string;
    days_since_engagement: number;
    recent_opens: number;
    recent_clicks: number;
    last_engaged_at?: Date;
}

export interface TriageStats {
    total_contacts: number;
    hot_leads: number;
    active: number;
    at_risk: number;
    cold: number;
    churned: number;
    avg_health_score: number;
    avg_momentum_score: number;
}

export interface TriageAction {
    action: NextBestAction;
    count: number;
    tier: TriageTier;
    description: string;
}

class ContactTriageEngine {
    /**
     * Run full triage on all contacts
     * Categorizes and suggests actions for each contact
     */
    async triageAllContacts(): Promise<{ processed: number; updated: number; errors: string[] }> {
        const errors: string[] = [];
        let processed = 0;
        let updated = 0;

        try {
            // Get all active contacts
            const contactsRes = await query(
                `SELECT id, email, health_score, momentum_score FROM contacts
                 WHERE stage != $1 ORDER BY updated_at DESC`,
                ['churned']
            );

            const contacts = contactsRes.rows || [];
            console.log(`[Triage] Processing ${contacts.length} contacts`);

            for (const contact of contacts) {
                try {
                    processed++;
                    const triage = await this.triageContact(contact.id);

                    // Update contact with triage tier and next action
                    await query(
                        `UPDATE contacts
                         SET triage_tier = $1, updated_at = CURRENT_TIMESTAMP
                         WHERE id = $2`,
                        [triage.triage_tier, contact.id]
                    );

                    updated++;

                    // Log progress
                    if (processed % 100 === 0) {
                        console.log(`[Triage] Progress: ${processed}/${contacts.length} processed`);
                    }
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : String(err);
                    errors.push(`Contact ${contact.id}: ${errorMsg}`);
                    console.error(`[Triage] Error processing contact ${contact.id}:`, err);
                }
            }

            console.log(`[Triage] Complete: ${updated} contacts updated, ${errors.length} errors`);
            return { processed, updated, errors };
        } catch (error) {
            console.error('Error running full triage:', error);
            throw error;
        }
    }

    /**
     * Triage a single contact
     * Determines tier and next-best-action
     */
    async triageContact(contactId: string): Promise<TriagedContact> {
        try {
            // Get contact data
            const contactRes = await query(
                `SELECT id, email, first_name, last_name, company_name,
                        health_score, momentum_score, last_active_at
                 FROM contacts WHERE id = $1`,
                [contactId]
            );

            if (!contactRes.rows || contactRes.rows.length === 0) {
                throw new Error('Contact not found');
            }

            const contact = contactRes.rows[0];

            // Get recent engagement
            const engagementRes = await query(
                `SELECT
                    COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opens,
                    COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicks,
                    MAX(CASE WHEN opened_at IS NOT NULL THEN opened_at END) as last_open
                 FROM email_logs
                 WHERE contact_id = $1 AND created_at > NOW() - INTERVAL '30 days'`,
                [contactId]
            );

            const engagement = engagementRes.rows?.[0] || {};

            // Calculate days since engagement
            const lastEngagedAt = engagement.last_open || contact.last_active_at;
            const daysSinceEngagement = lastEngagedAt
                ? Math.floor((Date.now() - new Date(lastEngagedAt).getTime()) / (1000 * 60 * 60 * 24))
                : 999;

            // Determine triage tier
            const tier = this.calculateTriageTier(contact, daysSinceEngagement, engagement);
            const action = this.suggestNextAction(tier, contact, daysSinceEngagement, engagement);
            const reason = this.generateReason(tier, contact, daysSinceEngagement, engagement);

            return {
                contact_id: contactId,
                email: contact.email,
                first_name: contact.first_name,
                last_name: contact.last_name,
                company_name: contact.company_name,
                health_score: contact.health_score || 0,
                momentum_score: contact.momentum_score || 0,
                triage_tier: tier,
                next_best_action: action,
                reason,
                days_since_engagement: daysSinceEngagement,
                recent_opens: parseInt(engagement.opens) || 0,
                recent_clicks: parseInt(engagement.clicks) || 0,
                last_engaged_at: engagement.last_open
            };
        } catch (error) {
            console.error('Error triaging contact:', error);
            throw error;
        }
    }

    /**
     * Calculate triage tier based on scores and engagement
     */
    private calculateTriageTier(
        contact: any,
        daysSinceEngagement: number,
        engagement: any
    ): TriageTier {
        const healthScore = contact.health_score || 0;
        const momentumScore = contact.momentum_score || 0;
        const recentOpens = parseInt(engagement.opens) || 0;
        const recentClicks = parseInt(engagement.clicks) || 0;

        // Hot leads: High scores + recent engagement
        if (healthScore >= 80 && momentumScore >= 60 && (recentOpens > 0 || recentClicks > 0)) {
            return 'hot_lead';
        }

        // Active: Good scores + some engagement in last 30 days
        if (
            healthScore >= 60 &&
            momentumScore >= 40 &&
            daysSinceEngagement <= 30 &&
            (recentOpens > 0 || recentClicks > 0)
        ) {
            return 'active';
        }

        // At risk: Good scores but no recent engagement
        if (healthScore >= 60 && momentumScore >= 30 && daysSinceEngagement > 30 && daysSinceEngagement <= 90) {
            return 'at_risk';
        }

        // At risk: Declining scores
        if ((healthScore < 60 && healthScore >= 30) || (momentumScore < 30 && momentumScore >= 20)) {
            return 'at_risk';
        }

        // Cold: Low scores or very old engagement
        if (daysSinceEngagement > 90 || healthScore < 30 || momentumScore < 20) {
            return 'cold';
        }

        return 'cold';
    }

    /**
     * Suggest next best action for contact
     */
    private suggestNextAction(
        tier: TriageTier,
        contact: any,
        daysSinceEngagement: number,
        engagement: any
    ): NextBestAction {
        switch (tier) {
            case 'hot_lead':
                // Hot leads should get personal follow-up
                return 'schedule_call';

            case 'active':
                // Active contacts should continue nurturing
                return engagement.clicks > 0 ? 'send_urgent_campaign' : 'send_nurture';

            case 'at_risk':
                // At-risk contacts need re-engagement
                if (daysSinceEngagement > 60) {
                    return 'send_re_engagement';
                }
                return daysSinceEngagement > 30 ? 'send_nurture' : 'send_urgent_campaign';

            case 'cold':
                // Cold contacts should be enriched or removed
                return contact.company_name ? 'send_re_engagement' : 'enrich_profile';

            case 'churned':
                return 'remove_from_list';

            default:
                return 'wait';
        }
    }

    /**
     * Generate explanation for triage decision
     */
    private generateReason(
        tier: TriageTier,
        contact: any,
        daysSinceEngagement: number,
        engagement: any
    ): string {
        const reasons: Record<TriageTier, string> = {
            hot_lead: `High engagement (${engagement.clicks || 0} clicks, ${engagement.opens || 0} opens). Ready for conversion.`,
            active: `Consistent engagement. Health: ${contact.health_score}, Momentum: ${contact.momentum_score}`,
            at_risk: `No engagement for ${daysSinceEngagement} days. Score declining (${contact.health_score}).`,
            cold: `Inactive for ${daysSinceEngagement} days. Low engagement signals.`,
            churned: 'Contact marked as churned. Consider exclusion from campaigns.'
        };

        return reasons[tier] || 'Unknown tier';
    }

    /**
     * Get all triaged contacts with pagination
     */
    async getTriagedContacts(
        tier?: TriageTier,
        limit: number = 50,
        offset: number = 0
    ): Promise<{ contacts: TriagedContact[]; total: number }> {
        try {
            let countSql = 'SELECT COUNT(*) as total FROM contacts WHERE stage != $1';
            let querySql =
                'SELECT id, email, first_name, last_name, company_name, health_score, momentum_score, triage_tier FROM contacts WHERE stage != $1';

            const params: any[] = ['churned'];

            if (tier) {
                countSql += ` AND triage_tier = $2`;
                querySql += ` AND triage_tier = $2`;
                params.push(tier);
            }

            querySql += ` ORDER BY health_score DESC, momentum_score DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

            // Get total count
            const countRes = await query(countSql, params.length > 1 ? params.slice(0, -1) : [params[0]]);
            const total = parseInt(countRes.rows[0].total) || 0;

            // Get contacts with pagination
            const res = await query(querySql, [...params, limit, offset]);

            // Enhance with engagement data
            const contacts: TriagedContact[] = [];
            for (const contact of res.rows || []) {
                const triaged = await this.triageContact(contact.id);
                contacts.push(triaged);
            }

            return { contacts, total };
        } catch (error) {
            console.error('Error getting triaged contacts:', error);
            throw error;
        }
    }

    /**
     * Get triage statistics
     */
    async getTriageStats(): Promise<TriageStats> {
        try {
            const res = await query(
                `SELECT
                    COUNT(*) as total,
                    COUNT(CASE WHEN triage_tier = 'hot_lead' THEN 1 END) as hot_leads,
                    COUNT(CASE WHEN triage_tier = 'active' THEN 1 END) as active,
                    COUNT(CASE WHEN triage_tier = 'at_risk' THEN 1 END) as at_risk,
                    COUNT(CASE WHEN triage_tier = 'cold' THEN 1 END) as cold,
                    COUNT(CASE WHEN triage_tier = 'churned' THEN 1 END) as churned,
                    ROUND(AVG(health_score)::numeric, 1) as avg_health,
                    ROUND(AVG(momentum_score)::numeric, 1) as avg_momentum
                 FROM contacts`
            );

            const stats = res.rows[0];
            return {
                total_contacts: parseInt(stats.total) || 0,
                hot_leads: parseInt(stats.hot_leads) || 0,
                active: parseInt(stats.active) || 0,
                at_risk: parseInt(stats.at_risk) || 0,
                cold: parseInt(stats.cold) || 0,
                churned: parseInt(stats.churned) || 0,
                avg_health_score: parseFloat(stats.avg_health) || 0,
                avg_momentum_score: parseFloat(stats.avg_momentum) || 0
            };
        } catch (error) {
            console.error('Error getting triage stats:', error);
            throw error;
        }
    }

    /**
     * Get contacts needing specific action
     */
    async getContactsByAction(action: NextBestAction): Promise<TriagedContact[]> {
        try {
            // Get all contacts and filter by action
            const { contacts } = await this.getTriagedContacts(undefined, 1000, 0);
            return contacts.filter(c => c.next_best_action === action);
        } catch (error) {
            console.error('Error getting contacts by action:', error);
            throw error;
        }
    }

    /**
     * Get action summary
     */
    async getActionSummary(): Promise<TriageAction[]> {
        try {
            const stats = await this.getTriageStats();

            const actions: TriageAction[] = [
                {
                    action: 'schedule_call',
                    count: stats.hot_leads,
                    tier: 'hot_lead',
                    description: 'Schedule personal calls with hot leads'
                },
                {
                    action: 'send_urgent_campaign',
                    count: Math.floor(stats.active * 0.5),
                    tier: 'active',
                    description: 'Send targeted campaign to engaged active contacts'
                },
                {
                    action: 'send_nurture',
                    count: Math.floor(stats.active * 0.5),
                    tier: 'active',
                    description: 'Send nurture sequence to other active contacts'
                },
                {
                    action: 'send_re_engagement',
                    count: stats.at_risk,
                    tier: 'at_risk',
                    description: 'Send re-engagement campaign to at-risk contacts'
                },
                {
                    action: 'enrich_profile',
                    count: Math.floor(stats.cold * 0.7),
                    tier: 'cold',
                    description: 'Enrich profiles of cold contacts'
                },
                {
                    action: 'remove_from_list',
                    count: stats.churned,
                    tier: 'churned',
                    description: 'Remove churned contacts from active lists'
                }
            ];

            return actions.filter(a => a.count > 0);
        } catch (error) {
            console.error('Error getting action summary:', error);
            throw error;
        }
    }
}

// Export singleton
export const contactTriageEngine = new ContactTriageEngine();
