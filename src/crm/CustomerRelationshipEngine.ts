import { query } from '@/lib/db';
import { workflowAutomation } from '@/automation/WorkflowEngine';

export interface Company { name: string; size: string; industry: string; employees: number; revenue: number; funding: string; }
export interface Contact { id: string; email: string; first_name?: string; last_name?: string; company_name?: string; stage?: string; health_score?: number; }
export interface LeadScore { score: number; reasoning: string; nextBestAction: string; }

export class ModernCRM {
    // Intelligent Lead Scoring
    async scoreLead(contactId: string): Promise<LeadScore> {
        // Query all engagement signals from logs
        const logsRes = await query(
            `SELECT status, COUNT(*) as count FROM email_logs WHERE contact_id = $1 GROUP BY status`,
            [contactId]
        );

        // Calculate health score (overall engagement)
        let healthScore = 50; // Base score
        let reasoning = "Baseline engagement.";

        const stats: Record<string, number> = {};
        logsRes.rows.forEach(r => stats[r.status] = parseInt(r.count));

        if (stats['sent']) healthScore += 5; // Baseline for being contacted
        if (stats['opened']) healthScore += 10 * Math.min(stats['opened'], 3); // Opens matter most
        if (stats['clicked']) healthScore += 20 * Math.min(stats['clicked'], 2); // Clicks are strong signal
        if (stats['failed']) healthScore -= 15;
        if (stats['bounced']) healthScore -= 30;

        healthScore = Math.min(100, Math.max(0, healthScore));

        // Calculate momentum score (recent velocity)
        const recentEngagementRes = await query(
            `SELECT
                COUNT(CASE WHEN status = 'opened' AND sent_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_opens,
                COUNT(CASE WHEN status = 'clicked' AND sent_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_clicks,
                EXTRACT(DAY FROM NOW() - MAX(CASE WHEN sent_at IS NOT NULL THEN sent_at END)) as days_since_last
             FROM email_logs
             WHERE contact_id = $1`,
            [contactId]
        );

        const engagement = recentEngagementRes.rows[0];
        const recentOpens = parseInt(engagement.recent_opens) || 0;
        const recentClicks = parseInt(engagement.recent_clicks) || 0;
        const daysSinceLastContact = parseInt(engagement.days_since_last) || 30;

        // Momentum = recent engagement velocity (weighted by recency)
        let momentumScore = (recentOpens * 2 + recentClicks * 5);
        if (daysSinceLastContact < 30) {
            momentumScore = momentumScore / Math.max(1, daysSinceLastContact);
        }
        momentumScore = Math.round(momentumScore * 10) / 10; // Round to 1 decimal

        // Update reasoning based on scores
        if (healthScore > 80) reasoning = "High engagement detected across multiple channels.";
        else if (healthScore < 30) reasoning = "Low response rate; needs re-engagement.";
        else if (momentumScore >= 5) reasoning = "Active engagement momentum detected.";

        // Update DB with both health_score and momentum_score
        await query(
            `UPDATE contacts
             SET health_score = $1,
                 momentum_score = $2,
                 last_engagement_at = CASE
                    WHEN $3 IS NOT NULL THEN NOW() - INTERVAL '1 day' * $3
                    ELSE last_engagement_at
                 END
             WHERE id = $4`,
            [healthScore, momentumScore, daysSinceLastContact, contactId]
        );

        return {
            score: healthScore,
            reasoning,
            nextBestAction: momentumScore > 5
                ? "Personal outreach suggested (hot lead)."
                : healthScore > 70
                ? "Personal outreach suggested."
                : "Continue automated nurturing."
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
            `INSERT INTO contacts (email, first_name, last_name, company_name, stage, health_score)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (email) DO UPDATE SET
             first_name = EXCLUDED.first_name,
             last_name = EXCLUDED.last_name,
             company_name = EXCLUDED.company_name,
             stage = EXCLUDED.stage,
             updated_at = CURRENT_TIMESTAMP
             RETURNING id`,
            [contact.email, contact.first_name, contact.last_name, contact.company_name, contact.stage || 'lead', 100]
        );
        const id = res.rows[0].id;

        // Calculate score immediately (synchronous) before returning
        // This ensures the contact is complete when returned to the frontend
        try {
            await this.scoreLead(id);
        } catch (err) {
            console.error(`Failed to calculate score for contact ${id}:`, err);
            // Don't throw - contact is still created even if scoring fails
        }

        // Enrich contact in background (don't wait)
        this.enrichContact(id).catch(err =>
            console.error(`Failed to enrich contact ${id}:`, err)
        );

        // Trigger workflow in background (don't wait)
        workflowAutomation.trigger('contact.created', { contactId: id }).catch(err =>
            console.error(`Failed to trigger contact.created workflow for ${id}:`, err)
        );

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
}

export const modernCRM = new ModernCRM();