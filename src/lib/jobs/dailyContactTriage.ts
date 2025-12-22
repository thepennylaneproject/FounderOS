/**
 * Daily Contact Triage Batch Job
 *
 * Purpose: Re-triage all contacts daily to ensure recommendations stay current
 * Schedule: 04:00 UTC daily (after outcome recalculation at 03:00 UTC)
 *
 * This job:
 * 1. Re-calculates triage tier for all contacts
 * 2. Updates next-best-actions based on latest scores
 * 3. Generates action summary for dashboard
 *
 * Typical runtime: 15-60 seconds depending on contact count
 *
 * Usage:
 * - Standalone: node -r ts-node/register src/lib/jobs/dailyContactTriage.ts
 * - Cron: Add to crontab: 0 4 * * * cd /path/to/app && npm run job:triage
 * - Scheduled endpoint: POST /api/jobs/daily-triage
 */

import { contactTriageEngine } from '@/intelligence/ContactTriageEngine';
import { query } from '@/lib/db';

export interface ContactTriageJob {
    status: 'running' | 'completed' | 'failed';
    startedAt: Date;
    completedAt?: Date;
    contactsProcessed: number;
    contactsUpdated: number;
    hotLeadsCount: number;
    atRiskCount: number;
    actionSummary: Array<{
        action: string;
        count: number;
    }>;
    totalDuration?: string;
    errors: string[];
}

class DailyContactTriageJob {
    /**
     * Execute the daily contact triage job
     */
    async execute(): Promise<ContactTriageJob> {
        const result: ContactTriageJob = {
            status: 'running',
            startedAt: new Date(),
            contactsProcessed: 0,
            contactsUpdated: 0,
            hotLeadsCount: 0,
            atRiskCount: 0,
            actionSummary: [],
            errors: []
        };

        console.log('[DailyTriage] Starting job at', result.startedAt.toISOString());

        try {
            // Run full triage
            const triageResult = await contactTriageEngine.triageAllContacts();
            result.contactsProcessed = triageResult.processed;
            result.contactsUpdated = triageResult.updated;
            result.errors = triageResult.errors;

            console.log(`[DailyTriage] Triage completed: ${result.contactsUpdated} contacts updated`);

            // Get updated statistics
            const stats = await contactTriageEngine.getTriageStats();
            result.hotLeadsCount = stats.hot_leads;
            result.atRiskCount = stats.at_risk;

            // Get action summary
            const actions = await contactTriageEngine.getActionSummary();
            result.actionSummary = actions.map(a => ({
                action: a.action,
                count: a.count
            }));

            console.log(
                `[DailyTriage] Summary: ${stats.hot_leads} hot leads, ${stats.at_risk} at-risk, ${actions.length} action types`
            );

            // Log job execution
            result.completedAt = new Date();
            const duration = ((result.completedAt.getTime() - result.startedAt.getTime()) / 1000).toFixed(2);
            result.totalDuration = `${duration}s`;
            result.status = result.errors.length === 0 ? 'completed' : 'failed';

            console.log(`[DailyTriage] Job completed in ${result.totalDuration}`);

            await this.logJobExecution(result);

            return result;
        } catch (error) {
            result.status = 'failed';
            result.completedAt = new Date();
            const errorMsg = error instanceof Error ? error.message : String(error);
            result.errors.push(errorMsg);
            console.error('[DailyTriage] Job failed:', error);

            return result;
        }
    }

    /**
     * Log job execution details to database
     */
    private async logJobExecution(result: ContactTriageJob): Promise<void> {
        try {
            await query(
                `INSERT INTO job_executions (job_name, status, executed_at, completed_at, metadata)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    'daily_contact_triage',
                    result.status,
                    result.startedAt,
                    result.completedAt,
                    JSON.stringify({
                        contactsProcessed: result.contactsProcessed,
                        contactsUpdated: result.contactsUpdated,
                        hotLeadsCount: result.hotLeadsCount,
                        atRiskCount: result.atRiskCount,
                        actionCount: result.actionSummary.length,
                        duration: result.totalDuration,
                        errorCount: result.errors.length
                    })
                ]
            );
        } catch (err) {
            console.error('[DailyTriage] Failed to log job execution:', err);
            // Don't throw - job itself succeeded even if logging failed
        }
    }

    /**
     * Schedule job to run daily at 04:00 UTC using node-cron
     */
    async scheduleDaily(): Promise<void> {
        try {
            const cron = require('node-cron');

            // Run at 04:00 UTC (0 4 * * *)
            // This is after the 03:00 UTC outcome recalculation job
            cron.schedule('0 4 * * *', async () => {
                console.log('[DailyTriage] Scheduled job triggered');
                await this.execute();
            });

            console.log('[DailyTriage] Scheduled daily at 04:00 UTC');
        } catch (error) {
            console.error('[DailyTriage] Failed to schedule job:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const dailyContactTriageJob = new DailyContactTriageJob();

// If run directly from CLI
if (require.main === module) {
    dailyContactTriageJob
        .execute()
        .then((result) => {
            process.exit(result.status === 'completed' ? 0 : 1);
        })
        .catch((error) => {
            console.error('Unexpected error:', error);
            process.exit(1);
        });
}
