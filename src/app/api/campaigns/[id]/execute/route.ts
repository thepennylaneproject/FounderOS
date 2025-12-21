import { NextResponse } from 'next/server';
import { campaignEngine } from '@/campaigns/CampaignEngine';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        // This runs in the background in a real app, but for now we'll wait for it
        await campaignEngine.executeCampaign(id);
        return NextResponse.json({ status: 'completed' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
