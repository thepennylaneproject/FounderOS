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
        // Fetch campaigns with metrics in a single query (no N+1)
        const res = await query(`
            SELECT
                c.*,
                COUNT(e.id) as total_sent,
                SUM(CASE WHEN e.status = 'opened' THEN 1 ELSE 0 END) as open_count,
                SUM(CASE WHEN e.status = 'clicked' THEN 1 ELSE 0 END) as click_count
            FROM campaigns c
            LEFT JOIN email_logs e ON c.id = e.campaign_id
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `);

        // Transform rows to include computed metrics
        return res.rows.map(row => {
            const totalSent = parseInt(row.total_sent || 0, 10);
            const openCount = parseInt(row.open_count || 0, 10);
            const clickCount = parseInt(row.click_count || 0, 10);

            return {
                id: row.id,
                name: row.name,
                type: row.type,
                subject: row.subject,
                body: row.body,
                status: row.status,
                scheduled_at: row.scheduled_at,
                created_at: row.created_at,
                updated_at: row.updated_at,
                metrics: {
                    totalSent,
                    openCount,
                    openRate: totalSent > 0 ? ((openCount / totalSent) * 100).toFixed(1) + '%' : '0%',
                    clickCount,
                    clickRate: totalSent > 0 ? ((clickCount / totalSent) * 100).toFixed(1) + '%' : '0%'
                }
            };
        });
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
        const totalSent = parseInt(row.total_sent || 0, 10);
        const openCount = parseInt(row.open_count || 0, 10);
        const clickCount = parseInt(row.click_count || 0, 10);

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

        // Resolve sender address from domain config or use default
        let senderAddress = process.env.MAIL_FROM_ADDRESS || 'noreply@founderos.local';
        if (campaign.domain_id) {
            try {
                const domainRes = await query(
                    'SELECT sender_address FROM domains WHERE id = $1',
                    [campaign.domain_id]
                );
                if (domainRes.rows[0]?.sender_address) {
                    senderAddress = domainRes.rows[0].sender_address;
                }
            } catch (err) {
                console.warn(`Failed to fetch sender address for domain ${campaign.domain_id}, using default`, err);
            }
        }

        // Don't update status yet - wait until sends complete
        // Fetch recipients (In a real app, this would use segments)
        const contacts = await query('SELECT * FROM contacts WHERE stage != $1', ['churned']);

        console.log(`Starting campaign ${campaign.name} for ${contacts.rowCount} contacts. Sender: ${senderAddress}`);

        // Track recipients for event logging
        const sentRecipients: Array<{ email: string; contact_id: string }> = [];
        const failedRecipients: Array<{ email: string; error: string }> = [];
        let successCount = 0;
        let failureCount = 0;

        for (const contact of contacts.rows) {
            try {
                // 1. Create log entry first to get an ID
                const logRes = await query(
                    `INSERT INTO email_logs (campaign_id, contact_id, sender, recipient, status)
                     VALUES ($1, $2, $3, $4, $5)
                     RETURNING id`,
                    [campaignId, contact.id, senderAddress, contact.email, 'sent']
                );
                const logId = logRes.rows[0].id;

                const compiledBody = this.compileTemplate(campaign.body, contact);
                await emailClient.sendEmail({
                    from: senderAddress,
                    to: contact.email,
                    subject: campaign.subject,
                    body: compiledBody
                }, logId);

                // Track successful send
                sentRecipients.push({
                    email: contact.email,
                    contact_id: contact.id
                });
                successCount++;

            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                console.error(`Failed to send campaign email to ${contact.email}:`, error);
                failedRecipients.push({
                    email: contact.email,
                    error: errorMsg
                });
                failureCount++;
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

        // Determine final status based on execution results
        let finalStatus: string;
        if (failureCount === 0) {
            // All sends succeeded
            finalStatus = 'completed';
        } else if (successCount > 0) {
            // Some sends succeeded, some failed
            finalStatus = 'partial';
            console.warn(`Campaign ${campaignId} completed with partial success: ${successCount} sent, ${failureCount} failed`);
        } else {
            // All sends failed
            finalStatus = 'failed';
            console.error(`Campaign ${campaignId} execution failed: all ${failureCount} sends failed`);
        }

        // Update campaign status ONLY after all sends have been attempted
        await query('UPDATE campaigns SET status = $1 WHERE id = $2', [finalStatus, campaignId]);
        console.log(`Campaign ${campaignId} execution complete. Final status: ${finalStatus}`);
    }

    // Transactional emails
    async sendTransactional(campaignId: string, contactId: string, data: any): Promise<void> {
        const campaign = await this.getCampaign(campaignId);
        const contactRes = await query('SELECT * FROM contacts WHERE id = $1', [contactId]);
        const contact = contactRes.rows[0];

        if (!campaign || !contact) throw new Error('Campaign or Contact not found');

        // Create log entry first
        const logRes = await query(
            `INSERT INTO email_logs (campaign_id, contact_id, sender, recipient, status)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [campaignId, contactId, 'system@founderos.local', contact.email, 'sent']
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
            const value = data[key.trim()];
            // Return value if defined and not null, otherwise empty string (not the template syntax)
            return value !== undefined && value !== null ? String(value) : '';
        });
    }
}

export const campaignEngine = new CampaignEngine();
