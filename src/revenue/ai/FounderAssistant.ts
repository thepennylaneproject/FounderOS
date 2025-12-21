import { query } from '@/lib/db';

export interface DailyBrief {
    mustDo: any[];
    opportunities: any[];
    tasks: any[];
    insights: any[];
    suggestedFocus: string;
}

export interface Suggestion {
    type: string;
    action: string;
    reasoning: string;
    impact: string;
}

export class AIFounderAssistant {
    // Context-aware Email Drafting
    async generateEmailDraft(contactId: string, intent: string): Promise<{ subject: string; body: string }> {
        const contactRes = await query('SELECT * FROM contacts WHERE id = $1', [contactId]);
        const contact = contactRes.rows[0];

        if (!contact) throw new Error('Contact not found');

        // Mock LLM Prompt Construction
        const prompt = `
            Intent: ${intent}
            Recipient: ${contact.first_name} ${contact.last_name}
            Company: ${contact.company_name}
            Industry: ${contact.industry}
            Current Stage: ${contact.stage}
            Health Score: ${contact.health_score}
        `;

        console.log('Generating AI Draft with prompt:', prompt);

        // Simulated LLM Response based on Intent
        let subject = "";
        let body = "";

        if (intent === 'outreach') {
            subject = `Quick question regarding ${contact.company_name}`;
            body = `Hi ${contact.first_name},\n\nI've been following ${contact.company_name}'s work in the ${contact.industry} space. Given your current stage as a ${contact.stage}, I thought you might find our founder tools helpful for scaling your email infrastructure.\n\nBest,\nFounderOS AI`;
        } else if (intent === 'follow-up') {
            subject = `Following up: Next steps for ${contact.company_name}`;
            body = `Hi ${contact.first_name},\n\nJust wanted to circle back on our previous conversation. I noticed your health score is currently at ${contact.health_score}, which is great. How can we help you reach that next milestone?\n\nBest,\nFounderOS AI`;
        } else {
            subject = `FounderOS Update`;
            body = `Hello ${contact.first_name},\n\nThis is an AI-generated message regarding your account settings.`;
        }

        return { subject, body };
    }

    // Daily Briefing
    async generateDailyBriefing(): Promise<DailyBrief> {
        const fires = await query("SELECT * FROM contacts WHERE health_score < 30");
        const deals = await query("SELECT * FROM contacts WHERE stage = 'prospect'");

        const fireCount = fires.rowCount ?? 0;
        const dealCount = deals.rowCount ?? 0;

        return {
            mustDo: fires.rows.map(f => ({ action: `Rescue ${f.email}`, impact: 'high' })),
            opportunities: deals.rows.map(d => ({ action: `Close ${d.company_name}`, impact: 'medium' })),
            tasks: [],
            insights: [`You have ${fireCount} at-risk customers.`, `Pipeline value is growing in ${deals.rows[0]?.industry || 'tech'} sector.`],
            suggestedFocus: fireCount > 0 ? 'Customer Success' : 'New Business'
        };
    }

    async suggestNextActions(): Promise<Suggestion[]> {
        const res = await query("SELECT * FROM contacts WHERE health_score > 80 AND stage = 'lead'");
        return res.rows.map(c => ({
            type: 'outreach',
            action: `Convert ${c.first_name} (${c.company_name})`,
            reasoning: `High health score (${c.health_score}) suggests they are ready to buy.`,
            impact: 'high'
        }));
    }
}

export const assistant = new AIFounderAssistant();