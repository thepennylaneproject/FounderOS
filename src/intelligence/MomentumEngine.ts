'use server';

import supabase from '@/lib/supabase';

export interface ContactMomentum {
    contactId: string;
    email: string;
    firstName: string;
    lastName: string;
    companyName: string;
    healthScore: number;
    momentumScore: number;
    recentOpens: number;
    recentClicks: number;
    daysSinceLastContact: number;
    isHotLead: boolean;
    closerSignal: string | null;
}

export interface MomentumInsight {
    hotLeads: ContactMomentum[];
    slippingTargets: ContactMomentum[];
    closerOpportunities: ContactMomentum[];
}

const HOT_LEAD_THRESHOLD = 5;
const SLIPPING_THRESHOLD = 30;
const CLOSER_KEYWORDS = ['pricing', 'proposal', 'demo', 'contract', 'quote'];

export async function calculateMomentum(contactId?: string): Promise<ContactMomentum[]> {
    // Get contacts
    let contactsQuery = supabase.from('contacts').select('*');
    if (contactId) {
        contactsQuery = contactsQuery.eq('id', contactId);
    }
    const { data: contacts, error: contactsError } = await contactsQuery;
    if (contactsError) throw contactsError;

    // Get email logs from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: emailLogs, error: logsError } = await supabase
        .from('email_logs')
        .select('contact_id, campaign_id, opened_at, clicked_at, created_at');

    if (logsError) throw logsError;

    // Get campaigns for closer signal detection
    const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, name');

    if (campaignsError) throw campaignsError;

    const campaignMap = new Map((campaigns || []).map(c => [c.id, c.name]));

    return (contacts || []).map(contact => {
        const contactLogs = (emailLogs || []).filter(l => l.contact_id === contact.id);
        
        const recentOpens = contactLogs.filter(l => 
            l.opened_at && new Date(l.opened_at) >= sevenDaysAgo
        ).length;

        const recentClicks = contactLogs.filter(l => 
            l.clicked_at && new Date(l.clicked_at) >= sevenDaysAgo
        ).length;

        // Calculate days since last contact
        const lastActivity = contactLogs.reduce((latest, log) => {
            const date = log.opened_at || log.clicked_at || log.created_at;
            if (!date) return latest;
            const logDate = new Date(date);
            return logDate > latest ? logDate : latest;
        }, new Date(0));
        
        const daysSinceLastContact = lastActivity.getTime() === 0 
            ? 30 
            : Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

        // Calculate momentum score
        const momentumScore = daysSinceLastContact === 0 
            ? (recentOpens * 2 + recentClicks * 5)
            : (recentOpens * 2 + recentClicks * 5) / daysSinceLastContact;

        // Check for closer signals
        let closerSignal: string | null = null;
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const recentCampaignNames = contactLogs
            .filter(l => l.opened_at && new Date(l.opened_at) >= threeDaysAgo)
            .map(l => campaignMap.get(l.campaign_id)?.toLowerCase() || '')
            .filter(Boolean);

        for (const keyword of CLOSER_KEYWORDS) {
            if (recentCampaignNames.some(name => name.includes(keyword))) {
                closerSignal = `Engaged with ${keyword} content`;
                break;
            }
        }

        if ((contact.health_score || 0) > 70 && recentOpens >= 2) {
            closerSignal = closerSignal || 'High engagement pattern detected';
        }

        return {
            contactId: contact.id,
            email: contact.email,
            firstName: contact.first_name || '',
            lastName: contact.last_name || '',
            companyName: contact.company_name || '',
            healthScore: contact.health_score || 50,
            momentumScore: Math.round(momentumScore * 10) / 10,
            recentOpens,
            recentClicks,
            daysSinceLastContact,
            isHotLead: momentumScore >= HOT_LEAD_THRESHOLD,
            closerSignal
        };
    }).sort((a, b) => b.momentumScore - a.momentumScore);
}

export async function getMomentumInsights(): Promise<MomentumInsight> {
    const allContacts = await calculateMomentum();

    return {
        hotLeads: allContacts.filter(c => c.isHotLead).slice(0, 5),
        slippingTargets: allContacts.filter(c => c.healthScore < SLIPPING_THRESHOLD).slice(0, 5),
        closerOpportunities: allContacts.filter(c => c.closerSignal !== null).slice(0, 5)
    };
}
