import { NextRequest, NextResponse } from 'next/server';
import { eventLoggingEngine } from '@/intelligence/EventLoggingEngine';

/**
 * POST /api/workflows/{id}/log-execution
 *
 * Logs a workflow execution event to the workflow_executions table.
 * Called by workflow engine after each trigger/execution.
 *
 * Body: {
 *   triggered_by: string,      // "contact_created", "email_opened", "scheduled", etc.
 *   triggered_contact_id?: string,
 *   action_type: string,       // "send_email", "score_lead", "send_notification", "enrich_data"
 *   action_result: string,     // "success", "failed", "partial", "pending"
 *   action_error?: string,
 *   recipients_affected: number,
 *   metadata?: object
 * }
 *
 * Response: { success: boolean, execution_id: string, workflow_id: string }
 */

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const workflowId = params.id;
        const body = await request.json();

        const {
            triggered_by,
            triggered_contact_id,
            action_type,
            action_result = 'pending',
            action_error,
            recipients_affected = 1,
            metadata = {}
        } = body;

        // Validation
        if (!triggered_by || !action_type) {
            return NextResponse.json(
                { error: 'triggered_by and action_type required' },
                { status: 400 }
            );
        }

        // Log workflow execution to database
        const result = await eventLoggingEngine.logWorkflowExecution(
            workflowId,
            triggered_by,
            triggered_contact_id,
            action_type,
            action_result as 'success' | 'failed' | 'partial' | 'pending',
            recipients_affected,
            metadata,
            action_error
        );

        return NextResponse.json({
            success: true,
            execution_id: result.id,
            workflow_id: workflowId,
            action_type: result.action_type,
            action_result: result.action_result,
            recipients_affected: result.recipients_affected,
            logged_at: result.executed_at
        });

    } catch (error) {
        console.error('Error logging workflow execution:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to log workflow execution'
            },
            { status: 500 }
        );
    }
}
