/**
 * Event Logging Engine (Server-Side)
 *
 * Handles all database operations for event logging, snapshots, and health checks.
 * This is the core of Phase 0 - Event Logging Foundation.
 *
 * Key responsibilities:
 * 1. Campaign send tracking (campaign_sends)
 * 2. Workflow execution logging (workflow_executions)
 * 3. Contact state snapshots (contact_score_snapshots)
 * 4. Event system health monitoring
 */

import { query } from '@/lib/db';

export interface CampaignSendRecord {
    id: string;
    campaign_id: string;
    recipient_email: string;
    recipient_id: string;
    sent_at: Date;
}

export interface WorkflowExecutionRecord {
    id: string;
    workflow_id: string;
    triggered_by: string;
    triggered_contact_id?: string;
    action_type: string;
    action_result: 'success' | 'failed' | 'partial' | 'pending';
    action_error?: string;
    recipients_affected?: number;
    metadata?: Record<string, any>;
    executed_at: Date;
}

export interface ContactScoreSnapshot {
    id: string;
    contact_id: string;
    snapshot_reason: string;
    related_campaign_id?: string;
    related_workflow_id?: string;
    health_score: number;
    momentum_score: number;
    is_hot_lead: boolean;
    closer_signal?: string;
    captured_at: Date;
}

export interface EventHealthStatus {
    status: 'healthy' | 'degraded' | 'error';
    tables: {
        campaign_sends: number;
        workflow_executions: number;
        contact_score_snapshots: number;
        domain_health_alerts: number;
        triage_rules: number;
    };
    recent_events: {
        last_campaign_send?: Date;
        last_workflow_execution?: Date;
        last_snapshot?: Date;
    };
    message: string;
}

export class EventLoggingEngine {
    /**
     * Log a campaign send to the database
     * Called after SMTP successfully sends an email
     */
    async logCampaignSend(
        campaignId: string,
        recipientEmail: string,
        recipientId: string
    ): Promise<CampaignSendRecord> {
        try {
            const res = await query(
                `INSERT INTO campaign_sends (
                    campaign_id,
                    recipient_email,
                    recipient_id,
                    sent_at
                ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                RETURNING id, campaign_id, recipient_email, recipient_id, sent_at`,
                [campaignId, recipientEmail, recipientId]
            );

            if (!res.rows || res.rows.length === 0) {
                throw new Error('Failed to insert campaign send record');
            }

            return res.rows[0];
        } catch (error) {
            console.error('Error logging campaign send:', error);
            throw error;
        }
    }

    /**
     * Log multiple campaign sends in batch
     * More efficient than individual inserts
     */
    async logCampaignSends(
        campaignId: string,
        recipients: Array<{ email: string; contact_id: string }>
    ): Promise<{ created: number; failed: number; records: CampaignSendRecord[] }> {
        const records: CampaignSendRecord[] = [];
        let failed = 0;

        try {
            // Use a transaction for consistency
            await query('BEGIN');

            for (const recipient of recipients) {
                try {
                    const res = await query(
                        `INSERT INTO campaign_sends (
                            campaign_id,
                            recipient_email,
                            recipient_id,
                            sent_at
                        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                        RETURNING id, campaign_id, recipient_email, recipient_id, sent_at`,
                        [campaignId, recipient.email, recipient.contact_id]
                    );

                    if (res.rows && res.rows.length > 0) {
                        records.push(res.rows[0]);
                    }
                } catch (err) {
                    console.error(`Failed to log send for ${recipient.email}:`, err);
                    failed++;
                }
            }

            // Update campaign outcome_cache with send count
            await query(
                `UPDATE campaigns SET outcome_cache = jsonb_set(
                    COALESCE(outcome_cache, '{}'::jsonb),
                    '{total_sends}',
                    to_jsonb($1::int)
                ) WHERE id = $2`,
                [records.length, campaignId]
            );

            await query('COMMIT');

            return {
                created: records.length,
                failed,
                records
            };
        } catch (error) {
            await query('ROLLBACK');
            console.error('Error logging campaign sends batch:', error);
            throw error;
        }
    }

