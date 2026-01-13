import supabase from '@/lib/supabase';
import { workflowAutomation } from '@/automation/WorkflowEngine';

export interface Company { name: string; size: string; industry: string; employees: number; revenue: number; funding: string; }
export interface Contact { id: string; email: string; first_name?: string; last_name?: string; company_name?: string; stage?: string; health_score?: number; }
export interface LeadScore { score: number; reasoning: string; nextBestAction: string; }

export class ModernCRM {
    async scoreLead(contactId: string): Promise<LeadScore> {
        const { data: logs, error } = await supabase
            .from('email_logs')
            .select('status')
            .eq('contact_id', contactId);

        if (error) throw error;

        let score = 50;
        let reasoning = "Baseline engagement.";

        const stats: Record<string, number> = {};
        (logs || []).forEach(r => {
            stats[r.status] = (stats[r.status] || 0) + 1;
        });

        if (stats['opened']) score += 10 * stats['opened'];
        if (stats['clicked']) score += 20 * stats['clicked'];
        if (stats['bounced']) score -= 30;

        score = Math.min(100, Math.max(0, score));

        if (score > 80) reasoning = "High engagement detected across multiple channels.";
        else if (score < 30) reasoning = "Low response rate; needs re-engagement.";

        await supabase
            .from('contacts')
            .update({ health_score: score })
            .eq('id', contactId);

        return {
            score,
            reasoning,
            nextBestAction: score > 70 ? "Personal outreach suggested." : "Continue automated nurturing."
        };
    }

    async enrichContact(id: string): Promise<void> {
        const { data, error } = await supabase
            .from('contacts')
            .select('email')
            .eq('id', id)
            .single();

        if (error || !data?.email) return;

        const mockEnrichment = {
            company_name: data.email.split('@')[1].split('.')[0].toUpperCase(),
            industry: 'Technology',
            tags: ['enriched']
        };

        await supabase
            .from('contacts')
            .update({
                company_name: mockEnrichment.company_name,
                industry: mockEnrichment.industry,
                tags: mockEnrichment.tags,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
    }

    async createContact(contact: Partial<Contact>): Promise<string> {
        // Check for existing contact with this email
        const { data: existing } = await supabase
            .from('contacts')
            .select('id')
            .eq('email', contact.email)
            .maybeSingle();

        if (existing) {
            throw new Error('duplicate');
        }

        const { data, error } = await supabase
            .from('contacts')
            .insert({
                email: contact.email,
                first_name: contact.first_name,
                last_name: contact.last_name,
                company_name: contact.company_name,
                stage: contact.stage || 'lead',
                updated_at: new Date().toISOString()
            })
            .select('id')
            .single();

        if (error) throw error;
        const id = data.id;

        await workflowAutomation.trigger('contact.created', { contactId: id });
        await this.enrichContact(id);
        return id;
    }


    async getContact(id: string): Promise<Contact> {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    async getAllContacts() {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }
}

export const modernCRM = new ModernCRM();