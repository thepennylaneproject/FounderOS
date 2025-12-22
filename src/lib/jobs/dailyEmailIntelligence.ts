/**
 * Daily Email Intelligence Job
 *
 * Scheduled to run at 05:00 UTC daily
 * Analyzes all unprocessed emails from the last 24 hours
 * Updates contact scores and triggers workflows based on intelligence
 */

import { emailIntelligenceEngine } from '@/intelligence/EmailIntelligenceEngine';
import { query } from '@/lib/db';

export async function runDailyEmailIntelligenceJob() {
    console.log('[DailyEmailIntelligence] Starting daily email intelligence analysis job');

    try {
        // Run the email analysis engine
        const result = await emailIntelligenceEngine.analyzeNewEmails();

        // Log success with metrics
        console.log('[DailyEmailIntelligence] Job completed:', {
            status: result.status,
            emailsProcessed: result.emailsProcessed,
            contactsUpdated: result.contactsUpdated,
            contactsUpscored: result.contactsUpscored,
            triggers_fired: result.triggers_fired,
            errors: result.errors.length
        });

        // Record job execution
        if (result.status === 'completed' || result.errors.length === 0) {
            console.log('[DailyEmailIntelligence] Job completed successfully');
        } else {
            console.warn('[DailyEmailIntelligence] Job completed with errors:', result.errors);
        }

        return result;
    } catch (error) {
        console.error('[DailyEmailIntelligence] Job failed:', error);
        throw error;
    }
}

/**
 * Trigger the daily email intelligence job
 * Called from scheduled cron job or manual endpoint
 */
export async function triggerDailyEmailIntelligence() {
    try {
        const result = await runDailyEmailIntelligenceJob();
        return {
            success: true,
            message: 'Daily email intelligence job executed',
            result
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('[DailyEmailIntelligence] Failed to trigger job:', errorMsg);
        return {
            success: false,
            message: 'Failed to run daily email intelligence job',
            error: errorMsg
        };
    }
}
