/**
 * Automation Hub
 *
 * Zapier-style workflow automation with AI-powered steps.
 * Create sophisticated email sequences with triggers, conditions,
 * delays, and AI content generation.
 */

import { v4 as uuid } from 'uuid';
import { getRouter } from './AIRouter';
import { getCopywriter } from './Copywriter';
import { getPersonalizationEngine, ContactData } from './PersonalizationEngine';

// ============================================================================
// Types
// ============================================================================

/**
 * A complete automation workflow
 */
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';

  // Trigger that starts the workflow
  trigger: WorkflowTrigger;

  // Steps in the workflow
  steps: WorkflowStep[];

  // Settings
  settings: WorkflowSettings;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;

  // Stats
  stats?: WorkflowStats;
}

export interface WorkflowSettings {
  // Timing
  timezone: string;
  respectQuietHours: boolean;
  quietHoursStart?: string;  // "22:00"
  quietHoursEnd?: string;    // "08:00"

  // Limits
  maxEntriesPerDay?: number;
  maxEntriesTotal?: number;

  // Exit conditions
  exitOnUnsubscribe: boolean;
  exitOnBounce: boolean;
  exitOnConversion?: boolean;

  // Re-entry
  allowReentry: boolean;
  reentryDelay?: number;  // Days before allowed to re-enter
}

export interface WorkflowStats {
  totalEntries: number;
  activeContacts: number;
  completed: number;
  exited: number;
  conversions: number;
}

// ============================================================================
// Triggers
// ============================================================================

export type TriggerType =
  | 'subscriber_added'
  | 'tag_added'
  | 'tag_removed'
  | 'segment_entered'
  | 'segment_exited'
  | 'email_opened'
  | 'email_clicked'
  | 'form_submitted'
  | 'purchase_made'
  | 'date_based'
  | 'api_triggered'
  | 'manual';

export interface WorkflowTrigger {
  type: TriggerType;
  config: TriggerConfig;
  filters?: TriggerFilter[];
}

export interface TriggerConfig {
  // For tag triggers
  tagId?: string;
  tagName?: string;

  // For segment triggers
  segmentId?: string;

  // For email triggers
  emailId?: string;
  campaignId?: string;
  linkUrl?: string;  // Specific link for click triggers

  // For form triggers
  formId?: string;

  // For date-based triggers
  dateField?: string;  // e.g., "birthday", "signup_date"
  offsetDays?: number;  // Days before/after the date

  // For API triggers
  webhookSecret?: string;
}

export interface TriggerFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in_list';
  value: string | number | string[];
}

// ============================================================================
// Steps
// ============================================================================

export type StepType =
  // Communication
  | 'send_email'
  | 'send_sms'

  // Timing
  | 'delay'
  | 'wait_until'

  // Logic
  | 'condition'
  | 'split_test'
  | 'goal_check'

  // Data
  | 'update_contact'
  | 'add_tag'
  | 'remove_tag'
  | 'add_to_segment'
  | 'remove_from_segment'

  // AI-Powered
  | 'ai_generate_email'
  | 'ai_personalize'
  | 'ai_score_lead'
  | 'ai_suggest_next'

  // Integration
  | 'webhook'
  | 'notify_team'

  // Control
  | 'end_workflow';

export interface WorkflowStep {
  id: string;
  type: StepType;
  name: string;
  config: StepConfig;

  // For branching
  nextStepId?: string;           // Default next step
  branches?: StepBranch[];       // Conditional branches

  // Position for visual builder
  position?: { x: number; y: number };
}

export interface StepConfig {
  // Send Email
  emailTemplateId?: string;
  emailSubject?: string;
  emailContent?: string;
  fromName?: string;
  replyTo?: string;

  // Delay
  delayAmount?: number;
  delayUnit?: 'minutes' | 'hours' | 'days' | 'weeks';

  // Wait Until
  waitUntilTime?: string;     // "09:00"
  waitUntilDay?: string[];    // ["Monday", "Tuesday"]

  // Condition
  conditions?: ConditionGroup;

