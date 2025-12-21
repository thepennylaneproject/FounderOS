import { NextResponse } from 'next/server';
import { campaignEngine } from '@/campaigns/CampaignEngine';

export async function GET() {
    try {
        const campaigns = await campaignEngine.getAllCampaigns();
        return NextResponse.json(campaigns);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const id = await campaignEngine.createCampaign(body);
        const campaign = await campaignEngine.getCampaign(id);
        return NextResponse.json(campaign);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
