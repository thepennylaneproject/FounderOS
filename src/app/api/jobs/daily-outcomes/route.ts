/**
 * POST /api/jobs/daily-outcomes
 * GET /api/jobs/daily-outcomes/status
 *
 * Triggers the daily outcome recalculation batch job.
 * Can be called by:
 * - External scheduler (EasyCron, AWS Lambda, etc.)
 * - Manual request for testing
 * - Part of a larger job orchestration system
 *
 * Response: { status, campaignsProcessed, workflowsProcessed, duration, errors }
 */

import { NextRequest, NextResponse } from 'next/server';
import { dailyOutcomeRecalculationJob } from '@/lib/jobs/dailyOutcomeRecalculation';

export async function POST(request: NextRequest) {
    try {
        console.log('Daily outcomes recalculation job triggered via API');

        // Execute the job
        const result = await dailyOutcomeRecalculationJob.execute();

        return NextResponse.json({
            status: result.status,
            message: `Job ${result.status}: ${result.campaignsSucceeded + result.workflowsSucceeded} outcomes recalculated`,
            results: {
                campaigns: {
                    processed: result.campaignsProcessed,
                    succeeded: result.campaignsSucceeded,
                    failed: result.campaignsFailed
                },
                workflows: {
                    processed: result.workflowsProcessed,
                    succeeded: result.workflowsSucceeded,
                    failed: result.workflowsFailed
                },
                duration: result.totalDuration,
                startedAt: result.startedAt.toISOString(),
                completedAt: result.completedAt?.toISOString()
            },
            errors: result.errors.length > 0 ? result.errors : undefined
        });
    } catch (error) {
        console.error('Error triggering daily outcomes job:', error);
        return NextResponse.json(
            {
                status: 'error',
                message: 'Failed to execute daily outcomes recalculation job',
                error: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/jobs/daily-outcomes/status
 *
 * Check the status of the daily outcomes recalculation job
 */

export async function GET(request: NextRequest) {
    try {
        return NextResponse.json({
            job: 'daily-outcome-recalculation',
            schedule: '03:00 UTC daily',
            description: 'Recalculates and caches campaign and workflow outcomes based on email engagement data',
            nextRun: getNextRunTime(),
            triggerUrl: '/api/jobs/daily-outcomes',
            triggerMethod: 'POST',
            status: 'configured'
        });
    } catch (error) {
        console.error('Error checking job status:', error);
        return NextResponse.json(
            {
                status: 'error',
                message: 'Failed to check job status',
                error: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}

/**
 * Calculate next run time based on 03:00 UTC schedule
 */
function getNextRunTime(): string {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(3, 0, 0, 0);

    // If 03:00 UTC has already passed today, schedule for tomorrow
    if (next <= now) {
        next.setUTCDate(next.getUTCDate() + 1);
    }

    return next.toISOString();
}
