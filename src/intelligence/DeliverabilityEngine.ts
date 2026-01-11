'use server';

import pool from '@/lib/db';

export interface DomainDeliverability {
    domain: string;
    hasSPF: boolean;
    hasDKIM: boolean;
    hasDMARC: boolean;
    sendingVelocity: number;
    bounceRate: number;
    inboxPlacementProbability: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
}

export async function calculateDeliverability(domain?: string): Promise<DomainDeliverability[]> {
    const domainsQuery = `
        SELECT 
            d.name,
            d.spf_record,
            d.dkim_key,
            d.dmarc_policy,
            d.daily_limit,
            COUNT(DISTINCT el.id) FILTER (WHERE el.created_at > NOW() - INTERVAL '7 days') as weekly_sends,
            COUNT(DISTINCT el.id) FILTER (WHERE el.status = 'bounced' AND el.created_at > NOW() - INTERVAL '30 days') as monthly_bounces,
            COUNT(DISTINCT el.id) FILTER (WHERE el.created_at > NOW() - INTERVAL '30 days') as monthly_sends
        FROM domains d
        LEFT JOIN email_logs el ON el.sender LIKE '%@' || d.name
        ${domain ? 'WHERE d.name = $1' : ''}
        GROUP BY d.name, d.spf_record, d.dkim_key, d.dmarc_policy, d.daily_limit
    `;

    const result = await pool.query(domainsQuery, domain ? [domain] : []);

    return result.rows.map((row: {
        name: string;
        spf_record: string | null;
        dkim_key: string | null;
        dmarc_policy: string | null;
        daily_limit: number;
        weekly_sends: number;
        monthly_bounces: number;
        monthly_sends: number;
    }) => {
        const hasSPF = !!row.spf_record;
        const hasDKIM = !!row.dkim_key;
        const hasDMARC = !!row.dmarc_policy;

        const bounceRate = row.monthly_sends > 0
            ? (row.monthly_bounces / row.monthly_sends) * 100
            : 0;

        const sendingVelocity = row.weekly_sends;

        // Calculate inbox placement probability
        let score = 100;
        const recommendations: string[] = [];

        if (!hasSPF) {
            score -= 25;
            recommendations.push('Add SPF record to improve authentication');
        }
        if (!hasDKIM) {
            score -= 25;
            recommendations.push('Configure DKIM signing for email integrity');
        }
        if (!hasDMARC) {
            score -= 15;
            recommendations.push('Implement DMARC policy for domain protection');
        }
        if (bounceRate > 5) {
            score -= 20;
            recommendations.push('Clean email list - bounce rate exceeds 5%');
        } else if (bounceRate > 2) {
            score -= 10;
            recommendations.push('Monitor bounce rate - currently above 2%');
        }
        if (sendingVelocity > (row.daily_limit * 7 * 0.8)) {
            score -= 10;
            recommendations.push('Approaching daily sending limit - consider domain rotation');
        }

        score = Math.max(0, Math.min(100, score));

        const riskLevel: 'low' | 'medium' | 'high' =
            score >= 80 ? 'low' :
                score >= 50 ? 'medium' : 'high';

        if (recommendations.length === 0) {
            recommendations.push('All systems nominal');
        }

        return {
            domain: row.name,
            hasSPF,
            hasDKIM,
            hasDMARC,
            sendingVelocity,
            bounceRate: Math.round(bounceRate * 10) / 10,
            inboxPlacementProbability: score,
            riskLevel,
            recommendations
        };
    });
}
