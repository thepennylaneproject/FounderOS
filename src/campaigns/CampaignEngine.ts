import { query } from '@/lib/db';
import { emailClient } from '@/lib/email';
import { eventLoggingEngine } from '@/intelligence/EventLoggingEngine';

export interface UserSegment { id: string; name: string; }
export interface EmailTemplate { id: string; name: string; content?: string; subject?: string; }
export type CronExpression = string;
export interface EventTrigger { id: string; type: string; }
export interface ABTestConfig { id: string; criteria: string; }

export interface Campaign {
    id?: string;
    name: string;
    type: 'marketing' | 'transactional' | 'automated';
    domain_id?: string;
    subject: string;
    body: string;
    status?: string;
    scheduled_at?: Date;
    metrics?: {
        totalSent: number;
        openCount: number;
        openRate: string;
        clickCount: number;
        clickRate: string;
    };
}

export class CampaignEngine {
    // Management
    async createCampaign(config: Campaign): Promise<string> {
        const res = await query(
            `INSERT INTO campaigns (name, type, subject, body, status, scheduled_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [config.name, config.type, config.subject, config.body, config.status || 'draft', config.scheduled_at]
        );
        return res.rows[0].id;
    }

    async getCampaign(id: string): Promise<Campaign> {
        const res = await query('SELECT * FROM campaigns WHERE id = $1', [id]);
        return res.rows[0];
    }

    async getAllCampaigns() {
        const res = await query('SELECT * FROM campaigns ORDER BY created_at DESC');
        const campaigns = res.rows;

        // Enrich campaigns with metrics
        const enriched = await Promise.all(campaigns.map(async (campaign) => {
            const metrics = await this.getCampaignMetrics(campaign.id);
            return { ...campaign, metrics };
        }));

        return enriched;
    }

    private async getCampaignMetrics(campaignId: string) {
        const res = await query(`
            SELECT
                COUNT(*) as total_sent,
                SUM(CASE WHEN status = 'opened' THEN 1 ELSE 0 END) as open_count,
                SUM(CASE WHEN status = 'clicked' THEN 1 ELSE 0 END) as click_count
            FROM email_logs
            WHERE campaign_id = $1
        `, [campaignId]);

        const row = res.rows[0];
        const totalSent = parseInt(row.total_sent) || 0;
        const openCount = parseInt(row.open_count) || 0;
        const clickCount = parseInt(row.click_count) || 0;

        return {
            totalSent,
            openCount,
            openRate: totalSent > 0 ? ((openCount / totalSent) * 100).toFixed(1) + '%' : '0%',
            clickCount,
            clickRate: totalSent > 0 ? ((clickCount / totalSent) * 100).toFixed(1) + '%' : '0%'
        };
    }

    // Execution
    async executeCampaign(campaignId: string): Promise<void> {
        const campaign = await this.getCampaign(campaignId);
        if (!campaign) throw new Error('Campaign not found');

        // Update status
        await query('UPDATE campaigns SET status = $1 WHERE id = $2', ['active', campaignId]);

        // Fetch recipients (In a real app, this would use segments)
        const contacts = await query('SELECT * FROM contacts WHERE stage != $1', ['churned']);

        console.log(`Starting campaign ${campaign.name} for ${contacts.rowCount} contacts.`);

        // Track recipients for event logging
        const sentRecipients: Array<{ email: string; contact_id: string }> = [];

        for (const contact of contacts.rows) {
            try {
                // 1. Create log entry first to get an ID
                const logRes = await query(
                    `INSERT INTO email_logs (campaign_id, contact_id, status)
                     VALUES ($1, $2, $3)
                     RETURNING id`,
                    [campaignId, contact.id, 'sent']
                );
                const logId = logRes.rows[0].id;

                const compiledBody = this.compileTemplate(campaign.body, contact);
                await emailClient.sendEmail({
                    from: `noreply@founderos.local`, // Should be fetched from domain config
                    to: contact.email,
                    subject: campaign.subject,
                    body: compiledBody
                }, logId);

                // Track successful send
                sentRecipients.push({
                    email: contact.email,
                    contact_id: contact.id
                });

            } catch (error) {
                console.error(`Failed to send campaign email to ${contact.email}:`, error);
            }
        }

        // Log campaign sends to event logging system
        if (sentRecipients.length > 0) {
            try {
                await eventLoggingEngine.logCampaignSends(campaignId, sentRecipients);
                console.log(`Event logged: ${sentRecipients.length} campaign sends recorded`);
            } catch (err) {
                console.error('Failed to log campaign sends to event system:', err);
            }
        }

        // Complete campaign
        await query('UPDATE campaigns SET status = $1 WHERE id = $2', ['completed', campaignId]);
    }

    // Transactional emails
    async sendTransactional(campaignId: string, contactId: string, data: any): Promise<void> {
        const campaign = await this.getCampaign(campaignId);
        const contactRes = await query('SELECT * FROM contacts WHERE id = $1', [contactId]);
        const contact = contactRes.rows[0];

        if (!campaign || !contact) throw new Error('Campaign or Contact not found');

        // Create log entry first
        const logRes = await query(
            `INSERT INTO email_logs (campaign_id, contact_id, status)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [campaignId, contactId, 'sent']
        );
        const logId = logRes.rows[0].id;

        const compiledBody = this.compileTemplate(campaign.body, { ...contact, ...data });
        await emailClient.sendEmail({
            from: `system@founderos.local`,
            to: contact.email,
            subject: campaign.subject,
            body: compiledBody
        }, logId);
    }

    private compileTemplate(template: string, data: any): string {
        return template.replace(/\{\{(.*?)\}\}/g, (match, key) => {
            return data[key.trim()] || match;
        });
    }
}

export const campaignEngine = new CampaignEngine();