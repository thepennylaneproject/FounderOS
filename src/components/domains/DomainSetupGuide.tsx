'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, ExternalLink } from 'lucide-react';

interface DomainSetupGuideProps {
    domain: string;
    onComplete: () => void;
}

export const DomainSetupGuide: React.FC<DomainSetupGuideProps> = ({ domain, onComplete }) => {
    const [copiedRecord, setCopiedRecord] = useState<string | null>(null);

    const copyToClipboard = (text: string, recordType: string) => {
        navigator.clipboard.writeText(text);
        setCopiedRecord(recordType);
        setTimeout(() => setCopiedRecord(null), 2000);
    };

    const spfRecord = `v=spf1 include:sendgrid.net ~all`;
    const dmarcRecord = `v=DMARC1; p=quarantine; rua=mailto:admin@${domain}`;

    return (
        <div className="space-y-6">
            {/* Overview */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-sm flex gap-3">
                <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-sans font-bold text-blue-900 mb-1">Domain added successfully!</p>
                    <p className="text-xs font-sans text-blue-800">To use this domain for sending email, you need to add DNS records to your domain registrar.</p>
                </div>
            </div>

            {/* Step 1: SPF Record */}
            <div className="space-y-3 p-4 border border-black/5 rounded-sm">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[var(--forest-green)] text-white text-xs font-bold flex items-center justify-center">1</div>
                    <h4 className="text-sm font-sans font-bold">Add SPF Record</h4>
                </div>
                <p className="text-xs font-sans text-zinc-600 ml-9">
                    Log into your domain registrar (Namecheap, GoDaddy, etc.) and add a new TXT record:
                </p>
                <div className="ml-9 space-y-2">
                    <div className="p-3 bg-zinc-50 border border-black/5 rounded-sm font-mono text-[11px] break-all">
                        {spfRecord}
                    </div>
                    <button
                        onClick={() => copyToClipboard(spfRecord, 'spf')}
                        className="flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-widest text-[var(--forest-green)] hover:bg-black/5 px-2 py-1 rounded transition-colors"
                    >
                        <Copy size={12} />
                        {copiedRecord === 'spf' ? 'Copied!' : 'Copy SPF Record'}
                    </button>
                </div>
            </div>

            {/* Step 2: DMARC Policy */}
            <div className="space-y-3 p-4 border border-black/5 rounded-sm">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[var(--forest-green)] text-white text-xs font-bold flex items-center justify-center">2</div>
                    <h4 className="text-sm font-sans font-bold">Add DMARC Policy</h4>
                </div>
                <p className="text-xs font-sans text-zinc-600 ml-9">
                    Add another TXT record for DMARC authentication:
                </p>
                <div className="ml-9 space-y-2">
                    <div className="p-3 bg-zinc-50 border border-black/5 rounded-sm font-mono text-[11px] break-all">
                        {dmarcRecord}
                    </div>
                    <button
                        onClick={() => copyToClipboard(dmarcRecord, 'dmarc')}
                        className="flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-widest text-[var(--forest-green)] hover:bg-black/5 px-2 py-1 rounded transition-colors"
                    >
                        <Copy size={12} />
                        {copiedRecord === 'dmarc' ? 'Copied!' : 'Copy DMARC Record'}
                    </button>
                </div>
            </div>

            {/* Verification */}
            <div className="space-y-3 p-4 border border-black/5 rounded-sm bg-green-50">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[var(--forest-green)] text-white text-xs font-bold flex items-center justify-center">3</div>
                    <h4 className="text-sm font-sans font-bold">Verify Records</h4>
                </div>
                <p className="text-xs font-sans text-zinc-600 ml-9">
                    After adding the DNS records (can take up to 48 hours to propagate), click the refresh button on the domain page to verify authentication.
                </p>
                <div className="ml-9 p-3 bg-white border border-green-200 rounded-sm flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-green-600" />
                    <p className="text-xs font-sans text-green-700">
                        <span className="font-bold">Tip:</span> Start with SPF. DMARC is optional but recommended.
                    </p>
                </div>
            </div>

            {/* Provider-Specific Help */}
            <div className="space-y-3 p-4 border border-black/5 rounded-sm bg-amber-50">
                <h4 className="text-sm font-sans font-bold text-amber-900 mb-2">Need Provider-Specific Help?</h4>
                <div className="space-y-2 ml-0">
                    {[
                        { name: 'GoDaddy', url: 'https://www.godaddy.com/help/add-a-txt-record-19236' },
                        { name: 'Namecheap', url: 'https://www.namecheap.com/support/knowledgebase/article.aspx/432/2237/how-do-i-add-txt-records-for-my-domain/' },
                        { name: 'Route53 (AWS)', url: 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html' },
                        { name: 'Cloudflare', url: 'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/' }
                    ].map(provider => (
                        <a
                            key={provider.name}
                            href={provider.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-widest text-amber-700 hover:text-amber-900 hover:underline transition-colors"
                        >
                            <ExternalLink size={12} />
                            {provider.name} DNS Setup Guide
                        </a>
                    ))}
                </div>
            </div>

            {/* Help */}
            <div className="p-3 bg-zinc-50 border border-black/5 rounded-sm text-center">
                <p className="text-[10px] font-sans text-zinc-600">
                    Need help? Most domain registrars have similar DNS record management interfaces. Links above have provider-specific guides.
                </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
                <button
                    onClick={onComplete}
                    className="flex-1 ink-button text-xs font-sans font-bold uppercase tracking-widest p-4"
                >
                    I've Added the Records
                </button>
                <button
                    onClick={onComplete}
                    className="flex-1 border border-black/5 px-4 py-3 text-xs font-sans font-bold uppercase tracking-widest hover:bg-black/5 transition-colors rounded-sm"
                >
                    Skip for Now
                </button>
            </div>
        </div>
    );
};