  // Update Contact
  fieldUpdates?: Record<string, string | number | boolean>;

  // Tags
  tagId?: string;
  tagName?: string;

  // AI Generate Email
  aiEmailPurpose?: string;
  aiKeyPoints?: string[];
  aiTone?: string;

  // AI Personalize
  personalizationLevel?: 'subtle' | 'moderate' | 'aggressive';

  // AI Score Lead
  scoringCriteria?: string[];

  // Split Test
  splitVariants?: SplitVariant[];

  // Webhook
  webhookUrl?: string;
  webhookMethod?: 'GET' | 'POST';
  webhookHeaders?: Record<string, string>;

  // Notify Team
  notificationEmails?: string[];
  notificationMessage?: string;
}

export interface StepBranch {
  id: string;
  name: string;
  condition: ConditionGroup;
  nextStepId: string;
}

export interface ConditionGroup {
  conjunction: 'AND' | 'OR';
  conditions: Condition[];
}

export interface Condition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: string | number | boolean;
}

export interface SplitVariant {
  id: string;
  name: string;
  weight: number;  // Percentage (0-100)
  nextStepId: string;
}

// ============================================================================
// Execution
// ============================================================================

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  contactId: string;
  status: 'active' | 'completed' | 'exited' | 'errored';
  currentStepId: string;

  // History
  stepHistory: StepExecution[];

  // Timing
  enteredAt: Date;
  completedAt?: Date;
  nextStepAt?: Date;

  // Data accumulated during execution
  executionData: Record<string, any>;
}

export interface StepExecution {
  stepId: string;
  stepType: StepType;
  status: 'pending' | 'completed' | 'skipped' | 'errored';
  executedAt: Date;
  result?: any;
  error?: string;
}

// ============================================================================
// Templates
// ============================================================================

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  tags: string[];
}