    /**
     * Log a workflow execution
     */
    async logWorkflowExecution(
        workflowId: string,
        triggeredBy: string,
        triggeredContactId: string | undefined,
        actionType: string,
        actionResult: 'success' | 'failed' | 'partial' | 'pending',
        recipientsAffected: number = 0,
        metadata?: Record<string, any>,
        actionError?: string
    ): Promise<WorkflowExecutionRecord> {
        try {
            const res = await query(
                `INSERT INTO workflow_executions (
                    workflow_id,
                    triggered_by,
                    triggered_contact_id,
                    action_type,
                    action_result,
                    recipients_affected,
                    metadata,
                    action_error,
                    executed_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
                RETURNING id, workflow_id, triggered_by, triggered_contact_id, action_type, action_result, recipients_affected, metadata, action_error, executed_at`,
                [
                    workflowId,
                    triggeredBy,
                    triggeredContactId || null,
                    actionType,
                    actionResult,
                    recipientsAffected,
                    metadata ? JSON.stringify(metadata) : null,
                    actionError || null
                ]
            );

            if (!res.rows || res.rows.length === 0) {
                throw new Error('Failed to insert workflow execution record');
            }

            // Update workflow outcome_cache
            if (actionResult === 'success') {
                await query(
                    `UPDATE workflows SET outcome_cache = jsonb_set(
                        COALESCE(outcome_cache, '{}'::jsonb),
                        '{last_execution}',
                        to_jsonb(NOW())
                    ) WHERE id = $1`,
                    [workflowId]
                );
            }

            return res.rows[0];
        } catch (error) {
            console.error('Error logging workflow execution:', error);
            throw error;
        }
    }

    /**
     * Capture a contact's current score state as a snapshot
     * Used for before/after measurements of campaign/workflow impact
     */
    async captureContactSnapshot(
        contactId: string,
        snapshotReason: string,
        relatedCampaignId?: string,
        relatedWorkflowId?: string
    ): Promise<ContactScoreSnapshot> {
        try {
            // Get current contact scores
            const contactRes = await query(
                `SELECT health_score, momentum_score, is_hot_lead, closer_signal
                 FROM contacts WHERE id = $1`,
                [contactId]
            );

            if (!contactRes.rows || contactRes.rows.length === 0) {
                throw new Error(`Contact not found: ${contactId}`);
            }

            const contact = contactRes.rows[0];

            // Insert snapshot
            const res = await query(
                `INSERT INTO contact_score_snapshots (
                    contact_id,
                    snapshot_reason,
                    related_campaign_id,
                    related_workflow_id,
                    health_score,
                    momentum_score,
                    is_hot_lead,
                    closer_signal,
                    captured_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
                RETURNING id, contact_id, snapshot_reason, related_campaign_id, related_workflow_id, health_score, momentum_score, is_hot_lead, closer_signal, captured_at`,
                [
                    contactId,
                    snapshotReason,
                    relatedCampaignId || null,
                    relatedWorkflowId || null,
                    contact.health_score || 0,
                    contact.momentum_score || 0,
                    contact.is_hot_lead || false,
                    contact.closer_signal || null
                ]
            );

            if (!res.rows || res.rows.length === 0) {
                throw new Error('Failed to insert contact snapshot record');
            }

            return res.rows[0];
        } catch (error) {
            console.error('Error capturing contact snapshot:', error);
            throw error;
        }
    }

    /**
     * Get contact snapshots with optional filtering
     * Used to retrieve before/after snapshots for correlation analysis
     */
    async getContactSnapshots(
        contactId: string,
        snapshotReason?: string,
        limit: number = 10
    ): Promise<ContactScoreSnapshot[]> {
        try {
            let sql = 'SELECT * FROM contact_score_snapshots WHERE contact_id = $1';
            const params: any[] = [contactId];
            let paramCount = 2;

            if (snapshotReason) {
                sql += ` AND snapshot_reason = $${paramCount}`;
                params.push(snapshotReason);
                paramCount++;
            }

            sql += ` ORDER BY captured_at DESC LIMIT $${paramCount}`;
            params.push(limit);

            const res = await query(sql, params);
            return res.rows || [];
        } catch (error) {
            console.error('Error fetching contact snapshots:', error);
            throw error;
        }
    }

    /**
     * Calculate contact engagement delta
     * Uses the database helper function to efficiently compare before/after snapshots
     */
    async getContactEngagementDelta(
        contactId: string,
        beforeSnapshotId: string,
        afterSnapshotId: string
    ): Promise<{ delta: number; before: ContactScoreSnapshot; after: ContactScoreSnapshot }> {
        try {
            const delta = await query(
                `SELECT get_contact_engagement_delta($1::uuid, $2::uuid, $3::int) as delta`,
                [contactId, beforeSnapshotId, 0]
            );

            // Also fetch the actual snapshots for context
            const before = await query(
                'SELECT * FROM contact_score_snapshots WHERE id = $1',
                [beforeSnapshotId]
            );
            const after = await query(
                'SELECT * FROM contact_score_snapshots WHERE id = $1',
                [afterSnapshotId]
            );

            return {
                delta: delta.rows[0]?.delta || 0,
                before: before.rows[0],
                after: after.rows[0]
            };
        } catch (error) {
            console.error('Error calculating engagement delta:', error);
            throw error;
        }
    }

