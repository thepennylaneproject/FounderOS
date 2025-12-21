'use server';

import pool from '@/lib/db';

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
    const query = `
        WITH engagement AS (
            SELECT 
                c.id as contact_id,
                c.email,
                c.first_name,
                c.last_name,
                c.company_name,
                c.health_score,
                COUNT(CASE WHEN el.event_type = 'open' AND el.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_opens,
                COUNT(CASE WHEN el.event_type = 'click' AND el.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_clicks,
                COALESCE(EXTRACT(DAY FROM NOW() - MAX(el.created_at)), 30) as days_since_last,
                STRING_AGG(DISTINCT 
                    CASE WHEN el.event_type = 'open' AND el.created_at > NOW() - INTERVAL '3 days' 
                    THEN LOWER(cam.name) END, ', '
                ) as recent_campaign_names
            FROM contacts c
            LEFT JOIN email_logs el ON c.email = el.recipient
            LEFT JOIN campaigns cam ON el.campaign_id = cam.id
            ${contactId ? 'WHERE c.id = $1' : ''}
            GROUP BY c.id, c.email, c.first_name, c.last_name, c.company_name, c.health_score
        )
        SELECT 
            contact_id,
            email,
            first_name,
            last_name,
            company_name,
            health_score,
            recent_opens,
            recent_clicks,
            days_since_last,
            recent_campaign_names,
            CASE 
                WHEN days_since_last = 0 THEN (recent_opens * 2 + recent_clicks * 5)
                ELSE (recent_opens * 2 + recent_clicks * 5)::float / days_since_last
            END as momentum_score
        FROM engagement
        ORDER BY momentum_score DESC
    `;

    const result = await pool.query(query, contactId ? [contactId] : []);

    return result.rows.map(row => {
        let closerSignal: string | null = null;

        if (row.recent_campaign_names) {
            for (const keyword of CLOSER_KEYWORDS) {
                if (row.recent_campaign_names.includes(keyword)) {
                    closerSignal = `Engaged with ${keyword} content`;
                    break;
                }
            }
        }

        if (row.health_score > 70 && row.recent_opens >= 2) {
            closerSignal = closerSignal || 'High engagement pattern detected';
        }

        return {
            contactId: row.contact_id,
            email: row.email,
            firstName: row.first_name,
            lastName: row.last_name,
            companyName: row.company_name,
            healthScore: row.health_score || 50,
            momentumScore: Math.round(row.momentum_score * 10) / 10,
            recentOpens: row.recent_opens || 0,
            recentClicks: row.recent_clicks || 0,
            daysSinceLastContact: Math.round(row.days_since_last),
            isHotLead: row.momentum_score >= HOT_LEAD_THRESHOLD,
            closerSignal
        };
    });
}

export async function getMomentumInsights(): Promise<MomentumInsight> {
    const allContacts = await calculateMomentum();

    return {
        hotLeads: allContacts.filter(c => c.isHotLead).slice(0, 5),
        slippingTargets: allContacts.filter(c => c.healthScore < SLIPPING_THRESHOLD).slice(0, 5),
        closerOpportunities: allContacts.filter(c => c.closerSignal !== null).slice(0, 5)
    };
}
