/**
 * Daily Contact Snapshots Batch Job
 *
 * Purpose: Capture contact engagement metrics once per day for trend analysis
 * Schedule: 02:00 UTC daily
 *
 * This job:
 * 1. Fetches all active contacts
 * 2. Captures their current health_score, momentum_score, is_hot_lead, closer_signal
 * 3. Stores as snapshots with reason: 'daily_recalc'
 * 4. Enables before/after correlation for Phase 1 analytics
 *
 * Usage:
 * - Standalone: node -r ts-node/register src/lib/jobs/dailyContactSnapshots.ts
 * - Cron: Add to crontab: 0 2 * * * cd /path/to/app && npm run job:snapshots
 * - Scheduled endpoint: GET /api/jobs/daily-snapshots
 */

import { query } from '@/lib/db';
import { eventLoggingEngine } from '@/intelligence/EventLoggingEngine';

export interface SnapshotJob {
    status: 'running' | 'completed' | 'failed';
    startedAt: Date;
    completedAt?: Date;
    contactsProcessed: number;
    snapshotsCreated: number;
    errors: string[];
}

class DailyContactSnapshotJob {
    /**
     * Execute the daily snapshot job
     * Captures current state of all active contacts
     */
    async execute(): Promise<SnapshotJob> {
        const result: SnapshotJob = {
            status: 'running',
            startedAt: new Date(),
            contactsProcessed: 0,
            snapshotsCreated: 0,
            errors: []
        };

        console.log('[DailySnapshots] Starting job at', result.startedAt.toISOString());

        try {
            // Fetch all active contacts
            const contactsRes = await query(
                `SELECT id, email, health_score, momentum_score, is_hot_lead, closer_signal
                 FROM contacts
                 WHERE stage != $1
                 ORDER BY updated_at DESC`,
                ['churned']
            );

            const contacts = contactsRes.rows || [];
            console.log(`[DailySnapshots] Found ${contacts.length} active contacts`);

            // Process each contact
            for (const contact of contacts) {
                result.contactsProcessed++;

                try {
                    // Capture snapshot for this contact
                    await eventLoggingEngine.captureContactSnapshot(
                        contact.id,
                        'daily_recalc'
                    );

                    result.snapshotsCreated++;

                    // Log progress every 100 contacts
                    if (result.contactsProcessed % 100 === 0) {
                        console.log(
                            `[DailySnapshots] Progress: ${result.contactsProcessed} contacts processed, ${result.snapshotsCreated} snapshots created`
                        );
                    }
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    result.errors.push(`Contact ${contact.id}: ${errorMsg}`);
                    console.error(`[DailySnapshots] Error processing contact ${contact.id}:`, error);
                }
            }

            result.status = 'completed';
            result.completedAt = new Date();

            const duration = ((result.completedAt.getTime() - result.startedAt.getTime()) / 1000).toFixed(2);
            console.log(`[DailySnapshots] Job completed in ${duration}s`);
            console.log(`[DailySnapshots] Results: ${result.snapshotsCreated}/${result.contactsProcessed} snapshots created`);

            if (result.errors.length > 0) {
                console.warn(`[DailySnapshots] ${result.errors.length} errors encountered`);
                result.status = 'failed';
            }

            // Log job metadata
            await this.logJobExecution(result);

            return result;
        } catch (error) {
            result.status = 'failed';
            result.completedAt = new Date();
            const errorMsg = error instanceof Error ? error.message : String(error);
            result.errors.push(errorMsg);
            console.error('[DailySnapshots] Job failed:', error);

            return result;
        }
    }

    /**
     * Log job execution details to database
     * Creates a record of when this job ran and its results
     */
    private async logJobExecution(result: SnapshotJob): Promise<void> {
        try {
            await query(
                `INSERT INTO job_executions (job_name, status, executed_at, completed_at, metadata)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    'daily_contact_snapshots',
                    result.status,
                    result.startedAt,
                    result.completedAt,
                    JSON.stringify({
                        contactsProcessed: result.contactsProcessed,
                        snapshotsCreated: result.snapshotsCreated,
                        errorCount: result.errors.length
                    })
                ]
            );
        } catch (err) {
            console.error('[DailySnapshots] Failed to log job execution:', err);
            // Don't throw - job itself succeeded even if logging failed
        }
    }

    /**
     * Schedule job to run daily at 02:00 UTC using node-cron
     * Install: npm install node-cron
     */
    async scheduleDaily(): Promise<void> {
        try {
            const cron = require('node-cron');

            // Run at 02:00 UTC (0 2 * * *)
            cron.schedule('0 2 * * *', async () => {
                console.log('[DailySnapshots] Scheduled job triggered');
                await this.execute();
            });

            console.log('[DailySnapshots] Scheduled daily at 02:00 UTC');
        } catch (error) {
            console.error('[DailySnapshots] Failed to schedule job:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const dailyContactSnapshotJob = new DailyContactSnapshotJob();

// If run directly from CLI
if (require.main === module) {
    dailyContactSnapshotJob
        .execute()
        .then((result) => {
            process.exit(result.status === 'completed' ? 0 : 1);
        })
        .catch((error) => {
            console.error('Unexpected error:', error);
            process.exit(1);
        });
}
