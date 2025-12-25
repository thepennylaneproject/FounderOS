/**
 * POST /api/jobs/daily-snapshots
 *
 * Triggers the daily contact snapshot batch job manually.
 * Can be called by:
 * - External scheduler (EasyCron, AWS Lambda, etc.)
 * - Manual request for testing
 * - Part of a larger job orchestration system
 *
 * Returns: { status, contactsProcessed, snapshotsCreated, duration, errors }
 */

import { NextRequest, NextResponse } from 'next/server';
import { dailyContactSnapshotJob } from '@/lib/jobs/dailyContactSnapshots';

export async function POST(request: NextRequest) {
    try {
        console.log('Daily snapshots job triggered via API');

        // Execute the job
        const result = await dailyContactSnapshotJob.execute();

        const duration = result.completedAt
            ? ((result.completedAt.getTime() - result.startedAt.getTime()) / 1000).toFixed(2)
            : 'N/A';

        return NextResponse.json({
            status: result.status,
            message: `Job ${result.status}: ${result.snapshotsCreated} snapshots created from ${result.contactsProcessed} contacts`,
            results: {
                contactsProcessed: result.contactsProcessed,
                snapshotsCreated: result.snapshotsCreated,
                errorCount: result.errors.length,
                duration: `${duration}s`,
                startedAt: result.startedAt.toISOString(),
                completedAt: result.completedAt?.toISOString()
            },
            errors: result.errors.length > 0 ? result.errors : undefined
        });
    } catch (error) {
        console.error('Error triggering daily snapshots job:', error);
        return NextResponse.json(
            {
                status: 'error',
                message: 'Failed to execute daily snapshots job',
                error: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/jobs/daily-snapshots/status
 *
 * Check the status of the daily snapshots job
 * (This would typically connect to a job queue/status store)
 */

export async function GET(request: NextRequest) {
    try {
        return NextResponse.json({
            job: 'daily-contact-snapshots',
            schedule: '02:00 UTC daily',
            description: 'Captures contact engagement metrics for trend analysis',
            nextRun: getNextRunTime(),
            triggerUrl: '/api/jobs/daily-snapshots',
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
 * Calculate next run time based on 02:00 UTC schedule
 */
function getNextRunTime(): string {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(2, 0, 0, 0);

    // If 02:00 UTC has already passed today, schedule for tomorrow
    if (next <= now) {
        next.setUTCDate(next.getUTCDate() + 1);
    }

    return next.toISOString();
}