// Pre-built workflow templates
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'welcome-series',
    name: 'Welcome Email Series',
    description: '5-email onboarding sequence for new subscribers',
    category: 'onboarding',
    trigger: {
      type: 'subscriber_added',
      config: {},
    },
    steps: [
      {
        id: 'welcome-1',
        type: 'send_email',
        name: 'Welcome Email',
        config: { emailSubject: 'Welcome to {{company}}!' },
        nextStepId: 'delay-1',
      },
      {
        id: 'delay-1',
        type: 'delay',
        name: 'Wait 2 days',
        config: { delayAmount: 2, delayUnit: 'days' },
        nextStepId: 'welcome-2',
      },
      {
        id: 'welcome-2',
        type: 'send_email',
        name: 'Getting Started',
        config: { emailSubject: 'Here\'s how to get started' },
        nextStepId: 'delay-2',
      },
      {
        id: 'delay-2',
        type: 'delay',
        name: 'Wait 3 days',
        config: { delayAmount: 3, delayUnit: 'days' },
        nextStepId: 'check-engagement',
      },
      {
        id: 'check-engagement',
        type: 'condition',
        name: 'Check Engagement',
        config: {
          conditions: {
            conjunction: 'OR',
            conditions: [
              { field: 'emails_opened', operator: 'greater_than', value: 0 },
            ],
          },
        },
        branches: [
          { id: 'engaged', name: 'Engaged', condition: { conjunction: 'AND', conditions: [{ field: 'emails_opened', operator: 'greater_than', value: 0 }] }, nextStepId: 'welcome-3-engaged' },
          { id: 'not-engaged', name: 'Not Engaged', condition: { conjunction: 'AND', conditions: [{ field: 'emails_opened', operator: 'equals', value: 0 }] }, nextStepId: 'welcome-3-reengagement' },
        ],
      },
      {
        id: 'welcome-3-engaged',
        type: 'send_email',
        name: 'Pro Tips',
        config: { emailSubject: 'Pro tips to get the most out of {{product}}' },
        nextStepId: 'end',
      },
      {
        id: 'welcome-3-reengagement',
        type: 'send_email',
        name: 'Re-engagement',
        config: { emailSubject: 'Did you miss this?' },
        nextStepId: 'end',
      },
      {
        id: 'end',
        type: 'end_workflow',
        name: 'End',
        config: {},
      },
    ],
    tags: ['welcome', 'onboarding', 'new-subscriber'],
  },
  {
    id: 'cart-abandonment',
    name: 'Cart Abandonment Recovery',
    description: 'Win back customers who left items in their cart',
    category: 'ecommerce',
    trigger: {
      type: 'api_triggered',
      config: {},
    },
    steps: [
      {
        id: 'delay-1h',
        type: 'delay',
        name: 'Wait 1 hour',
        config: { delayAmount: 1, delayUnit: 'hours' },
        nextStepId: 'check-purchased',
      },
      {
        id: 'check-purchased',
        type: 'condition',
        name: 'Check if Purchased',
        config: {
          conditions: {
            conjunction: 'AND',
            conditions: [{ field: 'cart_recovered', operator: 'equals', value: false }],
          },
        },
        branches: [
          { id: 'not-purchased', name: 'Not Purchased', condition: { conjunction: 'AND', conditions: [{ field: 'cart_recovered', operator: 'equals', value: false }] }, nextStepId: 'email-1' },
        ],
        nextStepId: 'end',
      },
      {
        id: 'email-1',
        type: 'send_email',
        name: 'Forgot Something?',
        config: { emailSubject: 'You left something behind...' },
        nextStepId: 'delay-24h',
      },
      {
        id: 'delay-24h',
        type: 'delay',
        name: 'Wait 24 hours',
        config: { delayAmount: 24, delayUnit: 'hours' },
        nextStepId: 'email-2',
      },
      {
        id: 'email-2',
        type: 'ai_generate_email',
        name: 'AI Urgency Email',
        config: {
          aiEmailPurpose: 'cart-abandonment',
          aiKeyPoints: ['Items selling fast', 'Limited stock', 'Complete your order'],
          aiTone: 'urgent',
        },
        nextStepId: 'end',
      },
      {
        id: 'end',
        type: 'end_workflow',
        name: 'End',
        config: {},
      },
    ],
    tags: ['ecommerce', 'cart', 'recovery'],
  },
  {
    id: 'lead-nurture',
    name: 'Lead Nurture Sequence',
    description: 'Educate and warm up leads over 2 weeks',
    category: 'sales',
    trigger: {
      type: 'tag_added',
      config: { tagName: 'lead' },
    },
    steps: [
      {
        id: 'ai-personalize',
        type: 'ai_personalize',
        name: 'Personalize Introduction',
        config: { personalizationLevel: 'moderate' },
        nextStepId: 'email-1',
      },
      {
        id: 'email-1',
        type: 'send_email',
        name: 'Introduction',
        config: { emailSubject: 'A quick hello from {{sender}}' },
        nextStepId: 'delay-3d',
      },
      {
        id: 'delay-3d',
        type: 'delay',
        name: 'Wait 3 days',
        config: { delayAmount: 3, delayUnit: 'days' },
        nextStepId: 'email-2',
      },
      {
        id: 'email-2',
        type: 'send_email',
        name: 'Educational Content',
        config: { emailSubject: 'The #1 mistake most people make' },
        nextStepId: 'ai-score',
      },
      {
        id: 'ai-score',
        type: 'ai_score_lead',
        name: 'Score Lead',
        config: {
          scoringCriteria: ['email_opens', 'link_clicks', 'page_visits', 'time_on_site'],
        },
        nextStepId: 'check-score',
      },
      {
        id: 'check-score',
        type: 'condition',
        name: 'Check Lead Score',
        config: {
          conditions: {
            conjunction: 'AND',
            conditions: [{ field: 'lead_score', operator: 'greater_than', value: 70 }],
          },
        },
        branches: [
          { id: 'hot-lead', name: 'Hot Lead', condition: { conjunction: 'AND', conditions: [{ field: 'lead_score', operator: 'greater_than', value: 70 }] }, nextStepId: 'notify-sales' },
        ],
        nextStepId: 'delay-5d',
      },
      {
        id: 'notify-sales',
        type: 'notify_team',
        name: 'Notify Sales',
        config: {
          notificationMessage: 'Hot lead alert: {{contact.name}} (Score: {{lead_score}})',
        },
        nextStepId: 'end',
      },
      {
        id: 'delay-5d',
        type: 'delay',
        name: 'Wait 5 days',
        config: { delayAmount: 5, delayUnit: 'days' },
        nextStepId: 'email-3',
      },
      {
        id: 'email-3',
        type: 'send_email',
        name: 'Case Study',
        config: { emailSubject: 'How {{customer}} achieved {{result}}' },
        nextStepId: 'end',
      },
      {
        id: 'end',
        type: 'end_workflow',
        name: 'End',
        config: {},
      },
    ],
    tags: ['nurture', 'leads', 'sales'],
  },
];

