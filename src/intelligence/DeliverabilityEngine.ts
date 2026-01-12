'use server';

import supabase from '@/lib/supabase';

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
    // Get domains
    let domainsQuery = supabase.from('domains').select('*');
    if (domain) {
        domainsQuery = domainsQuery.eq('name', domain);
    }
    
    const { data: domains, error: domainsError } = await domainsQuery;
    if (domainsError) throw domainsError;

    // Get email logs from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: emailLogs, error: logsError } = await supabase
        .from('email_logs')
        .select('sender, status, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

    if (logsError) throw logsError;

    const logs = emailLogs || [];

    return (domains || []).map((row) => {
        const hasSPF = !!row.spf_record;
        const hasDKIM = !!row.dkim_key;
        const hasDMARC = !!row.dmarc_policy;

        // Filter logs for this domain
        const domainLogs = logs.filter(l => l.sender?.endsWith(`@${row.name}`));
        const weeklyLogs = domainLogs.filter(l => new Date(l.created_at) >= sevenDaysAgo);
        const monthlyBounces = domainLogs.filter(l => l.status === 'bounced').length;

        const bounceRate = domainLogs.length > 0
            ? (monthlyBounces / domainLogs.length) * 100
            : 0;

        const sendingVelocity = weeklyLogs.length;

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
