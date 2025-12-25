/**
 * Workflow Outcome Engine
 *
 * Purpose: Correlate workflow executions with contact score changes to answer
 * "What happened when we triggered this workflow?"
 *
 * Key responsibilities:
 * 1. Measure workflow execution results (success rate, action completion)
 * 2. Calculate impact on contact scores using before/after snapshots
 * 3. Identify which contacts benefited from workflow actions
 * 4. Cache outcomes for dashboard performance
 *
 * Dependencies:
 * - workflow_executions table (from Phase 0)
 * - contact_score_snapshots table (from Phase 0)
 * - workflows table (existing)
 */

import { query } from '@/lib/db';

export interface WorkflowExecutionMetrics {
    workflow_id: string;
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    partial_executions: number;
    success_rate: number;
    avg_recipients_affected: number;
}

export interface ContactWorkflowOutcome {
    contact_id: string;
    email: string;
    execution_status: 'success' | 'failed' | 'partial';
    action_type: string;
    triggered_by: string;
    score_impact: number;
    momentum_impact: number;
    is_hot_lead_now: boolean;
    executed_at: Date;
}

export interface WorkflowImpactAnalysis {
    workflow_id: string;
    workflow_name: string;
    total_executions: number;
    contacts_affected: number;
    total_score_gain: number;
    avg_score_impact: number;
    success_rate: number;
    hot_leads_created: number;
    momentum_gain: number;
    failed_executions: number;
    top_impacted_contacts: ContactWorkflowOutcome[];
}

export class WorkflowOutcomeEngine {
    /**
     * Calculate execution metrics for a workflow
     * Correlates workflow_executions with outcomes
     */
    async calculateWorkflowMetrics(
        workflowId: string
    ): Promise<WorkflowExecutionMetrics> {
        try {
            const result = await query(
                `
                SELECT
                    $1::uuid as workflow_id,
                    COUNT(*) as total_executions,
                    COUNT(CASE WHEN action_result = 'success' THEN 1 END) as successful_executions,
                    COUNT(CASE WHEN action_result = 'failed' THEN 1 END) as failed_executions,
                    COUNT(CASE WHEN action_result = 'partial' THEN 1 END) as partial_executions,
                    ROUND(
                        (COUNT(CASE WHEN action_result = 'success' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100,
                        2
                    ) as success_rate,
                    ROUND(AVG(COALESCE(recipients_affected, 1))::NUMERIC, 2) as avg_recipients_affected
                FROM workflow_executions
                WHERE workflow_id = $1
                `,
                [workflowId]
            );

            if (!result.rows || result.rows.length === 0) {
                throw new Error('Workflow not found or no executions recorded');
            }

            const metrics = result.rows[0];

            return {
                workflow_id: workflowId,
                total_executions: parseInt(metrics.total_executions) || 0,
                successful_executions: parseInt(metrics.successful_executions) || 0,
                failed_executions: parseInt(metrics.failed_executions) || 0,
                partial_executions: parseInt(metrics.partial_executions) || 0,
                success_rate: parseFloat(metrics.success_rate) || 0,
                avg_recipients_affected: parseFloat(metrics.avg_recipients_affected) || 1
            };
        } catch (error) {
            console.error('Error calculating workflow metrics:', error);
            throw error;
        }
    }

