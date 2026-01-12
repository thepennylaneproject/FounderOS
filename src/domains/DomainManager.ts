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
            .from('domains')
            .upsert({
                name: config.domain,
                dkim_key: config.dkimKey,
                spf_record: config.spfRecord,
                dmarc_policy: config.dmarcPolicy,
                daily_limit: config.dailyLimit || 50,
                status: 'active',
                updated_at: new Date().toISOString()
            }, { 
                onConflict: 'name' 
            });

        if (error) throw error;
        console.log(`Domain ${config.domain} configured.`);
    }

    async getDomain(domain: string) {
        const { data, error } = await supabase
            .from('domains')
            .select('*')
            .eq('name', domain)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    async getAllDomains() {
        const { data, error } = await supabase
            .from('domains')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    }

    async validateDomain(domain: string): Promise<DomainHealth> {
        const [spf, dmarc] = await Promise.all([
            this.checkSPF(domain),
            this.checkDMARC(domain)
        ]);

        const health = {
            spf,
            dkim: false,
            dmarc,
            blacklists: [],
            reputation: 100
        };

        const { error } = await supabase
            .from('domains')
            .update({ 
                status: health.spf && health.dmarc ? 'validated' : 'pending_dns',
                updated_at: new Date().toISOString()
            })
            .eq('name', domain);

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
}

export const domainManager = new DomainManager();