// ============================================================================
// Automation Hub Service
// ============================================================================

export class AutomationHub {
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();

  /**
   * Create a new workflow
   */
  createWorkflow(
    name: string,
    trigger: WorkflowTrigger,
    steps: WorkflowStep[],
    settings?: Partial<WorkflowSettings>,
    description?: string,
    createdBy: string = 'system'
  ): Workflow {
    const workflow: Workflow = {
      id: uuid(),
      name,
      description,
      status: 'draft',
      trigger,
      steps,
      settings: {
        timezone: 'UTC',
        respectQuietHours: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        exitOnUnsubscribe: true,
        exitOnBounce: true,
        allowReentry: false,
        ...settings,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      stats: {
        totalEntries: 0,
        activeContacts: 0,
        completed: 0,
        exited: 0,
        conversions: 0,
      },
    };

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  /**
   * Create workflow from template
   */
  createFromTemplate(
    templateId: string,
    name: string,
    createdBy: string
  ): Workflow | null {
    const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
    if (!template) return null;

    return this.createWorkflow(
      name,
      template.trigger,
      template.steps.map(s => ({ ...s, id: uuid() })),
      undefined,
      template.description,
      createdBy
    );
  }

  /**
   * Get all workflows
   */
  getWorkflows(userId?: string): Workflow[] {
    const workflows = Array.from(this.workflows.values());
    if (userId) {
      return workflows.filter(w => w.createdBy === userId);
    }
    return workflows;
  }

  /**
   * Get a specific workflow
   */
  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  /**
   * Update workflow
   */
  updateWorkflow(id: string, updates: Partial<Workflow>): Workflow | undefined {
    const existing = this.workflows.get(id);
    if (!existing) return undefined;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.workflows.set(id, updated);
    return updated;
  }

  /**
   * Activate workflow
   */
  activateWorkflow(id: string): boolean {
    const workflow = this.workflows.get(id);
    if (!workflow) return false;

    workflow.status = 'active';
    workflow.updatedAt = new Date();
    return true;
  }

  /**
   * Pause workflow
   */
  pauseWorkflow(id: string): boolean {
    const workflow = this.workflows.get(id);
    if (!workflow) return false;

    workflow.status = 'paused';
    workflow.updatedAt = new Date();
    return true;
  }

  /**
   * Delete workflow
   */
  deleteWorkflow(id: string): boolean {
    return this.workflows.delete(id);
  }

  /**
   * Get workflow templates
   */
  getTemplates(category?: string): WorkflowTemplate[] {
    if (category) {
      return WORKFLOW_TEMPLATES.filter(t => t.category === category);
    }
    return WORKFLOW_TEMPLATES;
  }

  /**
   * Start workflow execution for a contact
   */
  async startExecution(workflowId: string, contact: ContactData): Promise<WorkflowExecution | null> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.status !== 'active') return null;

    // Check entry limits
    if (workflow.settings.maxEntriesTotal) {
      if ((workflow.stats?.totalEntries || 0) >= workflow.settings.maxEntriesTotal) {
        return null;
      }
    }

    const execution: WorkflowExecution = {
      id: uuid(),
      workflowId,
      contactId: contact.id,
      status: 'active',
      currentStepId: workflow.steps[0]?.id || '',
      stepHistory: [],
      enteredAt: new Date(),
      executionData: {
        contact,
      },
    };

    this.executions.set(execution.id, execution);

    // Update stats
    if (workflow.stats) {
      workflow.stats.totalEntries++;
      workflow.stats.activeContacts++;
    }

    // Execute first step
    await this.executeCurrentStep(execution);

    return execution;
  }

