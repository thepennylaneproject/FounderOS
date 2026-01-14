import supabase from '@/lib/supabase';
import * as dns from 'dns/promises';

export interface DomainHealth {
    spf: boolean;
    dkim: boolean;
    dmarc: boolean;
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
        const [spf, dmarc, dkim] = await Promise.all([
            this.checkSPF(domain),
            this.checkDMARC(domain),
            this.checkDKIM(domain)
        ]);

        const health = {
            spf,
            dkim,
            dmarc,
            blacklists: [],
            reputation: 100
        };

        const { error } = await supabase
            .from('email_domains')
            .update({ 
                is_verified: health.spf && health.dmarc && health.dkim,
                updated_at: new Date().toISOString()
            })
            .eq('domain', domain);

        if (error) throw error;
        return health;
    }

    private async checkSPF(domain: string): Promise<boolean> {
        try {
            const txtRecords = await dns.resolveTxt(domain);
            return txtRecords.some(records => records.some(record => record.includes('v=spf1')));
        } catch {
            return false;
        }
    }

    private async checkDMARC(domain: string): Promise<boolean> {
        try {
            const txtRecords = await dns.resolveTxt(`_dmarc.${domain}`);
            return txtRecords.some(records => records.some(record => record.includes('v=DMARC1')));
        } catch {
            return false;
        }
    }

    private async checkDKIM(domain: string): Promise<boolean> {
        try {
            // SendGrid standard uses s1 and s2 selectors
            const s1 = await dns.resolveCname(`s1._domainkey.${domain}`);
            const s2 = await dns.resolveCname(`s2._domainkey.${domain}`);
            return s1.length > 0 && s2.length > 0;
        } catch {
            return false;
        }
    }
}

export const domainManager = new DomainManager();