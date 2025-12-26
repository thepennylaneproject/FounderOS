/**
 * Automation Hub API Routes
 *
 * Manage workflow automations
 */

import { NextResponse } from 'next/server';
import {
  getAutomationHub,
  WorkflowTrigger,
  WorkflowStep,
  WorkflowSettings,
  WORKFLOW_TEMPLATES,
} from '@/ai/AutomationHub';
import { ContactData } from '@/ai/PersonalizationEngine';

const automation = getAutomationHub();

/**
 * GET /api/ai/automation
 *
 * Get workflows and templates
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const userId = searchParams.get('userId');

    switch (action) {
      /**
       * List all workflows
       */
      case 'list': {
        const workflows = automation.getWorkflows(userId || undefined);
        return NextResponse.json({
          workflows: workflows.map(w => ({
            id: w.id,
            name: w.name,
            description: w.description,
            status: w.status,
            triggerType: w.trigger.type,
            stepCount: w.steps.length,
            stats: w.stats,
            createdAt: w.createdAt,
            updatedAt: w.updatedAt,
          })),
        });
      }

      /**
       * Get a specific workflow
       */
      case 'get': {
        const workflowId = searchParams.get('workflowId');
        if (!workflowId) {
          return NextResponse.json(
            { error: 'workflowId is required' },
            { status: 400 }
          );
        }

        const workflow = automation.getWorkflow(workflowId);
        if (!workflow) {
          return NextResponse.json(
            { error: 'Workflow not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({ workflow });
      }

      /**
       * Get workflow templates
       */
      case 'templates': {
        const category = searchParams.get('category');
        const templates = automation.getTemplates(category || undefined);

        return NextResponse.json({
          templates: templates.map(t => ({
            id: t.id,
            name: t.name,
            description: t.description,
            category: t.category,
            triggerType: t.trigger.type,
            stepCount: t.steps.length,
            tags: t.tags,
          })),
        });
      }

      /**
       * Get available triggers
       */
      case 'triggers': {
        const triggers = [
          { type: 'subscriber_added', label: 'New Subscriber', description: 'When someone joins your list' },
          { type: 'tag_added', label: 'Tag Added', description: 'When a tag is added to a contact' },
          { type: 'tag_removed', label: 'Tag Removed', description: 'When a tag is removed from a contact' },
          { type: 'segment_entered', label: 'Segment Entered', description: 'When contact matches segment criteria' },
          { type: 'segment_exited', label: 'Segment Exited', description: 'When contact no longer matches segment' },
          { type: 'email_opened', label: 'Email Opened', description: 'When a specific email is opened' },
          { type: 'email_clicked', label: 'Link Clicked', description: 'When a link in an email is clicked' },
          { type: 'form_submitted', label: 'Form Submitted', description: 'When a form is submitted' },
          { type: 'purchase_made', label: 'Purchase Made', description: 'When a purchase is completed' },
          { type: 'date_based', label: 'Date-Based', description: 'On a specific date field (birthday, anniversary)' },
          { type: 'api_triggered', label: 'API Trigger', description: 'Triggered via API webhook' },
          { type: 'manual', label: 'Manual', description: 'Manually add contacts' },
        ];

        return NextResponse.json({ triggers });
      }

      /**
       * Get available step types
       */
      case 'steps': {
        const steps = [
          // Communication
          { type: 'send_email', label: 'Send Email', category: 'communication', description: 'Send an email to the contact' },
          { type: 'send_sms', label: 'Send SMS', category: 'communication', description: 'Send an SMS message' },

          // Timing
          { type: 'delay', label: 'Delay', category: 'timing', description: 'Wait for a specified duration' },
          { type: 'wait_until', label: 'Wait Until', category: 'timing', description: 'Wait until a specific time/day' },

          // Logic
          { type: 'condition', label: 'If/Then', category: 'logic', description: 'Branch based on conditions' },
          { type: 'split_test', label: 'A/B Split', category: 'logic', description: 'Split contacts into test groups' },
          { type: 'goal_check', label: 'Goal Check', category: 'logic', description: 'Check if contact achieved goal' },

          // Data
          { type: 'update_contact', label: 'Update Contact', category: 'data', description: 'Update contact fields' },
          { type: 'add_tag', label: 'Add Tag', category: 'data', description: 'Add a tag to the contact' },
          { type: 'remove_tag', label: 'Remove Tag', category: 'data', description: 'Remove a tag from contact' },

          // AI-Powered
          { type: 'ai_generate_email', label: 'AI Generate Email', category: 'ai', description: 'Generate email content with AI' },
          { type: 'ai_personalize', label: 'AI Personalize', category: 'ai', description: 'AI-powered content personalization' },
          { type: 'ai_score_lead', label: 'AI Score Lead', category: 'ai', description: 'Score lead with AI analysis' },

          // Integration
          { type: 'webhook', label: 'Webhook', category: 'integration', description: 'Call external webhook' },
          { type: 'notify_team', label: 'Notify Team', category: 'integration', description: 'Send notification to team' },

          // Control
          { type: 'end_workflow', label: 'End', category: 'control', description: 'End the workflow' },
        ];

        return NextResponse.json({ steps });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Automation GET Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/automation
 *
 * Create and manage workflows
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      /**
       * Create a new workflow
       */
      case 'create': {
        const { name, trigger, steps, settings, description } = body as {
          name: string;
          trigger: WorkflowTrigger;
          steps: WorkflowStep[];
          settings?: Partial<WorkflowSettings>;
          description?: string;
        };

        if (!name || !trigger || !steps) {
          return NextResponse.json(
            { error: 'name, trigger, and steps are required' },
            { status: 400 }
          );
        }

        const workflow = automation.createWorkflow(
          name,
          trigger,
          steps,
          settings,
          description,
          userId
        );

        return NextResponse.json({ workflow });
      }

      /**
       * Create from template
       */
      case 'create-from-template': {
        const { templateId, name } = body;

        if (!templateId || !name) {
          return NextResponse.json(
            { error: 'templateId and name are required' },
            { status: 400 }
          );
        }

        const workflow = automation.createFromTemplate(templateId, name, userId);

        if (!workflow) {
          return NextResponse.json(
            { error: 'Template not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({ workflow });
      }

      /**
       * Activate workflow
       */
      case 'activate': {
        const { workflowId } = body;

        if (!workflowId) {
          return NextResponse.json(
            { error: 'workflowId is required' },
            { status: 400 }
          );
        }

        const success = automation.activateWorkflow(workflowId);

        if (!success) {
          return NextResponse.json(
            { error: 'Workflow not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({ success: true });
      }

      /**
       * Pause workflow
       */
      case 'pause': {
        const { workflowId } = body;

        if (!workflowId) {
          return NextResponse.json(
            { error: 'workflowId is required' },
            { status: 400 }
          );
        }

        const success = automation.pauseWorkflow(workflowId);

        if (!success) {
          return NextResponse.json(
            { error: 'Workflow not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({ success: true });
      }

      /**
       * Start workflow for a contact
       */
      case 'start-execution': {
        const { workflowId, contact } = body as {
          workflowId: string;
          contact: ContactData;
        };

        if (!workflowId || !contact) {
          return NextResponse.json(
            { error: 'workflowId and contact are required' },
            { status: 400 }
          );
        }

        const execution = await automation.startExecution(workflowId, contact);

        if (!execution) {
          return NextResponse.json(
            { error: 'Could not start execution (workflow not active or limit reached)' },
            { status: 400 }
          );
        }

        return NextResponse.json({ execution });
      }

      /**
       * Get AI suggestions for workflow
       */
      case 'suggest-improvements': {
        const { workflowId } = body;

        if (!workflowId) {
          return NextResponse.json(
            { error: 'workflowId is required' },
            { status: 400 }
          );
        }

        const suggestions = await automation.suggestImprovements(workflowId);

        return NextResponse.json(suggestions);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Automation POST Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ai/automation
 *
 * Update workflows
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { workflowId, updates } = body;

    if (!workflowId) {
      return NextResponse.json(
        { error: 'workflowId is required' },
        { status: 400 }
      );
    }

    const workflow = automation.updateWorkflow(workflowId, updates);

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ workflow });
  } catch (error: any) {
    console.error('Automation PUT Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai/automation
 *
 * Delete workflows
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');

    if (!workflowId) {
      return NextResponse.json(
        { error: 'workflowId is required' },
        { status: 400 }
      );
    }

    const deleted = automation.deleteWorkflow(workflowId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Automation DELETE Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
