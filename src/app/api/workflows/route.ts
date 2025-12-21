import { NextResponse } from 'next/server';
import { workflowAutomation } from '@/automation/WorkflowEngine';

export async function GET() {
    try {
        const workflows = await workflowAutomation.getAllWorkflows();
        return NextResponse.json(workflows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const id = await workflowAutomation.createWorkflow(body);
        return NextResponse.json({ id, status: 'created' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
