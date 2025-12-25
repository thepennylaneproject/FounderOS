import { query } from '@/lib/db';
import { emailClient } from '@/lib/email';

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
        return res.rows;
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

            } catch (error) {
                console.error(`Failed to send campaign email to ${contact.email}:`, error);
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

    async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (updates.name !== undefined) {
            fields.push(`name = $${paramIndex++}`);
            values.push(updates.name);
        }
        if (updates.type !== undefined) {
            fields.push(`type = $${paramIndex++}`);
            values.push(updates.type);
        }
        if (updates.subject !== undefined) {
            fields.push(`subject = $${paramIndex++}`);
            values.push(updates.subject);
        }
        if (updates.body !== undefined) {
            fields.push(`body = $${paramIndex++}`);
            values.push(updates.body);
        }
        if (updates.status !== undefined) {
            fields.push(`status = $${paramIndex++}`);
            values.push(updates.status);
        }

        if (fields.length === 0) {
            return this.getCampaign(id);
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const res = await query(
            `UPDATE campaigns SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );
        return res.rows[0];
    }

    async deleteCampaign(id: string): Promise<void> {
        await query('DELETE FROM email_logs WHERE campaign_id = $1', [id]);
        await query('DELETE FROM campaigns WHERE id = $1', [id]);
    }
}

export const campaignEngine = new CampaignEngine();