import { query, getClient, queryClient, withTransaction } from '@/lib/db';
import { emailClient } from '@/lib/email';
import { eventLoggingEngine } from '@/intelligence/EventLoggingEngine';
import { PoolClient } from 'pg';

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
                COUNT(*) FILTER (WHERE status = 'sent') as total_sent,
                COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
                COUNT(*) FILTER (WHERE status = 'pending') as total_pending,
                SUM(CASE WHEN status = 'opened' THEN 1 ELSE 0 END) as open_count,
                SUM(CASE WHEN status = 'clicked' THEN 1 ELSE 0 END) as click_count
            FROM email_logs
            WHERE campaign_id = $1
        `, [campaignId]);

        const row = res.rows[0];
        const totalSent = parseInt(row.total_sent) || 0;
        const totalFailed = parseInt(row.total_failed) || 0;
        const totalPending = parseInt(row.total_pending) || 0;
        const openCount = parseInt(row.open_count) || 0;
        const clickCount = parseInt(row.click_count) || 0;

        return {
            totalSent,
            totalFailed,
            totalPending,
            openCount,
            openRate: totalSent > 0 ? ((openCount / totalSent) * 100).toFixed(1) + '%' : '0%',
            clickCount,
            clickRate: totalSent > 0 ? ((clickCount / totalSent) * 100).toFixed(1) + '%' : '0%'
        };
    }

    // Execution
    async executeCampaign(campaignId: string): Promise<{
        success: boolean;
        sentCount: number;
        failedCount: number;
        status: string;
        failedRecipients: Array<{ email: string; error: string }>;
    }> {
        const campaign = await this.getCampaign(campaignId);
        if (!campaign) throw new Error('Campaign not found');

        // Fetch recipients (In a real app, this would use segments)
        const contactsRes = await query('SELECT * FROM contacts WHERE stage != $1', ['churned']);
        const contacts = contactsRes.rows;

        console.log(`Starting campaign ${campaign.name} for ${contacts.length} contacts.`);

        // Use transaction for atomic execution
        return withTransaction(async (client: PoolClient) => {
            // Mark campaign as IN_PROGRESS
            await queryClient(
                client,
                'UPDATE campaigns SET status = $1, started_at = NOW() WHERE id = $2',
                ['in_progress', campaignId]
            );

            // Track recipients for event logging
            const sentRecipients: Array<{ email: string; contact_id: string }> = [];
            const failedRecipients: Array<{ email: string; error: string }> = [];

            // Send emails one by one, tracking successes and failures
            for (const contact of contacts) {
                let logId: string | null = null;

                try {
                    // 1. Create log entry as PENDING
                    const logRes = await queryClient(
                        client,
                        `INSERT INTO email_logs (campaign_id, contact_id, sender, recipient, status, created_at)
                         VALUES ($1, $2, $3, $4, $5, NOW())
                         RETURNING id`,
                        [campaignId, contact.id, 'noreply@founderos.local', contact.email, 'pending']
                    );
                    logId = logRes.rows[0].id;

                    // 2. Actually send the email
                    const compiledBody = this.compileTemplate(campaign.body, contact);
                    await emailClient.sendEmail({
                        from: `noreply@founderos.local`, // Should be fetched from domain config
                        to: contact.email,
                        subject: campaign.subject,
                        body: compiledBody
                    }, logId);

                    // 3. Update log to SENT only if actually sent
                    await queryClient(
                        client,
                        'UPDATE email_logs SET status = $1, sent_at = NOW() WHERE id = $2',
                        ['sent', logId]
                    );

                    // Track successful send
                    sentRecipients.push({
                        email: contact.email,
                        contact_id: contact.id
                    });

                } catch (sendError: any) {
                    // Mark email log as FAILED with error message
                    if (logId) {
                        try {
                            await queryClient(
                                client,
                                `UPDATE email_logs
                                 SET status = $1, error_message = $2, failed_at = NOW()
                                 WHERE id = $3`,
                                ['failed', sendError.message || 'Unknown error', logId]
                            );
                        } catch (updateErr) {
                            console.error('Failed to update email log status:', updateErr);
                        }
                    }

                    failedRecipients.push({
                        email: contact.email,
                        error: sendError.message || 'Unknown error'
                    });

                    console.error(`Failed to send email to ${contact.email}:`, sendError.message);
                }
            }

            // Determine final campaign status
            const hasFailures = failedRecipients.length > 0;
            const finalStatus = sentRecipients.length === 0 ? 'failed' :
                               hasFailures ? 'completed_with_failures' :
                               'completed';

            // Update campaign with final status and counts
            await queryClient(
                client,
                `UPDATE campaigns
                 SET status = $1,
                     sent_count = $2,
                     failed_count = $3,
                     completed_at = NOW()
                 WHERE id = $4`,
                [finalStatus, sentRecipients.length, failedRecipients.length, campaignId]
            );

            // Log campaign sends to event logging system (if any succeeded)
            if (sentRecipients.length > 0) {
                try {
                    await eventLoggingEngine.logCampaignSends(campaignId, sentRecipients);
                    console.log(`Event logged: ${sentRecipients.length} campaign sends recorded`);
                } catch (err) {
                    console.error('Failed to log campaign sends to event system:', err);
                    // Don't throw - this is non-critical logging
                }
            }

            // Return results
            return {
                success: sentRecipients.length > 0,
                sentCount: sentRecipients.length,
                failedCount: failedRecipients.length,
                status: finalStatus,
                failedRecipients
            };
        }).catch((error) => {
            // On transaction failure, mark campaign as FAILED
            query(
                'UPDATE campaigns SET status = $1, error_message = $2, failed_at = NOW() WHERE id = $3',
                ['failed', error.message, campaignId]
            ).catch(err => console.error('Failed to update campaign error state:', err));

            throw error;
        });
    }

    // Transactional emails
    async sendTransactional(campaignId: string, contactId: string, data: any): Promise<{
        success: boolean;
        logId: string;
        error?: string;
    }> {
        const campaign = await this.getCampaign(campaignId);
        const contactRes = await query('SELECT * FROM contacts WHERE id = $1', [contactId]);
        const contact = contactRes.rows[0];

        if (!campaign || !contact) throw new Error('Campaign or Contact not found');

        let logId: string | null = null;

        try {
            // 1. Create log entry as PENDING
            const logRes = await query(
                `INSERT INTO email_logs (campaign_id, contact_id, sender, recipient, status, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())
                 RETURNING id`,
                [campaignId, contactId, 'system@founderos.local', contact.email, 'pending']
            );
            logId = logRes.rows[0].id;

            // 2. Send the email
            const compiledBody = this.compileTemplate(campaign.body, { ...contact, ...data });
            await emailClient.sendEmail({
                from: `system@founderos.local`,
                to: contact.email,
                subject: campaign.subject,
                body: compiledBody
            }, logId);

            // 3. Update log to SENT only if actually sent
            await query(
                'UPDATE email_logs SET status = $1, sent_at = NOW() WHERE id = $2',
                ['sent', logId]
            );

            return { success: true, logId };

        } catch (sendError: any) {
            // Mark log as FAILED if we created one
            if (logId) {
                try {
                    await query(
                        `UPDATE email_logs
                         SET status = $1, error_message = $2, failed_at = NOW()
                         WHERE id = $3`,
                        ['failed', sendError.message || 'Unknown error', logId]
                    );
                } catch (updateErr) {
                    console.error('Failed to update transactional email log:', updateErr);
                }
            }

            throw sendError;
        }
    }

    private compileTemplate(template: string, data: any): string {
        return template.replace(/\{\{(.*?)\}\}/g, (match, key) => {
            return data[key.trim()] || match;
        });
    }
}

export const campaignEngine = new CampaignEngine();
