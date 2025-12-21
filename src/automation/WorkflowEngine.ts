import { query } from '@/lib/db';
import { emailClient } from '@/lib/email';
import { modernCRM } from '@/crm/CustomerRelationshipEngine';

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
    // Management
    async createWorkflow(config: WorkflowConfig): Promise<string> {
        const res = await query(
            `INSERT INTO workflows (name, trigger_type, config, status)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [config.name, config.trigger, JSON.stringify(config.actions), config.status || 'active']
        );
        return res.rows[0].id;
    }

    async getWorkflowsByTrigger(trigger: string) {
        const res = await query(
            'SELECT * FROM workflows WHERE trigger_type = $1 AND status = $2',
            [trigger, 'active']
        );
        return res.rows;
    }

    async getAllWorkflows() {
        const res = await query('SELECT * FROM workflows ORDER BY created_at DESC');
        return res.rows;
    }

    // Execution Engine
    async trigger(event: string, context: { contactId?: string, data?: any }) {
        console.log(`Triggering workflows for event: ${event}`);
        const workflows = await this.getWorkflowsByTrigger(event);

        for (const wf of workflows) {
            console.log(`Executing workflow: ${wf.name}`);
            const actions = wf.config as WorkflowAction[];

            for (const action of actions) {
                await this.executeAction(action, context);
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