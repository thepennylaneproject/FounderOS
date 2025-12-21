import { query } from '@/lib/db';
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
        // Persist to DB
        await query(
            `INSERT INTO domains (name, dkim_key, spf_record, dmarc_policy, daily_limit, status)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (name) DO UPDATE SET
             dkim_key = EXCLUDED.dkim_key,
             spf_record = EXCLUDED.spf_record,
             dmarc_policy = EXCLUDED.dmarc_policy,
             daily_limit = EXCLUDED.daily_limit,
             status = EXCLUDED.status,
             updated_at = CURRENT_TIMESTAMP`,
            [config.domain, config.dkimKey, config.spfRecord, config.dmarcPolicy, config.dailyLimit || 50, 'active']
        );

        // In a real scenario, we would trigger mailserver config here
        console.log(`Domain ${config.domain} configured.`);
    }

    async getDomain(domain: string) {
        const res = await query('SELECT * FROM domains WHERE name = $1', [domain]);
        return res.rows[0];
    }

    async getAllDomains() {
        const res = await query('SELECT * FROM domains ORDER BY created_at DESC');
        return res.rows;
    }

    async validateDomain(domain: string): Promise<DomainHealth> {
        const [spf, dmarc] = await Promise.all([
            this.checkSPF(domain),
            this.checkDMARC(domain)
        ]);

        const health = {
            spf,
            dkim: false, // Placeholder for more complex DKIM check
            dmarc,
            blacklists: [],
            reputation: 100
        };

        // Update health in DB
        await query(
            'UPDATE domains SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE name = $2',
            [health.spf && health.dmarc ? 'validated' : 'pending_dns', domain]
        );

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