'use client';

import React, { useState, useEffect } from 'react';
import {
  Target,
  Sparkles,
  Loader2,
  ChevronRight,
  Mail,
  Calendar,
  Users,
  BarChart3,
  Lightbulb,
  Clock,
  X,
  CheckCircle,
  ArrowRight,
  Beaker,
} from 'lucide-react';

interface CampaignStrategistPanelProps {
  userId: string;
  onStrategyGenerated?: (strategy: any) => void;
  onClose?: () => void;
}

type Tab = 'create' | 'ideas' | 'analyze';

interface CampaignGoal {
  value: string;
  label: string;
  description: string;
}

interface CampaignIdea {
  id: string;
  name: string;
  description: string;
  goal: string;
  emailCount: number;
  complexity: string;
  estimatedSetupTime: string;
  bestFor: string[];
}

interface CampaignStrategy {
  id: string;
  name: string;
  description: string;
  emails: any[];
  sendingSchedule: any;
  segmentation: any;
  abTests: any[];
  kpis: any[];
  recommendations: any[];
  projectedMetrics: any;
}

export const CampaignStrategistPanel: React.FC<CampaignStrategistPanelProps> = ({
  userId,
  onStrategyGenerated,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('create');
  const [isLoading, setIsLoading] = useState(false);

  // Goals
  const [goals, setGoals] = useState<CampaignGoal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<string>('');

  // Campaign ideas
  const [ideas, setIdeas] = useState<CampaignIdea[]>([]);

  // Form state
  const [productOrService, setProductOrService] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [industry, setIndustry] = useState('');
  const [budget, setBudget] = useState<'low' | 'medium' | 'high'>('medium');
  const [timeline, setTimeline] = useState<'urgent' | 'standard' | 'flexible'>('standard');
  const [resourceLevel, setResourceLevel] = useState<'solo' | 'small-team' | 'full-team'>('solo');

  // Generated strategy
  const [strategy, setStrategy] = useState<CampaignStrategy | null>(null);
  const [activeStrategySection, setActiveStrategySection] = useState<string>('emails');

  // Load goals on mount
  useEffect(() => {
    loadGoals();
    loadIdeas();
  }, []);

  const loadGoals = async () => {
    try {
      const response = await fetch('/api/ai/strategist?action=goals');
      if (response.ok) {
        const data = await response.json();
        setGoals(data.goals);
      }
    } catch (error) {
      console.error('Failed to load goals:', error);
    }
  };

  const loadIdeas = async () => {
    try {
      const response = await fetch('/api/ai/strategist?action=ideas');
      if (response.ok) {
        const data = await response.json();
        setIdeas(data.ideas);
      }
    } catch (error) {
      console.error('Failed to load ideas:', error);
    }
  };

  const generateStrategy = async () => {
    if (!selectedGoal || !productOrService || !targetAudience) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/strategist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-strategy',
          userId,
          campaignGoal: selectedGoal,
          productOrService,
          targetAudience,
          industry,
          budget,
          timeline,
          resourceLevel,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setStrategy(data.strategy);
        if (onStrategyGenerated) {
          onStrategyGenerated(data.strategy);
        }
      }
    } catch (error) {
      console.error('Strategy generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectIdea = (idea: CampaignIdea) => {
    setSelectedGoal(idea.goal);
    setActiveTab('create');
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'text-green-600 bg-green-50';
      case 'moderate': return 'text-amber-600 bg-amber-50';
      case 'complex': return 'text-red-600 bg-red-50';
      default: return 'text-zinc-600 bg-zinc-50';
    }
  };

  return (
    <div className="bg-[var(--ivory)] border border-black/5 rounded-lg shadow-xl overflow-hidden max-w-5xl w-full max-h-[90vh] flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-black/5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
            <Target className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Campaign Strategist</h2>
            <p className="text-xs text-zinc-500">AI-powered campaign planning</p>
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
          { id: 'create', label: 'Create Strategy', icon: Sparkles },
          { id: 'ideas', label: 'Campaign Ideas', icon: Lightbulb },
          { id: 'analyze', label: 'Analyze', icon: BarChart3 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50'
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
        {/* Create Strategy Tab */}
        {activeTab === 'create' && !strategy && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Campaign Goal</label>
              <div className="grid grid-cols-3 gap-2">
                {goals.map(goal => (
                  <button
                    key={goal.value}
                    onClick={() => setSelectedGoal(goal.value)}
                    className={`p-3 text-left rounded-lg border transition-all ${
                      selectedGoal === goal.value
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <p className="text-sm font-medium">{goal.label}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{goal.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product / Service</label>
                <input
                  type="text"
                  value={productOrService}
                  onChange={(e) => setProductOrService(e.target.value)}
                  placeholder="What are you promoting?"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Industry</label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g., SaaS, E-commerce"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Target Audience</label>
              <textarea
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Describe your ideal recipient..."
                rows={2}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Budget</label>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value as any)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="low">Limited</option>
                  <option value="medium">Moderate</option>
                  <option value="high">Flexible</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Timeline</label>
                <select
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value as any)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="urgent">Urgent</option>
                  <option value="standard">Standard</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Resources</label>
                <select
                  value={resourceLevel}
                  onChange={(e) => setResourceLevel(e.target.value as any)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="solo">Solo Founder</option>
                  <option value="small-team">Small Team</option>
                  <option value="full-team">Full Team</option>
                </select>
              </div>
            </div>

            <button
              onClick={generateStrategy}
              disabled={isLoading || !selectedGoal || !productOrService || !targetAudience}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating Strategy...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate Campaign Strategy
                </>
              )}
            </button>
          </div>
        )}

        {/* Generated Strategy Display */}
        {activeTab === 'create' && strategy && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold">{strategy.name}</h3>
                <p className="text-zinc-600 mt-1">{strategy.description}</p>
              </div>
              <button
                onClick={() => setStrategy(null)}
                className="text-sm text-emerald-600 hover:text-emerald-700"
              >
                Create New
              </button>
            </div>

            {/* Strategy Sections */}
            <div className="flex gap-2 border-b border-zinc-200">
              {[
                { id: 'emails', label: 'Email Sequence', icon: Mail },
                { id: 'schedule', label: 'Schedule', icon: Calendar },
                { id: 'segments', label: 'Segments', icon: Users },
                { id: 'tests', label: 'A/B Tests', icon: Beaker },
                { id: 'kpis', label: 'KPIs', icon: BarChart3 },
              ].map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveStrategySection(section.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                    activeStrategySection === section.id
                      ? 'text-emerald-600 border-b-2 border-emerald-600'
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  <section.icon size={14} />
                  {section.label}
                </button>
              ))}
            </div>

            {/* Email Sequence */}
            {activeStrategySection === 'emails' && (
              <div className="space-y-3">
                {strategy.emails.map((email, i) => (
                  <div
                    key={email.id}
                    className="p-4 bg-white border border-zinc-200 rounded-lg"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-medium text-sm">
                        {email.order}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{email.name}</h4>
                            <p className="text-sm text-zinc-500 mt-0.5">{email.description}</p>
                          </div>
                          <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-1 rounded">
                            {email.purpose}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-zinc-400 uppercase">Timing</p>
                            <p className="text-zinc-700">
                              {email.sendTiming.type === 'immediate' ? 'Send immediately' :
                               email.sendTiming.type === 'delay' ? `Wait ${email.sendTiming.delayDays || 0} days` :
                               email.sendTiming.type}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-400 uppercase">CTA</p>
                            <p className="text-zinc-700">{email.callToAction}</p>
                          </div>
                        </div>

                        <div className="mt-3">
                          <p className="text-xs text-zinc-400 uppercase mb-1">Subject Guidance</p>
                          <p className="text-sm text-zinc-600">{email.subjectGuidance}</p>
                        </div>
                      </div>
                    </div>
                    {i < strategy.emails.length - 1 && (
                      <div className="flex justify-center mt-3 text-zinc-300">
                        <ArrowRight size={20} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Schedule */}
            {activeStrategySection === 'schedule' && (
              <div className="bg-white border border-zinc-200 rounded-lg p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      <Clock size={16} className="text-emerald-600" />
                      Optimal Time Slots
                    </h4>
                    <div className="mt-3 space-y-2">
                      {strategy.sendingSchedule.optimalTimeSlots?.map((slot: any, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-xs font-medium">
                            {slot.priority}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{slot.start} - {slot.end}</p>
                            <p className="text-xs text-zinc-500">{slot.rationale}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium">Best Days</h4>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {strategy.sendingSchedule.optimalDays?.map((day: string) => (
                        <span key={day} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm">
                          {day}
                        </span>
                      ))}
                    </div>
                    <p className="mt-4 text-sm text-zinc-600">
                      Frequency: <strong>{strategy.sendingSchedule.frequency}</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* KPIs */}
            {activeStrategySection === 'kpis' && (
              <div className="grid grid-cols-2 gap-4">
                {strategy.kpis.map((kpi: any, i: number) => (
                  <div
                    key={i}
                    className={`p-4 rounded-lg border ${
                      kpi.importance === 'primary'
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-white border-zinc-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">{kpi.metric}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        kpi.importance === 'primary'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {kpi.importance}
                      </span>
                    </div>
                    <p className="text-2xl font-bold mt-2">{kpi.target}</p>
                    <p className="text-sm text-zinc-500">Benchmark: {kpi.benchmark}</p>
                  </div>
                ))}

                {strategy.projectedMetrics && (
                  <div className="col-span-2 p-4 bg-white border border-zinc-200 rounded-lg">
                    <h4 className="font-medium mb-3">Projected Outcomes</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-zinc-400 uppercase">Open Rate</p>
                        <p className="text-lg font-semibold text-emerald-600">
                          {strategy.projectedMetrics.openRate.expected}%
                        </p>
                        <p className="text-xs text-zinc-500">
                          Range: {strategy.projectedMetrics.openRate.low}% - {strategy.projectedMetrics.openRate.high}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400 uppercase">Click Rate</p>
                        <p className="text-lg font-semibold text-emerald-600">
                          {strategy.projectedMetrics.clickRate.expected}%
                        </p>
                        <p className="text-xs text-zinc-500">
                          Range: {strategy.projectedMetrics.clickRate.low}% - {strategy.projectedMetrics.clickRate.high}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400 uppercase">Conversion Rate</p>
                        <p className="text-lg font-semibold text-emerald-600">
                          {strategy.projectedMetrics.conversionRate.expected}%
                        </p>
                        <p className="text-xs text-zinc-500">
                          Range: {strategy.projectedMetrics.conversionRate.low}% - {strategy.projectedMetrics.conversionRate.high}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Campaign Ideas Tab */}
        {activeTab === 'ideas' && (
          <div className="grid grid-cols-2 gap-4">
            {ideas.map(idea => (
              <button
                key={idea.id}
                onClick={() => selectIdea(idea)}
                className="text-left p-4 bg-white border border-zinc-200 rounded-lg hover:border-emerald-300 hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">{idea.name}</h4>
                  <ChevronRight size={16} className="text-zinc-300 group-hover:text-emerald-500 transition-colors" />
                </div>
                <p className="text-sm text-zinc-500 mt-1">{idea.description}</p>

                <div className="flex items-center gap-3 mt-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${getComplexityColor(idea.complexity)}`}>
                    {idea.complexity}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {idea.emailCount} emails
                  </span>
                  <span className="text-xs text-zinc-400">
                    {idea.estimatedSetupTime}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mt-3">
                  {idea.bestFor.slice(0, 2).map((tag, i) => (
                    <span key={i} className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Analyze Tab */}
        {activeTab === 'analyze' && (
          <div className="text-center py-16">
            <BarChart3 className="mx-auto mb-3 text-zinc-300" size={48} />
            <p className="text-zinc-500">Paste an existing campaign to analyze</p>
            <p className="text-xs text-zinc-400 mt-1">Get AI-powered improvement suggestions</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignStrategistPanel;
