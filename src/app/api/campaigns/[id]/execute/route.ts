import { NextResponse } from 'next/server';
import { campaignEngine } from '@/campaigns/CampaignEngine';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const campaignId = params.id;

        // Fetch campaign to verify it exists
        const campaign = await campaignEngine.getCampaign(campaignId);
        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        // Execute the campaign (returns detailed results)
        const executionResult = await campaignEngine.executeCampaign(campaignId);

        // Fetch updated campaign with latest status and metrics
        const updatedCampaign = await campaignEngine.getCampaign(campaignId);

        // Return detailed results including failures
        return NextResponse.json({
            success: executionResult.success,
            message: executionResult.status === 'completed'
                ? 'Campaign dispatched successfully'
                : executionResult.status === 'completed_with_failures'
                ? `Campaign dispatched with ${executionResult.failedCount} failures`
                : 'Campaign dispatch failed',
            campaign: updatedCampaign,
            execution: {
                sentCount: executionResult.sentCount,
                failedCount: executionResult.failedCount,
                status: executionResult.status,
                failedRecipients: executionResult.failedRecipients
            }
        }, { status: executionResult.success ? 200 : 207 }); // 207 Multi-Status if partial failure
    } catch (error: any) {
        return NextResponse.json(
            {
                error: error.message || 'Failed to execute campaign',
                details: error.details || 'An unexpected error occurred during campaign execution'
            },
            { status: 500 }
        );
    }
}
