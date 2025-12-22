/**
 * GET /api/workflows/{id}/outcomes
 * POST /api/workflows/{id}/outcomes/recalculate
 *
 * Endpoints for workflow outcome data ("What Happened" layer)
 *
 * GET: Retrieve cached workflow outcomes
 * - execution metrics (success rate, failures)
 * - contact impact (score changes, new hot leads)
 * - top impacted contacts
 *
 * POST /recalculate: Force recalculation of outcomes
 * - Useful after workflow executions complete
 * - Called by daily batch job or admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { workflowOutcomeEngine } from '@/intelligence/WorkflowOutcomeEngine';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const workflowId = params.id;

        // Try cached outcomes first (fast path)
        const cached = await workflowOutcomeEngine.getCachedOutcomes(workflowId);

        if (cached) {
            return NextResponse.json({
                success: true,
                workflow_id: workflowId,
                source: 'cache',
                data: cached
            });
        }

        // No cache, calculate now
        const metrics = await workflowOutcomeEngine.calculateWorkflowMetrics(workflowId);
        const impact = await workflowOutcomeEngine.measureWorkflowImpact(workflowId);

        return NextResponse.json({
            success: true,
            workflow_id: workflowId,
            source: 'calculated',
            data: {
                metrics,
                impact,
                calculated_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error fetching workflow outcomes:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch workflow outcomes'
            },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const workflowId = params.id;
        const url = new URL(request.url);

        if (url.pathname.endsWith('/recalculate')) {
            // Force recalculation
            await workflowOutcomeEngine.cacheOutcomes(workflowId);

            return NextResponse.json({
                success: true,
                message: 'Workflow outcomes recalculated and cached',
                workflow_id: workflowId,
                recalculated_at: new Date().toISOString()
            });
        }

        return NextResponse.json(
            { error: 'Invalid endpoint' },
            { status: 404 }
        );
    } catch (error) {
        console.error('Error recalculating workflow outcomes:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to recalculate outcomes'
            },
            { status: 500 }
        );
    }
}
