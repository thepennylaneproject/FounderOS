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
    // Get domains from email_domains table (not 'domains')
    let domainsQuery = supabase.from('email_domains').select('*');
    if (domain) {
        domainsQuery = domainsQuery.eq('domain', domain); // Column name is 'domain' not 'name'
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
        const hasDKIM = !!row.dkim_private_key; // Fixed: use dkim_private_key
        const hasDMARC = !!row.dmarc_policy;

        // Filter logs for this domain
        const domainLogs = logs.filter(l => l.sender?.endsWith(`@${row.domain}`)); // Fixed: use row.domain
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
            recommendations.push('Missing SPF record. Click to expand SPF section above for setup instructions.');
        }
        if (!hasDKIM) {
            score -= 25;
            recommendations.push('Missing DKIM authentication. Complete SendGrid domain authentication to add DKIM CNAME records.');
        }
        if (!hasDMARC) {
            score -= 15;
            recommendations.push('Missing DMARC policy. Click to expand DMARC section above for setup instructions.');
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

        // Check if domain was recently added (within 48 hours)
        const createdAt = new Date(row.created_at);
        const hoursSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
        
        if (recommendations.length === 0) {
            recommendations.push('All systems nominal - your domain is fully configured');
        } else if (hoursSinceCreated < 48 && (!hasSPF || !hasDKIM || !hasDMARC)) {
            recommendations.unshift('Note: DNS changes can take 24-48 hours to propagate worldwide.');
        }

        return {
            domain: row.domain, // Fixed: use row.domain
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