  /**
   * Execute current step in workflow
   */
  private async executeCurrentStep(execution: WorkflowExecution): Promise<void> {
    const workflow = this.workflows.get(execution.workflowId);
    if (!workflow) return;

    const step = workflow.steps.find(s => s.id === execution.currentStepId);
    if (!step) {
      execution.status = 'completed';
      execution.completedAt = new Date();
      return;
    }

    const stepExecution: StepExecution = {
      stepId: step.id,
      stepType: step.type,
      status: 'pending',
      executedAt: new Date(),
    };

    try {
      const result = await this.executeStep(step, execution);
      stepExecution.status = 'completed';
      stepExecution.result = result;

      // Determine next step
      let nextStepId = step.nextStepId;

      // Check branches
      if (step.branches && step.branches.length > 0) {
        for (const branch of step.branches) {
          if (this.evaluateConditionGroup(branch.condition, execution)) {
            nextStepId = branch.nextStepId;
            break;
          }
        }
      }

      execution.stepHistory.push(stepExecution);

      if (nextStepId && step.type !== 'end_workflow') {
        execution.currentStepId = nextStepId;

        // If it's a delay step, schedule next execution
        if (step.type === 'delay') {
          const delayMs = this.calculateDelay(step.config);
          execution.nextStepAt = new Date(Date.now() + delayMs);
          // In production, this would schedule a job
        } else {
          // Execute next step immediately
          await this.executeCurrentStep(execution);
        }
      } else {
        // Workflow complete
        execution.status = 'completed';
        execution.completedAt = new Date();

        if (workflow.stats) {
          workflow.stats.activeContacts--;
          workflow.stats.completed++;
        }
      }
    } catch (error: any) {
      stepExecution.status = 'errored';
      stepExecution.error = error.message;
      execution.stepHistory.push(stepExecution);
      execution.status = 'errored';
    }
  }

  /**
   * Execute a specific step type
   */
  private async executeStep(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    const contact = execution.executionData.contact as ContactData;

    switch (step.type) {
      case 'send_email':
        // In production, queue email for sending
        return {
          action: 'email_queued',
          subject: step.config.emailSubject,
          to: contact.email,
        };

      case 'delay':
        return {
          action: 'delay_scheduled',
          resumeAt: new Date(Date.now() + this.calculateDelay(step.config)),
        };

      case 'condition':
        return {
          action: 'condition_evaluated',
          result: true, // Actual evaluation happens in branch selection
        };

      case 'update_contact':
        if (step.config.fieldUpdates) {
          Object.assign(contact, step.config.fieldUpdates);
        }
        return { action: 'contact_updated', updates: step.config.fieldUpdates };

      case 'add_tag':
        return { action: 'tag_added', tag: step.config.tagName };

      case 'remove_tag':
        return { action: 'tag_removed', tag: step.config.tagName };

      case 'ai_generate_email':
        const copywriter = getCopywriter();
        const email = await copywriter.generateEmailBody({
          userId: execution.executionData.userId || 'system',
          subjectLine: step.config.emailSubject || 'Generated Email',
          emailPurpose: (step.config.aiEmailPurpose as any) || 'general',
          keyPoints: step.config.aiKeyPoints || [],
          callToAction: 'Click here',
          format: 'simple-html',
          lengthPreference: 'medium',
        });
        return { action: 'ai_email_generated', email };

      case 'ai_personalize':
        const personalization = getPersonalizationEngine();
        const content = step.config.emailContent || '';
        const personalized = await personalization.generatePersonalizedContent(
          content,
          contact,
          step.config.personalizationLevel || 'moderate'
        );
        execution.executionData.personalizedContent = personalized;
        return { action: 'content_personalized', result: personalized };

      case 'ai_score_lead':
        const router = getRouter();
        const scorePrompt = `Score this lead based on the following data and criteria.

Lead Data:
${JSON.stringify(contact, null, 2)}

Scoring Criteria:
${(step.config.scoringCriteria || []).join('\n')}

Provide a score from 0-100 and brief explanation.

Respond in JSON: { "score": 75, "explanation": "...", "signals": ["positive signal 1", "negative signal 1"] }`;

        const scoreResult = await router.generate({
          userId: 'system',
          prompt: scorePrompt,
          taskType: 'analysis',
          routingMode: 'speed',
          maxTokens: 300,
        });

        const scoreData = JSON.parse(scoreResult.content);
        execution.executionData.lead_score = scoreData.score;
        return { action: 'lead_scored', ...scoreData };

      case 'notify_team':
        // In production, send notification
        return {
          action: 'team_notified',
          message: step.config.notificationMessage,
          recipients: step.config.notificationEmails,
        };

      case 'webhook':
        // In production, call webhook
        return {
          action: 'webhook_called',
          url: step.config.webhookUrl,
        };

      case 'end_workflow':
        return { action: 'workflow_ended' };

      default:
        return { action: 'unknown_step', type: step.type };
    }
  }