    /**
     * Get event system health status
     * Used for monitoring and debugging
     */
    async getEventHealth(): Promise<EventHealthStatus> {
        try {
            // Count records in each table (last 24 hours)
            const counts = await query(`
                SELECT
                    (SELECT COUNT(*) FROM campaign_sends WHERE sent_at > NOW() - INTERVAL '24 hours') as campaign_sends_24h,
                    (SELECT COUNT(*) FROM workflow_executions WHERE executed_at > NOW() - INTERVAL '24 hours') as workflow_executions_24h,
                    (SELECT COUNT(*) FROM contact_score_snapshots WHERE captured_at > NOW() - INTERVAL '24 hours') as snapshots_24h,
                    (SELECT COUNT(*) FROM domain_health_alerts WHERE created_at > NOW() - INTERVAL '24 hours') as domain_alerts_24h,
                    (SELECT COUNT(*) FROM triage_rules) as triage_rules_total,
                    (SELECT MAX(sent_at) FROM campaign_sends) as last_campaign_send,
                    (SELECT MAX(executed_at) FROM workflow_executions) as last_workflow_execution,
                    (SELECT MAX(captured_at) FROM contact_score_snapshots) as last_snapshot
            `);

            const data = counts.rows[0];

            // Determine health status
            const has_recent_activity =
                data.campaign_sends_24h > 0 ||
                data.workflow_executions_24h > 0 ||
                data.snapshots_24h > 0;

            const status = has_recent_activity ? 'healthy' : 'degraded';

            return {
                status,
                tables: {
                    campaign_sends: data.campaign_sends_24h || 0,
                    workflow_executions: data.workflow_executions_24h || 0,
                    contact_score_snapshots: data.snapshots_24h || 0,
                    domain_health_alerts: data.domain_alerts_24h || 0,
                    triage_rules: data.triage_rules_total || 0
                },
                recent_events: {
                    last_campaign_send: data.last_campaign_send,
                    last_workflow_execution: data.last_workflow_execution,
                    last_snapshot: data.last_snapshot
                },
                message: has_recent_activity
                    ? 'Event logging system operational'
                    : 'Event logging system idle (no recent activity)'
            };
        } catch (error) {
            console.error('Error getting event health:', error);
            return {
                status: 'error',
                tables: {
                    campaign_sends: 0,
                    workflow_executions: 0,
                    contact_score_snapshots: 0,
                    domain_health_alerts: 0,
                    triage_rules: 0
                },
                recent_events: {},
                message: error instanceof Error ? error.message : 'Unknown error checking event health'
            };
        }
    }

    /**
     * Record a domain health alert
     * Called when domain health metrics change
     */
    async recordDomainHealthAlert(
        domainId: string,
        alertType: string,
        severity: 'critical' | 'warning' | 'info',
        message: string,
        metadata?: Record<string, any>
    ): Promise<{ id: string }> {
        try {
            const res = await query(
                `INSERT INTO domain_health_alerts (
                    domain_id,
                    alert_type,
                    severity,
                    message,
                    metadata
                ) VALUES ($1, $2, $3, $4, $5)
                RETURNING id`,
                [
                    domainId,
                    alertType,
                    severity,
                    message,
                    metadata ? JSON.stringify(metadata) : null
                ]
            );

            return { id: res.rows[0].id };
        } catch (error) {
            console.error('Error recording domain health alert:', error);
            throw error;
        }
    }

    /**
     * Save or update a triage rule
     * Allows customization of contact tiering logic
     */
    async saveSTriageRule(
        ruleId: string | undefined,
        name: string,
        description: string,
        condition: Record<string, any>,
        action: Record<string, any>
    ): Promise<{ id: string }> {
        try {
            if (ruleId) {
                // Update existing rule
                const res = await query(
                    `UPDATE triage_rules SET name = $1, description = $2, condition = $3, action = $4, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $5 RETURNING id`,
                    [name, description, JSON.stringify(condition), JSON.stringify(action), ruleId]
                );
                return { id: res.rows[0].id };
            } else {
                // Create new rule
                const res = await query(
                    `INSERT INTO triage_rules (name, description, condition, action) VALUES ($1, $2, $3, $4) RETURNING id`,
                    [name, description, JSON.stringify(condition), JSON.stringify(action)]
                );
                return { id: res.rows[0].id };
            }
        } catch (error) {
            console.error('Error saving triage rule:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const eventLoggingEngine = new EventLoggingEngine();
