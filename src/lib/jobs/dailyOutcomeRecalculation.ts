/**
 * Daily Outcome Recalculation Batch Job
 *
 * Purpose: Recalculate and cache campaign and workflow outcomes daily
 * Schedule: 03:00 UTC daily (after daily snapshots at 02:00 UTC)
 *
 * This job:
 * 1. Recalculates outcomes for all completed campaigns
 * 2. Recalculates outcomes for all workflows
 * 3. Caches results for fast dashboard queries
 * 4. Updates the "What Happened" layer with latest data
 *
 * Typical runtime: 30-120 seconds depending on number of campaigns/workflows
 *
 * Usage:
 * - Standalone: node -r ts-node/register src/lib/jobs/dailyOutcomeRecalculation.ts
 * - Cron: Add to crontab: 0 3 * * * cd /path/to/app && npm run job:outcomes
 * - Scheduled endpoint: POST /api/jobs/daily-outcomes
 */

import { campaignOutcomeEngine } from '@/intelligence/CampaignOutcomeEngine';
import { workflowOutcomeEngine } from '@/intelligence/WorkflowOutcomeEngine';
import { query } from '@/lib/db';

export interface OutcomeRecalculationJob {
    status: 'running' | 'completed' | 'failed';
    startedAt: Date;
    completedAt?: Date;
    campaignsProcessed: number;
    campaignsSucceeded: number;
    campaignsFailed: number;
    workflowsProcessed: number;
    workflowsSucceeded: number;
    workflowsFailed: number;
    totalDuration?: string;
    errors: string[];
}

class DailyOutcomeRecalculationJob {
    /**
     * Execute the daily outcome recalculation job
     */
    async execute(): Promise<OutcomeRecalculationJob> {
        const result: OutcomeRecalculationJob = {
            status: 'running',
            startedAt: new Date(),
            campaignsProcessed: 0,
            campaignsSucceeded: 0,
            campaignsFailed: 0,
            workflowsProcessed: 0,
            workflowsSucceeded: 0,
            workflowsFailed: 0,
            errors: []
        };

        console.log('[DailyOutcomes] Starting job at', result.startedAt.toISOString());

        try {
            // Recalculate campaign outcomes
            console.log('[DailyOutcomes] Recalculating campaign outcomes...');
            const campaignResult = await campaignOutcomeEngine.recalculateAllOutcomes();
            result.campaignsProcessed = campaignResult.success + campaignResult.failed;
            result.campaignsSucceeded = campaignResult.success;
            result.campaignsFailed = campaignResult.failed;

            if (campaignResult.failed > 0) {
                result.errors.push(`${campaignResult.failed} campaigns failed to recalculate`);
            }

            console.log(
                `[DailyOutcomes] Campaign outcomes: ${result.campaignsSucceeded} succeeded, ${result.campaignsFailed} failed`
            );

            // Recalculate workflow outcomes
            console.log('[DailyOutcomes] Recalculating workflow outcomes...');
            const workflowResult = await workflowOutcomeEngine.recalculateAllOutcomes();
            result.workflowsProcessed = workflowResult.success + workflowResult.failed;
            result.workflowsSucceeded = workflowResult.success;
            result.workflowsFailed = workflowResult.failed;

            if (workflowResult.failed > 0) {
                result.errors.push(`${workflowResult.failed} workflows failed to recalculate`);
            }

            console.log(
                `[DailyOutcomes] Workflow outcomes: ${result.workflowsSucceeded} succeeded, ${result.workflowsFailed} failed`
            );

            // Log job execution
            result.completedAt = new Date();
            const duration = ((result.completedAt.getTime() - result.startedAt.getTime()) / 1000).toFixed(2);
            result.totalDuration = `${duration}s`;
            result.status = result.errors.length === 0 ? 'completed' : 'failed';

            console.log(`[DailyOutcomes] Job completed in ${result.totalDuration}`);
            console.log(
                `[DailyOutcomes] Total: ${result.campaignsSucceeded + result.workflowsSucceeded} succeeded, ` +
                `${result.campaignsFailed + result.workflowsFailed} failed`
            );

            // Log job metadata
            await this.logJobExecution(result);

            return result;
        } catch (error) {
            result.status = 'failed';
            result.completedAt = new Date();
            const errorMsg = error instanceof Error ? error.message : String(error);
            result.errors.push(errorMsg);
            console.error('[DailyOutcomes] Job failed:', error);

            return result;
        }
    }

    /**
     * Log job execution details to database
     */
    private async logJobExecution(result: OutcomeRecalculationJob): Promise<void> {
        try {
            await query(
                `INSERT INTO job_executions (job_name, status, executed_at, completed_at, metadata)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    'daily_outcome_recalculation',
                    result.status,
                    result.startedAt,
                    result.completedAt,
                    JSON.stringify({
                        campaignsProcessed: result.campaignsProcessed,
                        campaignsSucceeded: result.campaignsSucceeded,
                        campaignsFailed: result.campaignsFailed,
                        workflowsProcessed: result.workflowsProcessed,
                        workflowsSucceeded: result.workflowsSucceeded,
                        workflowsFailed: result.workflowsFailed,
                        duration: result.totalDuration,
                        errorCount: result.errors.length
                    })
                ]
            );
        } catch (err) {
            console.error('[DailyOutcomes] Failed to log job execution:', err);
            // Don't throw - job itself succeeded even if logging failed
        }
    }

    /**
     * Schedule job to run daily at 03:00 UTC using node-cron
     * Install: npm install node-cron
     */
    async scheduleDaily(): Promise<void> {
        try {
            const cron = require('node-cron');

            // Run at 03:00 UTC (0 3 * * *)
            // This is after the 02:00 UTC daily snapshot job
            cron.schedule('0 3 * * *', async () => {
                console.log('[DailyOutcomes] Scheduled job triggered');
                await this.execute();
            });

            console.log('[DailyOutcomes] Scheduled daily at 03:00 UTC');
        } catch (error) {
            console.error('[DailyOutcomes] Failed to schedule job:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const dailyOutcomeRecalculationJob = new DailyOutcomeRecalculationJob();

// If run directly from CLI
if (require.main === module) {
    dailyOutcomeRecalculationJob
        .execute()
        .then((result) => {
            process.exit(result.status === 'completed' ? 0 : 1);
        })
        .catch((error) => {
            console.error('Unexpected error:', error);
            process.exit(1);
        });
}