  /**
   * Calculate delay in milliseconds
   */
  private calculateDelay(config: StepConfig): number {
    const amount = config.delayAmount || 1;
    const unit = config.delayUnit || 'hours';

    const multipliers = {
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      weeks: 7 * 24 * 60 * 60 * 1000,
    };

    return amount * (multipliers[unit] || multipliers.hours);
  }

  /**
   * Evaluate a condition group
   */
  private evaluateConditionGroup(group: ConditionGroup, execution: WorkflowExecution): boolean {
    const results = group.conditions.map(c => this.evaluateCondition(c, execution));

    if (group.conjunction === 'AND') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: Condition, execution: WorkflowExecution): boolean {
    const value = this.getFieldValue(condition.field, execution);

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      case 'is_empty':
        return !value;
      case 'is_not_empty':
        return !!value;
      default:
        return false;
    }
  }

  /**
   * Get field value from execution data
   */
  private getFieldValue(field: string, execution: WorkflowExecution): any {
    const parts = field.split('.');
    let value: any = execution.executionData;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Get AI suggestions for workflow improvements
   */
  async suggestImprovements(workflowId: string): Promise<{
    suggestions: Array<{
      type: string;
      title: string;
      description: string;
      impact: string;
    }>;
  }> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return { suggestions: [] };

    const router = getRouter();

    const prompt = `Analyze this email automation workflow and suggest improvements.

WORKFLOW:
Name: ${workflow.name}
Trigger: ${workflow.trigger.type}
Steps: ${workflow.steps.map(s => `${s.name} (${s.type})`).join(' -> ')}

Current Stats:
- Total Entries: ${workflow.stats?.totalEntries || 0}
- Completed: ${workflow.stats?.completed || 0}
- Exited Early: ${workflow.stats?.exited || 0}

Suggest improvements for:
1. Timing and delays
2. Content and messaging
3. Segmentation and targeting
4. Testing opportunities
5. Conversion optimization

Respond in JSON:
{
  "suggestions": [
    { "type": "timing", "title": "...", "description": "...", "impact": "high|medium|low" }
  ]
}`;

    try {
      const response = await router.generate({
        userId: 'system',
        prompt,
        taskType: 'analysis',
        routingMode: 'quality',
        maxTokens: 1000,
      });

      return JSON.parse(response.content);
    } catch (error) {
      return { suggestions: [] };
    }
  }
}

// Singleton instance
let automationInstance: AutomationHub | null = null;

export function getAutomationHub(): AutomationHub {
  if (!automationInstance) {
    automationInstance = new AutomationHub();
  }
  return automationInstance;
}
