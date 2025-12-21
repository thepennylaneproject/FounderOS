/**
 * Event Logging Service
 *
 * Core service for logging campaigns sends, workflow executions, and contact snapshots.
 * This is the foundation for Phase 1 (outcome tracking) and all downstream features.
 */

// Types for event logging

export interface CampaignSendLog {
    campaignId: string;
    recipientEmail: string;
    recipientId?: string;
    sentAt?: Date;
}

export interface WorkflowExecutionLog {
    workflowId: string;
    triggeredBy: 'contact_created' | 'email_opened' | 'scheduled' | 'manual' | string;
    triggeredContactId?: string;
    actionType: 'send_email' | 'score_lead' | 'send_notification' | 'enrich_data' | string;
    actionResult: 'success' | 'failed' | 'partial' | 'pending';
    actionError?: string;
    recipientsAffected?: number;
    metadata?: Record<string, any>;
}

export interface ContactSnapshotLog {
    contactId: string;
    snapshotReason: 'before_campaign' | 'after_workflow' | 'daily_recalc' | 'email_received';
    relatedCampaignId?: string;
    relatedWorkflowId?: string;
}

export interface ContactScores {
    healthScore: number;
    momentumScore: number;
    isHotLead: boolean;
    closerSignal?: string;
}

// Main service class

class EventLoggingService {
    /**
     * Log campaign sends to database
     * Called after SMTP send completes
     */
    async logCampaignSends(
        campaignId: string,
        recipients: CampaignSendLog[]
    ): Promise<{ success: boolean; created: number; errors: any[] }> {
        try {
            const response = await fetch(`/api/campaigns/${campaignId}/log-sends`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipients })
            });

            if (!response.ok) {
                throw new Error(`Failed to log campaign sends: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error logging campaign sends:', error);
            return {
                success: false,
                created: 0,
                errors: [error instanceof Error ? error.message : String(error)]
            };
        }
    }

    /**
     * Log workflow execution
     * Called after workflow is triggered/executed
     */
    async logWorkflowExecution(
        workflowId: string,
        execution: WorkflowExecutionLog
    ): Promise<{ success: boolean; executionId?: string; error?: string }> {
        try {
            const response = await fetch(`/api/workflows/${workflowId}/log-execution`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(execution)
            });

            if (!response.ok) {
                throw new Error(`Failed to log workflow execution: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error logging workflow execution:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Capture a contact's current state as a snapshot
     * Called before and after actions to measure impact
     */
    async captureContactSnapshot(
        contactId: string,
        snapshot: ContactSnapshotLog
    ): Promise<{ success: boolean; snapshotId?: string; scores?: ContactScores; error?: string }> {
        try {
            const response = await fetch(`/api/contacts/${contactId}/snapshot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(snapshot)
            });

            if (!response.ok) {
                throw new Error(`Failed to capture snapshot: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error capturing contact snapshot:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Get recent snapshots for a contact
     * Used to retrieve before/after snapshots for correlation
     */
    async getContactSnapshots(
        contactId: string,
        snapshotReason?: string,
        limit: number = 10
    ): Promise<{ snapshots: any[]; error?: string }> {
        try {
            const params = new URLSearchParams();
            if (snapshotReason) params.append('snapshot_reason', snapshotReason);
            params.append('limit', String(limit));

            const response = await fetch(
                `/api/contacts/${contactId}/snapshot?${params.toString()}`,
                { method: 'GET' }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch snapshots: ${response.statusText}`);
            }

            const data = await response.json();
            return { snapshots: data.snapshots || [] };
        } catch (error) {
            console.error('Error fetching contact snapshots:', error);
            return {
                snapshots: [],
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Check event logging system health
     * Used for monitoring and debugging
     */
    async checkEventHealth(): Promise<{
        status: 'healthy' | 'degraded' | 'error';
        tables: Record<string, any>;
        recent_events: Record<string, any>;
        message: string;
    }> {
        try {
            const response = await fetch('/api/events/health', { method: 'GET' });

            if (!response.ok) {
                return {
                    status: 'error',
                    tables: {},
                    recent_events: {},
                    message: 'Failed to check event system health'
                };
            }

            return await response.json();
        } catch (error) {
            console.error('Error checking event health:', error);
            return {
                status: 'error',
                tables: {},
                recent_events: {},
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

// Export singleton instance
export const eventLogging = new EventLoggingService();

// Convenience exports

export async function logCampaignSends(
    campaignId: string,
    recipients: CampaignSendLog[]
) {
    return eventLogging.logCampaignSends(campaignId, recipients);
}

export async function logWorkflowExecution(
    workflowId: string,
    execution: WorkflowExecutionLog
) {
    return eventLogging.logWorkflowExecution(workflowId, execution);
}

export async function captureContactSnapshot(
    contactId: string,
    snapshot: ContactSnapshotLog
) {
    return eventLogging.captureContactSnapshot(contactId, snapshot);
}
