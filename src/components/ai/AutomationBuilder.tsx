'use client';

import React, { useState, useEffect } from 'react';
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Settings,
  Trash2,
  ChevronRight,
  Mail,
  Clock,
  GitBranch,
  Tag,
  User,
  Sparkles,
  Webhook,
  Bell,
  X,
  Loader2,
  ArrowDown,
  Zap,
  LayoutTemplate,
} from 'lucide-react';

interface AutomationBuilderProps {
  userId: string;
  onClose?: () => void;
}

type Tab = 'workflows' | 'create' | 'templates';

interface WorkflowSummary {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  triggerType: string;
  stepCount: number;
  stats?: {
    totalEntries: number;
    activeContacts: number;
    completed: number;
  };
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  triggerType: string;
  stepCount: number;
  tags: string[];
}

interface TriggerType {
  type: string;
  label: string;
  description: string;
}

interface StepType {
  type: string;
  label: string;
  category: string;
  description: string;
}

const STEP_ICONS: Record<string, React.ElementType> = {
  send_email: Mail,
  delay: Clock,
  condition: GitBranch,
  add_tag: Tag,
  remove_tag: Tag,
  update_contact: User,
  ai_generate_email: Sparkles,
  ai_personalize: Sparkles,
  ai_score_lead: Sparkles,
  webhook: Webhook,
  notify_team: Bell,
  end_workflow: X,
};

const CATEGORY_COLORS: Record<string, string> = {
  communication: 'bg-blue-500',
  timing: 'bg-amber-500',
  logic: 'bg-purple-500',
  data: 'bg-green-500',
  ai: 'bg-gradient-to-r from-violet-500 to-purple-500',
  integration: 'bg-cyan-500',
  control: 'bg-zinc-500',
};

