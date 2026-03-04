'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Globe, CheckCircle2, AlertCircle, RefreshCw, Lock, Copy, ChevronDown, ExternalLink, Trash2, HelpCircle, Info } from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { AddDomainForm } from '@/components/domains/AddDomainForm';

interface DomainDeliverability {
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

// DNS Record Section with expandable records and copy buttons
function DnsRecordSection({ domain }: { domain: any }) {
    const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
    const [copiedRecord, setCopiedRecord] = useState<string | null>(null);
    const [useCloudflare, setUseCloudflare] = useState(false);

    const spfSendGridOnly = `v=spf1 include:sendgrid.net ~all`;
    const spfCloudflareAndSendGrid = `v=spf1 include:_spf.mx.cloudflare.net include:sendgrid.net ~all`;
    const spfRecord = useCloudflare ? spfCloudflareAndSendGrid : spfSendGridOnly;
    const dmarcRecord = `v=DMARC1; p=quarantine; rua=mailto:admin@${domain.name}`;

    const copyToClipboard = (text: string, recordType: string) => {
        navigator.clipboard.writeText(text);
        setCopiedRecord(recordType);
        setTimeout(() => setCopiedRecord(null), 2000);
    };

    const records = [
        {
            key: 'spf',
            label: 'SPF Record',
            status: domain.spf_record ? 'valid' : 'missing',
            recordType: 'TXT',
            host: '@',
            value: spfRecord,
            description: 'Authorizes FounderOS to send email on behalf of your domain',
            hasCloudflareOption: true
        },
        {
            key: 'dkim',
            label: 'DKIM Signature',
            status: domain.dkim_key ? 'valid' : 'missing',
            recordType: 'CNAME',
            host: 's1._domainkey',
            value: domain.dkim_key || 's1.domainkey.u12345678.wl123.sendgrid.net',
            description: 'DKIM requires SendGrid domain authentication. Add 2 CNAME records provided by SendGrid.',
            isDkim: true,
            dkimRecords: [
                { host: 's1._domainkey', value: 's1.domainkey.u[YOUR_SENDGRID_ID].wl[ID].sendgrid.net' },
                { host: 's2._domainkey', value: 's2.domainkey.u[YOUR_SENDGRID_ID].wl[ID].sendgrid.net' }
            ],
            helpUrl: 'https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication'
        },
        {
            key: 'dmarc',
            label: 'DMARC Policy',
            status: domain.dmarc_policy ? 'valid' : 'missing',
            recordType: 'TXT',
            host: '_dmarc',
            value: dmarcRecord,
            description: 'Specifies how receivers should handle authentication failures'
        }
    ];

    return (
        <div className="space-y-2">
            {records.map(record => (
                <div key={record.key} className="border-t border-black/5">
                    <button
                        onClick={() => setExpandedRecord(expandedRecord === record.key ? null : record.key)}
                        className="w-full flex justify-between items-center py-3 hover:bg-black/[0.02] transition-colors"
                    >
                        <span className="text-xs font-sans font-medium text-zinc-600">{record.label}</span>
                        <div className="flex items-center gap-2">
                            {record.status === 'valid' ? (
                                <CheckCircle2 size={14} className="text-[var(--forest-green)]" />
                            ) : (
                                <AlertCircle size={14} className="text-[var(--rose-gold)]" />
                            )}
                            <ChevronDown 
                                size={14} 
                                className={`text-zinc-400 transition-transform ${expandedRecord === record.key ? 'rotate-180' : ''}`} 
                            />
                        </div>
                    </button>
                    
                    {expandedRecord === record.key && (
                        <div className="pb-4 px-1 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                            <p className="text-[10px] font-sans text-zinc-500 italic">{record.description}</p>
                            
                            {/* Special DKIM handling */}
                            {record.key === 'dkim' ? (
                                <div className="space-y-3">
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm">
                                        <p className="text-[10px] font-sans text-amber-800 mb-2">
                                            <strong>DKIM requires SendGrid domain authentication:</strong>
                                        </p>
                                        <ol className="text-[10px] font-sans text-amber-700 list-decimal ml-4 space-y-1">
                                            <li>Log into <a href="https://app.sendgrid.com/settings/sender_auth" target="_blank" rel="noopener noreferrer" className="underline font-bold">SendGrid → Settings → Sender Authentication</a></li>
                                            <li>Click "Authenticate Your Domain"</li>
                                            <li>Enter your domain: <strong>{domain.name}</strong></li>
                                            <li>SendGrid will generate 2 CNAME records unique to your account</li>
                                            <li>Add those records to your DNS</li>
                                            <li><strong>Cloudflare Users:</strong> Ensure these CNAME records are set to **DNS Only (Grey Cloud)**. Proxying (Orange Cloud) will break DKIM.</li>
                                            <li>Click "Verify" in SendGrid</li>
                                        </ol>
                                    </div>
                                    <p className="text-[9px] font-sans text-zinc-500">
                                        Example CNAME records (yours will have different IDs):
                                    </p>
                                    <div className="space-y-2 text-[10px] font-mono">
                                        <div className="p-2 bg-zinc-50 border border-black/5 rounded-sm">
                                            <span className="text-zinc-500">Host:</span> s1._domainkey.{domain.name}<br/>
                                            <span className="text-zinc-500">Value:</span> s1.domainkey.u12345.wl123.sendgrid.net
                                        </div>
                                        <div className="p-2 bg-zinc-50 border border-black/5 rounded-sm">
                                            <span className="text-zinc-500">Host:</span> s2._domainkey.{domain.name}<br/>
                                            <span className="text-zinc-500">Value:</span> s2.domainkey.u12345.wl123.sendgrid.net
                                        </div>
                                    </div>
                                    <a 
                                        href="https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-widest text-[var(--forest-green)] hover:underline"
                                    >
                                        <ExternalLink size={12} />
                                        View SendGrid DKIM Setup Guide
                                    </a>
                                </div>
                            ) : (
                                /* Standard SPF/DMARC display */
                                <div className="space-y-3">
                                    {/* Cloudflare toggle for SPF */}
                                    {record.key === 'spf' && (
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-sm">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={useCloudflare}
                                                    onChange={(e) => setUseCloudflare(e.target.checked)}
                                                    className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-[10px] font-sans text-blue-800">
                                                    <strong>I use Cloudflare Email Routing</strong> (for receiving emails)
                                                </span>
                                            </label>
                                            {useCloudflare && (
                                                <p className="text-[9px] font-sans text-blue-700 mt-2 ml-7">
                                                    ✓ This SPF includes both Cloudflare and SendGrid. You can only have ONE SPF record per domain.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-sans font-bold uppercase tracking-widest text-zinc-400 w-16">Type</span>
                                            <span className="text-xs font-mono text-zinc-700">{record.recordType}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-sans font-bold uppercase tracking-widest text-zinc-400 w-16">Host</span>
                                            <span className="text-xs font-mono text-zinc-700">{record.host}</span>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-sans font-bold uppercase tracking-widest text-zinc-400">Value</span>
                                            <div className="p-2 bg-zinc-50 border border-black/5 rounded-sm font-mono text-[10px] break-all text-zinc-700">
                                                {record.value}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {record.status === 'missing' && record.key !== 'dkim' && (
                                <button
                                    onClick={() => copyToClipboard(record.value, record.key)}
                                    className="flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-widest text-[var(--forest-green)] hover:bg-black/5 px-2 py-1 rounded transition-colors"
                                >
                                    <Copy size={12} />
                                    {copiedRecord === record.key ? 'Copied!' : `Copy ${record.label}`}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

interface DomainDeliverability {
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

export default function DomainsPage() {
    const [domains, setDomains] = useState<any[]>([]);
    const [deliverability, setDeliverability] = useState<DomainDeliverability[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [validationResults, setValidationResults] = useState<Map<string, any>>(new Map());
    const { openModal, showToast } = useUI();

    const fetchDomains = async () => {
        setFetchError(null);
        setLoading(true);
        try {
            const [domainsRes, deliverabilityRes] = await Promise.all([
                fetch('/api/domains'),
                fetch('/api/intelligence/deliverability')
            ]);
            const domainsData = await domainsRes.json();
            const deliverabilityData = await deliverabilityRes.json();
            setDomains(domainsData);
            setDeliverability(Array.isArray(deliverabilityData) ? deliverabilityData : []);
        } catch (err) {
            console.error(err);
            setFetchError('We couldn’t load your domains or deliverability data. Please retry.');
            showToast('Domain data failed to load', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDomains();
    }, []);

    const handleAddDomain = () => {
        openModal(
            'Add Email Domain',
            <AddDomainForm onSuccess={fetchDomains} />
        );
    };

    const handleValidate = async (domainName: string) => {
        try {
            const res = await fetch(`/api/domains/${domainName}/validate`, { method: 'POST' });
            const result = await res.json();
            setValidationResults(prev => new Map(prev).set(domainName, result));
            
            // Wait a moment for database to commit the updates before re-fetching
            await new Promise(resolve => setTimeout(resolve, 500));
            
            fetchDomains();
        } catch (error) {
            console.error(error);
        }
    };

    const getDeliverabilityForDomain = (domainName: string) => {
        return deliverability.find(d => d.domain === domainName);
    };

    const handleDeleteDomain = async (domainName: string) => {
        if (!window.confirm(`Are you sure you want to delete ${domainName}? This action cannot be undone.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/domains?domain=${domainName}`, {
                method: 'DELETE'
            });
            const data = await res.json();

            if (data.success) {
                showToast('Domain successfully removed', 'success');
                fetchDomains();
            } else {
                throw new Error(data.error || 'Failed to delete domain');
            }
        } catch (err: any) {
            console.error(err);
            showToast(err.message || 'Failed to delete domain', 'error');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <header className="flex justify-between items-center border-b border-black/5 pb-8">
                <div>
                    <h2 className="text-3xl font-serif italic tracking-tight">Email Domains</h2>
                    <p className="text-sm font-sans text-zinc-500 mt-1">Health, authentication, and email deliverability.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={fetchDomains}
                        className="p-3 border border-black/5 rounded-sm hover:bg-black/5 transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={handleAddDomain}
                        className="ink-button flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-widest px-6 py-3"
                    >
                        <Globe size={16} /> Add Domain
                    </button>
                </div>
            </header>

            {fetchError && (
                <div className="editorial-card max-w-3xl">
                    <div className="flex items-center gap-2 text-amber-700 mb-4">
                        <AlertCircle size={18} />
                        <p className="text-sm font-sans">{fetchError}</p>
                    </div>
                    <button
                        onClick={fetchDomains}
                        className="ink-button text-xs font-sans font-bold uppercase tracking-widest px-6 py-2"
                    >
                        Retry loading
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                    <div className="col-span-full p-12 text-center text-zinc-400 italic">Loading domains...</div>
                ) : domains.length > 0 ? domains.map(domain => {
                    const intel = getDeliverabilityForDomain(domain.name);
                    return (
                        <div key={domain.id} className="editorial-card group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 rounded-full bg-[var(--ivory)] border border-black/5">
                                    <ShieldCheck size={24} className="text-[var(--forest-green)]" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-sans font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${domain.status === 'validated' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                        {domain.status}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteDomain(domain.name)}
                                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                        title="Delete Domain"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-2xl font-serif mb-2">{domain.name}</h3>
                            <p className="text-xs font-sans text-zinc-500 mb-8 lowercase italic">Registered {new Date(domain.created_at).toLocaleDateString()}</p>

                            {/* Inbox Placement Probability */}
                            {intel && (
                                <div className="mb-6">
                                    <div className="p-4 bg-white/50 border border-black/5 rounded-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400">Inbox Placement</span>
                                                {intel.inboxPlacementProbability < 80 && (
                                                    <HelpCircle size={12} className="text-zinc-400" />
                                                )}
                                            </div>
                                            <span className={`text-lg font-serif font-bold ${intel.riskLevel === 'low' ? 'text-green-600' :
                                                    intel.riskLevel === 'medium' ? 'text-amber-500' : 'text-red-500'
                                                }`}>{intel.inboxPlacementProbability}%</span>
                                        </div>
                                        <div className="h-2 bg-black/5 rounded-full overflow-hidden mb-2">
                                            <div
                                                className={`h-full transition-all duration-500 ${intel.riskLevel === 'low' ? 'bg-green-500' :
                                                        intel.riskLevel === 'medium' ? 'bg-amber-500' : 'bg-red-500'
                                                    }`}
                                                style={{ width: `${intel.inboxPlacementProbability}%` }}
                                            />
                                        </div>
                                        {/* Show what's missing */}
                                        {intel.inboxPlacementProbability < 100 && (
                                            <div className="text-[9px] font-sans text-zinc-600 space-y-1">
                                                {!intel.hasSPF && <div className="flex items-center gap-1"><span className="text-red-500">✗</span> Missing SPF (-25%)</div>}
                                                {!intel.hasDKIM && <div className="flex items-center gap-1"><span className="text-red-500">✗</span> Missing DKIM (-25%)</div>}
                                                {!intel.hasDMARC && <div className="flex items-center gap-1"><span className="text-red-500">✗</span> Missing DMARC (-15%)</div>}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Troubleshooting section for low scores */}
                                    {intel.inboxPlacementProbability < 80 && validationResults.get(domain.name) && (
                                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-sm space-y-2">
                                            <div className="flex items-start gap-2">
                                                <Info size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                                                <div className="text-[10px] font-sans text-amber-900 space-y-2">
                                                    <p className="font-bold">Troubleshooting DNS Issues:</p>
                                                    <ul className="list-disc ml-4 space-y-1">
                                                        {intel.recommendations.map((rec, i) => (
                                                            <li key={i}>{rec}</li>
                                                        ))}
                                                    </ul>
                                                    {validationResults.get(domain.name)?.errors && Object.keys(validationResults.get(domain.name).errors).length > 0 && (
                                                        <div className="mt-2 pt-2 border-t border-amber-300">
                                                            <p className="font-bold mb-1">DNS Lookup Errors:</p>
                                                            <div className="space-y-1 text-[9px]">
                                                                {validationResults.get(domain.name).errors.spf && (
                                                                    <div>• SPF: {validationResults.get(domain.name).errors.spf}</div>
                                                                )}
                                                                {validationResults.get(domain.name).errors.dkim && (
                                                                    <div>• DKIM: {validationResults.get(domain.name).errors.dkim}</div>
                                                                )}
                                                                {validationResults.get(domain.name).errors.dmarc && (
                                                                    <div>• DMARC: {validationResults.get(domain.name).errors.dmarc}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Success message */}
                                    {intel.inboxPlacementProbability === 100 && (
                                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-sm">
                                            <div className="flex items-center gap-2 text-[10px] font-sans text-green-800">
                                                <CheckCircle2 size={14} className="text-green-600" />
                                                <span>{intel.recommendations[0]}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <DnsRecordSection domain={domain} />
                            <button
                                onClick={() => handleValidate(domain.name)}
                                className="mt-6 w-full ink-button-ghost text-[10px] font-sans font-bold uppercase tracking-widest py-2"
                            >
                                Validate DNS
                            </button>
                        </div>
                    )
                }) : (

                    <div className="col-span-full p-12 text-center border border-dashed border-black/10 rounded-sm">
                        <div className="w-12 h-12 bg-[var(--ivory)] border border-black/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock size={24} className="text-zinc-300" />
                        </div>
                        <h3 className="text-lg font-serif mb-2">No email domains yet</h3>
                        <p className="text-sm font-sans text-zinc-400 mb-6 max-w-sm mx-auto">Add your first domain to enable secure email delivery</p>
                        <button
                            onClick={handleAddDomain}
                            className="ink-button text-xs font-sans font-bold uppercase tracking-widest px-6 py-2"
                        >
                            Add Domain
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
