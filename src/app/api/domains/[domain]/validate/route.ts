import { NextResponse } from 'next/server';
import { domainManager } from '@/domains/DomainManager';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ domain: string }> }
) {
    try {
        const { domain } = await params;
        const health = await domainManager.validateDomain(domain);
        return NextResponse.json(health);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
