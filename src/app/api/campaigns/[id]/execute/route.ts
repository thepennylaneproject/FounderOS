import { NextResponse } from 'next/server';
import { campaignEngine } from '@/campaigns/CampaignEngine';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: campaignId } = await params;

        // Fetch campaign to verify it exists
        const campaign = await campaignEngine.getCampaign(campaignId);
        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        // Execute the campaign
        await campaignEngine.executeCampaign(campaignId);

        const updatedCampaign = await campaignEngine.getCampaign(campaignId);
        return NextResponse.json({
            success: true,
            message: 'Campaign dispatched successfully',
            campaign: updatedCampaign
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to execute campaign' },
            { status: 500 }
        );
    }
}
