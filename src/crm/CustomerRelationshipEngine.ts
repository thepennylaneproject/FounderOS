import { query } from '@/lib/db';
import { workflowAutomation } from '@/automation/WorkflowEngine';

export interface Company { name: string; size: string; industry: string; employees: number; revenue: number; funding: string; }
export interface Contact { id: string; email: string; first_name?: string; last_name?: string; company_name?: string; stage?: string; health_score?: number; }
export interface LeadScore { score: number; reasoning: string; nextBestAction: string; }

export class ModernCRM {
    // Intelligent Lead Scoring
    async scoreLead(contactId: string): Promise<LeadScore> {
        // Query engagement signals from logs
        const logs = await query(
            `SELECT status, count(*) FROM email_logs WHERE contact_id = $1 GROUP BY status`,
            [contactId]
        );

        let score = 50; // Base score
        let reasoning = "Baseline engagement.";

        const stats: Record<string, number> = {};
        logs.rows.forEach(r => stats[r.status] = parseInt(r.count));

        if (stats['opened']) score += 10 * stats['opened'];
        if (stats['clicked']) score += 20 * stats['clicked'];
        if (stats['bounced']) score -= 30;

        score = Math.min(100, Math.max(0, score));

        if (score > 80) reasoning = "High engagement detected across multiple channels.";
        else if (score < 30) reasoning = "Low response rate; needs re-engagement.";

        // Update DB
        await query('UPDATE contacts SET health_score = $1 WHERE id = $2', [score, contactId]);

        return {
            score,
            reasoning,
            nextBestAction: score > 70 ? "Personal outreach suggested." : "Continue automated nurturing."
        };
    }

    // Automated Enrichment (Mock)
    async enrichContact(id: string): Promise<void> {
        const res = await query('SELECT email FROM contacts WHERE id = $1', [id]);
        const email = res.rows[0]?.email;
        if (!email) return;

        // In a real app, call Clearbit/Apollo here
        const mockEnrichment = {
            company_name: email.split('@')[1].split('.')[0].toUpperCase(),
            industry: 'Technology',
            tags: ['enriched']
        };

        await query(
            `UPDATE contacts SET company_name = $1, industry = $2, tags = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
            [mockEnrichment.company_name, mockEnrichment.industry, mockEnrichment.tags, id]
        );
    }

    // ... CRUD ...

    // CRUD
    async createContact(contact: Partial<Contact>): Promise<string> {
        const res = await query(
            `INSERT INTO contacts (email, first_name, last_name, company_name, stage)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (email) DO UPDATE SET
             first_name = EXCLUDED.first_name,
             last_name = EXCLUDED.last_name,
             company_name = EXCLUDED.company_name,
             stage = EXCLUDED.stage,
             updated_at = CURRENT_TIMESTAMP
             RETURNING id`,
            [contact.email, contact.first_name, contact.last_name, contact.company_name, contact.stage || 'lead']
        );
        const id = res.rows[0].id;

        // Automated Workflow Trigger
        await workflowAutomation.trigger('contact.created', { contactId: id });

        await this.enrichContact(id); // Auto-enrich
        return id;
    }

    async getContact(id: string): Promise<Contact> {
        const res = await query('SELECT * FROM contacts WHERE id = $1', [id]);
        return res.rows[0];
    }

    async getAllContacts() {
        const res = await query('SELECT * FROM contacts ORDER BY created_at DESC');
        return res.rows;
    }

    async updateContact(id: string, updates: Partial<Contact>): Promise<Contact> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (updates.email !== undefined) {
            fields.push(`email = $${paramIndex++}`);
            values.push(updates.email);
        }
        if (updates.first_name !== undefined) {
            fields.push(`first_name = $${paramIndex++}`);
            values.push(updates.first_name);
        }
        if (updates.last_name !== undefined) {
            fields.push(`last_name = $${paramIndex++}`);
            values.push(updates.last_name);
        }
        if (updates.company_name !== undefined) {
            fields.push(`company_name = $${paramIndex++}`);
            values.push(updates.company_name);
        }
        if (updates.stage !== undefined) {
            fields.push(`stage = $${paramIndex++}`);
            values.push(updates.stage);
        }

        if (fields.length === 0) {
            return this.getContact(id);
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const res = await query(
            `UPDATE contacts SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );
        return res.rows[0];
    }

    async deleteContact(id: string): Promise<void> {
        await query('DELETE FROM email_logs WHERE contact_id = $1', [id]);
        await query('DELETE FROM contacts WHERE id = $1', [id]);
    }
}

export const modernCRM = new ModernCRM();