    /**
     * Measure workflow impact on contacts using before/after snapshots
     * Shows which contacts benefited from workflow actions
     */
    async measureWorkflowImpact(
        workflowId: string
    ): Promise<WorkflowImpactAnalysis> {
        try {
            // Get workflow name
            const workflowRes = await query(
                'SELECT name FROM workflows WHERE id = $1',
                [workflowId]
            );

            if (!workflowRes.rows || workflowRes.rows.length === 0) {
                throw new Error('Workflow not found');
            }

            const workflowName = workflowRes.rows[0].name;

            // Get before/after snapshots for this workflow
            const snapshotsRes = await query(
                `
                SELECT
                    contact_id,
                    snapshot_reason,
                    health_score,
                    momentum_score,
                    is_hot_lead,
                    captured_at
                FROM contact_score_snapshots
                WHERE related_workflow_id = $1
                ORDER BY contact_id, captured_at ASC
                `,
                [workflowId]
            );

            const snapshots = snapshotsRes.rows || [];
            const contactSnapshotMap = new Map<string, any[]>();

            // Group snapshots by contact
            for (const snapshot of snapshots) {
                if (!contactSnapshotMap.has(snapshot.contact_id)) {
                    contactSnapshotMap.set(snapshot.contact_id, []);
                }
                contactSnapshotMap.get(snapshot.contact_id)!.push(snapshot);
            }

            // Calculate deltas and impacts
            let totalContactsAffected = 0;
            let totalScoreDelta = 0;
            let hotLeadsCreated = 0;
            let momentumGain = 0;
            const contactOutcomes: ContactWorkflowOutcome[] = [];

            for (const [contactId, snapshotList] of contactSnapshotMap) {
                if (snapshotList.length >= 2) {
                    const before = snapshotList[0];
                    const after = snapshotList[snapshotList.length - 1];

                    const scoreDelta = (after.health_score || 0) - (before.health_score || 0);
                    const momentumDelta = (after.momentum_score || 0) - (before.momentum_score || 0);

                    totalContactsAffected++;
                    totalScoreDelta += scoreDelta;

                    if (momentumDelta > 0) {
                        momentumGain += momentumDelta;
                    }

                    if (!before.is_hot_lead && after.is_hot_lead) {
                        hotLeadsCreated++;
                    }

                    // Get contact email for outcome
                    const contactRes = await query(
                        'SELECT email FROM contacts WHERE id = $1',
                        [contactId]
                    );

                    const email = contactRes.rows?.[0]?.email || 'unknown';

                    // Get execution status for this contact
                    const execRes = await query(
                        `SELECT action_result, action_type, triggered_by, executed_at
                         FROM workflow_executions
                         WHERE workflow_id = $1 AND triggered_contact_id = $2
                         ORDER BY executed_at DESC LIMIT 1`,
                        [workflowId, contactId]
                    );

                    const exec = execRes.rows?.[0];

                    if (exec) {
                        contactOutcomes.push({
                            contact_id: contactId,
                            email,
                            execution_status: exec.action_result,
                            action_type: exec.action_type,
                            triggered_by: exec.triggered_by,
                            score_impact: scoreDelta,
                            momentum_impact: momentumDelta,
                            is_hot_lead_now: after.is_hot_lead,
                            executed_at: exec.executed_at
                        });
                    }
                }
            }

            // Get execution metrics
            const metrics = await this.calculateWorkflowMetrics(workflowId);

            // Sort by impact
            const topImpacted = [...contactOutcomes]
                .sort((a, b) => b.score_impact - a.score_impact)
                .slice(0, 10);

            const avgScoreImpact = totalContactsAffected > 0 ? totalScoreDelta / totalContactsAffected : 0;

            return {
                workflow_id: workflowId,
                workflow_name: workflowName,
                total_executions: metrics.total_executions,
                contacts_affected: totalContactsAffected,
                total_score_gain: totalScoreDelta,
                avg_score_impact: parseFloat(avgScoreImpact.toFixed(2)),
                success_rate: metrics.success_rate,
                hot_leads_created: hotLeadsCreated,
                momentum_gain: Math.round(momentumGain),
                failed_executions: metrics.failed_executions,
                top_impacted_contacts: topImpacted
            };
        } catch (error) {
            console.error('Error measuring workflow impact:', error);
            throw error;
        }
    }

    /**
     * Cache workflow outcomes to workflows.outcome_cache
     */
    async cacheOutcomes(workflowId: string): Promise<void> {
        try {
            const metrics = await this.calculateWorkflowMetrics(workflowId);
            const impact = await this.measureWorkflowImpact(workflowId);

            const cacheData = {
                metrics,
                impact,
                cached_at: new Date().toISOString()
            };

            await query(
                `UPDATE workflows SET outcome_cache = $1::jsonb WHERE id = $2`,
                [JSON.stringify(cacheData), workflowId]
            );

            console.log(`Cached outcomes for workflow ${workflowId}`);
        } catch (error) {
            console.error('Error caching workflow outcomes:', error);
            throw error;
        }
    }

    /**
     * Get cached outcomes (fast path for dashboard)
     */
    async getCachedOutcomes(workflowId: string): Promise<any> {
        try {
            const result = await query(
                `SELECT outcome_cache FROM workflows WHERE id = $1`,
                [workflowId]
            );

            if (!result.rows || result.rows.length === 0) {
                return null;
            }

            return result.rows[0].outcome_cache;
        } catch (error) {
            console.error('Error fetching cached outcomes:', error);
            throw error;
        }
    }

    /**
     * Recalculate outcomes for all active workflows
     * Run daily or as part of batch job
     */
    async recalculateAllOutcomes(): Promise<{ success: number; failed: number }> {
        try {
            // Get all workflows
            const workflowsRes = await query(
                `SELECT id FROM workflows ORDER BY updated_at DESC LIMIT 100`
            );

            const workflows = workflowsRes.rows || [];
            let success = 0;
            let failed = 0;

            for (const workflow of workflows) {
                try {
                    await this.cacheOutcomes(workflow.id);
                    success++;
                } catch (err) {
                    console.error(`Failed to cache outcomes for workflow ${workflow.id}:`, err);
                    failed++;
                }
            }

            console.log(`Workflow outcome recalculation: ${success} succeeded, ${failed} failed`);
            return { success, failed };
        } catch (error) {
            console.error('Error recalculating all workflow outcomes:', error);
            throw error;
        }
    }
}

// Export singleton
export const workflowOutcomeEngine = new WorkflowOutcomeEngine();
