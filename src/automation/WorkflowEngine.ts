import supabase from '@/lib/supabase';
import { emailClient } from '@/lib/email';
import { modernCRM } from '@/crm/CustomerRelationshipEngine';
import { eventLoggingEngine } from '@/intelligence/EventLoggingEngine';

export interface WorkflowAction {
    action: string;
    params?: any;
    delay?: string;
}

export interface WorkflowConfig {
    id?: string;
    name: string;
    trigger: string;
    actions: WorkflowAction[];
    status?: string;
}

export class WorkflowAutomation {
    async createWorkflow(config: WorkflowConfig): Promise<string> {
        const { data, error } = await supabase
            .from('workflows')
            .insert({
                name: config.name,
                trigger_type: config.trigger,
                config: config.actions,
                status: config.status || 'active'
            })
            .select('id')
            .single();
        
        if (error) throw error;
        return data.id;
    }

    async getWorkflowsByTrigger(trigger: string) {
        const { data, error } = await supabase
            .from('workflows')
            .select('*')
            .eq('trigger_type', trigger)
            .eq('status', 'active');
        
        if (error) throw error;
        return data || [];
    }

    async getAllWorkflows() {
        const { data, error } = await supabase
            .from('workflows')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    }

    async trigger(event: string, context: { contactId?: string, data?: any }) {
        console.log(`Triggering workflows for event: ${event}`);
        const workflows = await this.getWorkflowsByTrigger(event);

        for (const wf of workflows) {
            console.log(`Executing workflow: ${wf.name}`);

            // Parse config safely with error handling
            let actions: WorkflowAction[] = [];
            try {
                actions = typeof wf.config === 'string'
                    ? JSON.parse(wf.config)
                    : (wf.config as WorkflowAction[]);
            } catch (parseErr) {
                console.error(`Failed to parse workflow config for ${wf.name}:`, parseErr);
                // Log the parse error and skip this workflow
                try {
                    await eventLoggingEngine.logWorkflowExecution(
                        wf.id,
                        event,
                        context.contactId,
                        'config-parse',
                        'failed',
                        0,
                        { workflow_name: wf.name },
                        `Config parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`
                    );
                } catch (logErr) {
                    console.error('Failed to log workflow parse error:', logErr);
                }
                continue; // Skip to next workflow
            }

            let executionResult: 'success' | 'failed' | 'partial' = 'success';
            let actionErrors: string[] = [];
            let totalActions = 0;
            let successCount = 0;

            for (const action of actions) {
                try {
                    totalActions++;
                    await this.executeAction(action, context);
                    successCount++;
                } catch (err) {
                    actionErrors.push(err instanceof Error ? err.message : String(err));
                    console.error(`Action ${action.action} failed:`, err);
                }
            }

            // Determine result: success only if all succeeded, partial if some succeeded
            if (actionErrors.length === 0) {
                executionResult = 'success';
            } else if (successCount > 0) {
                executionResult = 'partial';
            } else {
                executionResult = 'failed';
            }

            if (totalActions > 0) {
                try {
                    const primaryAction = actions[0]?.action || 'unknown';

                    await eventLoggingEngine.logWorkflowExecution(
                        wf.id,
                        event,
                        context.contactId,
                        primaryAction,
                        executionResult,
                        context.contactId ? 1 : 0,
                        {
                            workflow_name: wf.name,
                            total_actions: totalActions,
                            actions_executed: actions.map((a: WorkflowAction) => a.action)
                        },
                        actionErrors.length > 0 ? actionErrors.join('; ') : undefined
                    );
                    console.log(`Event logged: workflow ${wf.name} execution recorded`);
                } catch (err) {
                    console.error('Failed to log workflow execution to event system:', err);
                }
            }
        }
    }

    private async executeAction(action: WorkflowAction, context: any) {
        console.log(`Executing action: ${action.action}`, { action, context });

        switch (action.action) {
            case 'send-email':
                if (context.contactId) {
                    const contact = await modernCRM.getContact(context.contactId);
                    await emailClient.sendEmail({
                        from: 'automation@founderos.local',
                        to: contact.email,
                        subject: action.params?.subject || 'Notification',
                        body: action.params?.body || 'This is an automated message.'
                    });
                }
                break;
            case 'enrich-contact':
                if (context.contactId) {
                    await modernCRM.enrichContact(context.contactId);
                }
                break;
            case 'score-lead':
                if (context.contactId) {
                    await modernCRM.scoreLead(context.contactId);
                }
                break;
            default:
                console.warn(`Unknown action: ${action.action}`);
        }
    }
}

export const workflowAutomation = new WorkflowAutomation();
