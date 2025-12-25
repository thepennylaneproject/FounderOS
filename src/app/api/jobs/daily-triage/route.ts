/**
 * POST /api/jobs/daily-triage
 * GET /api/jobs/daily-triage/status
 *
 * Triggers the daily contact triage batch job
 * Can be called by external scheduler or manually
 */

import { NextRequest, NextResponse } from 'next/server';
import { dailyContactTriageJob } from '@/lib/jobs/dailyContactTriage';

export async function POST(request: NextRequest) {
    try {
        console.log('Daily contact triage job triggered via API');

        // Execute the job
        const result = await dailyContactTriageJob.execute();

        return NextResponse.json({
            status: result.status,
            message: `Job ${result.status}: ${result.contactsUpdated} contacts triaged`,
            results: {
                contactsProcessed: result.contactsProcessed,
                contactsUpdated: result.contactsUpdated,
                hotLeadsCount: result.hotLeadsCount,
                atRiskCount: result.atRiskCount,
                actionCount: result.actionSummary.length,
                duration: result.totalDuration,
                startedAt: result.startedAt.toISOString(),
                completedAt: result.completedAt?.toISOString()
            },
            actionSummary: result.actionSummary,
            errors: result.errors.length > 0 ? result.errors.slice(0, 10) : undefined
        });
    } catch (error) {
        console.error('Error triggering daily triage job:', error);
        return NextResponse.json(
            {
                status: 'error',
                message: 'Failed to execute daily triage job',
                error: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/jobs/daily-triage/status
 *
 * Check the status of the daily triage job
 */

export async function GET(request: NextRequest) {
    try {
        return NextResponse.json({
            job: 'daily-contact-triage',
            schedule: '04:00 UTC daily',
            description: 'Recalculates contact triage tiers and recommended next-best-actions',
            nextRun: getNextRunTime(),
            triggerUrl: '/api/jobs/daily-triage',
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
 * Calculate next run time based on 04:00 UTC schedule
 */
function getNextRunTime(): string {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(4, 0, 0, 0);

    // If 04:00 UTC has already passed today, schedule for tomorrow
    if (next <= now) {
        next.setUTCDate(next.getUTCDate() + 1);
    }

    return next.toISOString();
}
