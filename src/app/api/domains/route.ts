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
        if (!body.domain) {
            return NextResponse.json({ error: 'Domain name is required' }, { status: 400 });
        }
        await domainManager.addDomain(body);
        const domain = await domainManager.getDomain(body.domain);
        return NextResponse.json(domain);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
