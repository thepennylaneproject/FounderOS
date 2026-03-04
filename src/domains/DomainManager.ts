import supabase from '@/lib/supabase';
import * as dns from 'dns/promises';

export interface DomainHealth {
    spf: boolean;
    dkim: boolean;
    dmarc: boolean;
    spfRecord?: string;
    dkimRecord?: string;
    dmarcRecord?: string;
    errors: {
        spf?: string;
        dkim?: string;
        dmarc?: string;
    };
    blacklists: string[];
    reputation: number;
}

export interface DomainConfig {
    domain: string;
    dkimKey?: string;
    spfRecord?: string;
    dmarcPolicy?: string;
    dailyLimit?: number;
}

export class DomainManager {
    async addDomain(config: DomainConfig): Promise<void> {
        const { error } = await supabase
            .from('email_domains')
            .upsert({
                domain: config.domain,
                dkim_private_key: config.dkimKey,
                spf_record: config.spfRecord,
                dmarc_policy: config.dmarcPolicy,
                daily_limit: config.dailyLimit || 50,
                is_verified: false,
                updated_at: new Date().toISOString()
            }, { 
                onConflict: 'domain' 
            });

        if (error) throw error;
        console.log(`Domain ${config.domain} configured.`);
    }

    async getDomain(domain: string) {
        const { data, error } = await supabase
            .from('email_domains')
            .select('*')
            .eq('domain', domain)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    async getAllDomains() {
        const { data, error } = await supabase
            .from('email_domains')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    }

    async validateDomain(domain: string): Promise<DomainHealth> {
        const errors: DomainHealth['errors'] = {};
        
        const [spfResult, dmarcResult, dkimResult] = await Promise.all([
            this.checkSPF(domain),
            this.checkDMARC(domain),
            this.checkDKIM(domain)
        ]);

        const health: DomainHealth = {
            spf: spfResult.found,
            dkim: dkimResult.found,
            dmarc: dmarcResult.found,
            spfRecord: spfResult.value,
            dkimRecord: dkimResult.value,
            dmarcRecord: dmarcResult.value,
            errors,
            blacklists: [],
            reputation: 100
        };

        // Add error messages for missing records
        if (!spfResult.found) errors.spf = spfResult.error || 'SPF record not found';
        if (!dkimResult.found) errors.dkim = dkimResult.error || 'DKIM CNAME records not found';
        if (!dmarcResult.found) errors.dmarc = dmarcResult.error || 'DMARC record not found';

        // Update database with detected values
        const { error } = await supabase
            .from('email_domains')
            .update({ 
                is_verified: health.spf && health.dmarc && health.dkim,
                spf_record: spfResult.value || null,
                dkim_private_key: dkimResult.value || null,
                dmarc_policy: dmarcResult.value || null,
                updated_at: new Date().toISOString()
            })
            .eq('domain', domain);

        if (error) throw error;
        return health;
    }

    private async checkSPF(domain: string): Promise<{ found: boolean; value?: string; error?: string }> {
        try {
            const txtRecords = await dns.resolveTxt(domain);
            const spfRecord = txtRecords.find(records => records.some(record => record.includes('v=spf1')));
            if (spfRecord) {
                return { found: true, value: spfRecord.join('') };
            }
            return { found: false, error: 'No SPF record found in DNS' };
        } catch (error: any) {
            return { found: false, error: `DNS lookup failed: ${error.message}` };
        }
    }

    private async checkDMARC(domain: string): Promise<{ found: boolean; value?: string; error?: string }> {
        try {
            const txtRecords = await dns.resolveTxt(`_dmarc.${domain}`);
            const dmarcRecord = txtRecords.find(records => records.some(record => record.includes('v=DMARC1')));
            if (dmarcRecord) {
                return { found: true, value: dmarcRecord.join('') };
            }
            return { found: false, error: 'No DMARC record found at _dmarc subdomain' };
        } catch (error: any) {
            return { found: false, error: `DNS lookup failed: ${error.message}` };
        }
    }

    private async checkDKIM(domain: string): Promise<{ found: boolean; value?: string; error?: string }> {
        try {
            // SendGrid standard uses s1 and s2 selectors
            const [s1, s2] = await Promise.all([
                dns.resolveCname(`s1._domainkey.${domain}`).catch(() => null),
                dns.resolveCname(`s2._domainkey.${domain}`).catch(() => null)
            ]);
            
            if (s1 && s1.length > 0 && s2 && s2.length > 0) {
                return { found: true, value: s1[0] };
            }
            
            if (!s1 && !s2) {
                return { found: false, error: 'DKIM CNAME records not found (s1._domainkey and s2._domainkey). Ensure SendGrid domain authentication is complete.' };
            }
            
            if (!s1) {
                return { found: false, error: 's1._domainkey CNAME not found' };
            }
            
            return { found: false, error: 's2._domainkey CNAME not found' };
        } catch (error: any) {
            return { found: false, error: `DNS lookup failed: ${error.message}` };
        }
    }
}

export const domainManager = new DomainManager();