export const AutomationBuilder: React.FC<AutomationBuilderProps> = ({
  userId,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('workflows');
  const [isLoading, setIsLoading] = useState(false);

  // Data
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [triggers, setTriggers] = useState<TriggerType[]>([]);
  const [stepTypes, setStepTypes] = useState<StepType[]>([]);

  // Creation state
  const [workflowName, setWorkflowName] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState<string>('');
  const [workflowSteps, setWorkflowSteps] = useState<any[]>([]);
  const [showStepPicker, setShowStepPicker] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadWorkflows();
    loadTemplates();
    loadTriggers();
    loadStepTypes();
  }, []);

  const loadWorkflows = async () => {
    try {
      const response = await fetch(`/api/ai/automation?action=list&userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.workflows);
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/ai/automation?action=templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadTriggers = async () => {
    try {
      const response = await fetch('/api/ai/automation?action=triggers');
      if (response.ok) {
        const data = await response.json();
        setTriggers(data.triggers);
      }
    } catch (error) {
      console.error('Failed to load triggers:', error);
    }
  };

  const loadStepTypes = async () => {
    try {
      const response = await fetch('/api/ai/automation?action=steps');
      if (response.ok) {
        const data = await response.json();
        setStepTypes(data.steps);
      }
    } catch (error) {
      console.error('Failed to load step types:', error);
    }
  };

  const createFromTemplate = async (templateId: string) => {
    setIsLoading(true);
    try {
      const template = templates.find(t => t.id === templateId);
      const response = await fetch('/api/ai/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-from-template',
          userId,
          templateId,
          name: `${template?.name} - Copy`,
        }),
      });

      if (response.ok) {
        await loadWorkflows();
        setActiveTab('workflows');
      }
    } catch (error) {
      console.error('Failed to create from template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWorkflowStatus = async (workflowId: string, currentStatus: string) => {
    const action = currentStatus === 'active' ? 'pause' : 'activate';

    try {
      const response = await fetch('/api/ai/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userId,
          workflowId,
        }),
      });

      if (response.ok) {
        await loadWorkflows();
      }
    } catch (error) {
      console.error('Failed to toggle workflow:', error);
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/ai/automation?workflowId=${workflowId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadWorkflows();
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  };

  const addStep = (stepType: StepType) => {
    const newStep = {
      id: `step-${Date.now()}`,
      type: stepType.type,
      name: stepType.label,
      config: {},
    };
    setWorkflowSteps([...workflowSteps, newStep]);
    setShowStepPicker(false);
  };

  const removeStep = (index: number) => {
    setWorkflowSteps(workflowSteps.filter((_, i) => i !== index));
  };

  const saveWorkflow = async () => {
    if (!workflowName || !selectedTrigger || workflowSteps.length === 0) return;

    setIsLoading(true);
    try {
      // Add end step if not present
      const steps = [...workflowSteps];
      if (steps[steps.length - 1]?.type !== 'end_workflow') {
        steps.push({
          id: `step-end-${Date.now()}`,
          type: 'end_workflow',
          name: 'End',
          config: {},
        });
      }

      // Connect steps
      for (let i = 0; i < steps.length - 1; i++) {
        steps[i].nextStepId = steps[i + 1].id;
      }

      const response = await fetch('/api/ai/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          userId,
          name: workflowName,
          trigger: {
            type: selectedTrigger,
            config: {},
          },
          steps,
        }),
      });

      if (response.ok) {
        setWorkflowName('');
        setSelectedTrigger('');
        setWorkflowSteps([]);
        await loadWorkflows();
        setActiveTab('workflows');
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'paused': return 'bg-amber-100 text-amber-700';
      case 'draft': return 'bg-zinc-100 text-zinc-700';
      default: return 'bg-zinc-100 text-zinc-700';
    }
  };

  const getTriggerLabel = (type: string) => {
    return triggers.find(t => t.type === type)?.label || type;
  };

  return (
    <div className="bg-[var(--ivory)] border border-black/5 rounded-lg shadow-xl overflow-hidden max-w-5xl w-full max-h-[90vh] flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-black/5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
            <Workflow className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Automation Hub</h2>
            <p className="text-xs text-zinc-500">Build intelligent email workflows</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X size={20} />
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className="flex border-b border-black/5">
        {[
          { id: 'workflows', label: 'My Workflows', icon: Workflow },
          { id: 'create', label: 'Create New', icon: Plus },
          { id: 'templates', label: 'Templates', icon: LayoutTemplate },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Workflows List */}
        {activeTab === 'workflows' && (
          <div className="space-y-4">
            {workflows.length > 0 ? (
              workflows.map(workflow => (
                <div
                  key={workflow.id}
                  className="p-4 bg-white border border-zinc-200 rounded-lg hover:border-indigo-200 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{workflow.name}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(workflow.status)}`}>
                          {workflow.status}
                        </span>
                      </div>
                      {workflow.description && (
                        <p className="text-sm text-zinc-500 mt-1">{workflow.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
                        <span>Trigger: {getTriggerLabel(workflow.triggerType)}</span>
                        <span>{workflow.stepCount} steps</span>
                        {workflow.stats && (
                          <>
                            <span>{workflow.stats.totalEntries} entries</span>
                            <span>{workflow.stats.activeContacts} active</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleWorkflowStatus(workflow.id, workflow.status)}
                        className={`p-2 rounded-lg transition-colors ${
                          workflow.status === 'active'
                            ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                        }`}
                        title={workflow.status === 'active' ? 'Pause' : 'Activate'}
                      >
                        {workflow.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <button
                        onClick={() => deleteWorkflow(workflow.id)}
                        className="p-2 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Workflow className="mx-auto mb-3 text-zinc-300" size={48} />
                <p className="text-zinc-500">No workflows yet</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-3 text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Create your first workflow
                </button>
              </div>
            )}
          </div>
        )}

        {/* Create Workflow */}
        {activeTab === 'create' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Workflow Name</label>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="e.g., Welcome Series"
                className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Trigger */}
            <div>
              <label className="block text-sm font-medium mb-2">Trigger</label>
              <div className="grid grid-cols-3 gap-2">
                {triggers.slice(0, 6).map(trigger => (
                  <button
                    key={trigger.type}
                    onClick={() => setSelectedTrigger(trigger.type)}
                    className={`p-3 text-left rounded-lg border transition-all ${
                      selectedTrigger === trigger.type
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <p className="text-sm font-medium">{trigger.label}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{trigger.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div>
              <label className="block text-sm font-medium mb-2">Steps</label>
              <div className="space-y-2">
                {workflowSteps.map((step, index) => {
                  const StepIcon = STEP_ICONS[step.type] || Zap;
                  const stepType = stepTypes.find(s => s.type === step.type);
                  const categoryColor = CATEGORY_COLORS[stepType?.category || 'control'];

                  return (
                    <div key={step.id} className="flex items-center gap-2">
                      {index > 0 && (
                        <ArrowDown className="text-zinc-300 mx-auto" size={16} />
                      )}
                      <div className="flex-1 flex items-center gap-3 p-3 bg-white border border-zinc-200 rounded-lg">
                        <div className={`p-1.5 rounded ${categoryColor} text-white`}>
                          <StepIcon size={14} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{step.name}</p>
                          <p className="text-xs text-zinc-400">{stepType?.description}</p>
                        </div>
                        <button
                          onClick={() => removeStep(index)}
                          className="text-zinc-400 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add Step Button */}
                <button
                  onClick={() => setShowStepPicker(!showStepPicker)}
                  className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-lg text-zinc-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Add Step
                </button>

                {/* Step Picker */}
                {showStepPicker && (
                  <div className="p-4 bg-white border border-zinc-200 rounded-lg shadow-lg">
                    <div className="grid grid-cols-2 gap-2">
                      {stepTypes.filter(s => s.type !== 'end_workflow').map(step => {
                        const StepIcon = STEP_ICONS[step.type] || Zap;
                        const categoryColor = CATEGORY_COLORS[step.category];

                        return (
                          <button
                            key={step.type}
                            onClick={() => addStep(step)}
                            className="flex items-center gap-3 p-3 text-left rounded-lg border border-zinc-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all"
                          >
                            <div className={`p-1.5 rounded ${categoryColor} text-white`}>
                              <StepIcon size={14} />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{step.label}</p>
                              <p className="text-xs text-zinc-400">{step.category}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={saveWorkflow}
              disabled={isLoading || !workflowName || !selectedTrigger || workflowSteps.length === 0}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  Create Workflow
                </>
              )}
            </button>
          </div>
        )}

        {/* Templates */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-2 gap-4">
            {templates.map(template => (
              <div
                key={template.id}
                className="p-4 bg-white border border-zinc-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{template.name}</h4>
                    <p className="text-sm text-zinc-500 mt-1">{template.description}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs rounded">
                    {template.category}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-3 text-xs text-zinc-400">
                  <span>{getTriggerLabel(template.triggerType)}</span>
                  <span>{template.stepCount} steps</span>
                </div>

                <div className="flex flex-wrap gap-1 mt-3">
                  {template.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => createFromTemplate(template.id)}
                  disabled={isLoading}
                  className="mt-4 w-full py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Use Template
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AutomationBuilder;
