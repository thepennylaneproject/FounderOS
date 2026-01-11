import { NextResponse } from 'next/server';
import { domainManager } from '@/domains/DomainManager';

export async function GET() {
    try {
        const domains = await domainManager.getAllDomains();
        return NextResponse.json(domains);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const domain = body.domain || body.domain_name;
        if (!domain) {
            return NextResponse.json({ error: 'Domain name is required' }, { status: 400 });
        }
        await domainManager.addDomain({ ...body, domain });
        const record = await domainManager.getDomain(domain);
        return NextResponse.json(record);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
