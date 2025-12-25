'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Plus,
  X,
  ChevronRight,
  AlertCircle,
  Zap,
  Variable,
  GitBranch,
  Eye,
} from 'lucide-react';

interface PersonalizationPanelProps {
  userId: string;
  content: string;
  onContentUpdate?: (content: string) => void;
  onClose?: () => void;
}

type Tab = 'merge-tags' | 'dynamic-blocks' | 'ai-suggest';

interface MergeTag {
  tag: string;
  displayName: string;
  fallback?: string;
  category: string;
  example?: string;
}

interface PersonalizationSuggestion {
  id: string;
  type: string;
  description: string;
  implementation: string;
  impact: string;
  reason: string;
}

interface DynamicBlock {
  id: string;
  name: string;
  description?: string;
  defaultContent: string;
}

const CATEGORIES = [
  { id: 'identity', label: 'Identity', icon: User },
  { id: 'company', label: 'Company', icon: Variable },
  { id: 'location', label: 'Location', icon: Variable },
  { id: 'behavior', label: 'Behavior', icon: Variable },
  { id: 'computed', label: 'Computed', icon: Zap },
  { id: 'custom', label: 'Custom', icon: Variable },
];

export const PersonalizationPanel: React.FC<PersonalizationPanelProps> = ({
  userId,
  content,
  onContentUpdate,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('merge-tags');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Merge tags
  const [mergeTags, setMergeTags] = useState<Record<string, MergeTag[]>>({});
  const [selectedCategory, setSelectedCategory] = useState('identity');

  // Dynamic blocks
  const [dynamicBlocks, setDynamicBlocks] = useState<DynamicBlock[]>([]);
  const [showBlockCreator, setShowBlockCreator] = useState(false);
  const [newBlockName, setNewBlockName] = useState('');
  const [newBlockDefault, setNewBlockDefault] = useState('');

  // AI Suggestions
  const [suggestions, setSuggestions] = useState<PersonalizationSuggestion[]>([]);

  // Validation
  const [validation, setValidation] = useState<{
    valid: boolean;
    invalidTags: string[];
    warnings: string[];
  } | null>(null);

  // Load merge tags on mount
  useEffect(() => {
    loadMergeTags();
  }, []);

  // Validate content when it changes
  useEffect(() => {
    if (content) {
      validateContent();
    }
  }, [content]);

  const loadMergeTags = async () => {
    try {
      const response = await fetch('/api/ai/personalization?action=merge-tags');
      if (response.ok) {
        const data = await response.json();
        setMergeTags(data.grouped);
      }
    } catch (error) {
      console.error('Failed to load merge tags:', error);
    }
  };

  const loadDynamicBlocks = async () => {
    try {
      const response = await fetch('/api/ai/personalization?action=dynamic-blocks');
      if (response.ok) {
        const data = await response.json();
        setDynamicBlocks(data.blocks);
      }
    } catch (error) {
      console.error('Failed to load dynamic blocks:', error);
    }
  };

  const validateContent = async () => {
    try {
      const response = await fetch('/api/ai/personalization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate',
          content,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setValidation(data);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const getSuggestions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/personalization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest',
          content,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createDynamicBlock = async () => {
    if (!newBlockName.trim() || !newBlockDefault.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/personalization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-block',
          name: newBlockName,
          defaultContent: newBlockDefault,
          rules: [],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDynamicBlocks([...dynamicBlocks, data.block]);
        setNewBlockName('');
        setNewBlockDefault('');
        setShowBlockCreator(false);
      }
    } catch (error) {
      console.error('Failed to create block:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const insertTag = (tag: string) => {
    if (onContentUpdate) {
      // Insert at cursor or append
      onContentUpdate(content + ' ' + tag);
    }
    copyTag(tag);
  };

  const copyTag = async (tag: string) => {
    await navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const applySuggestion = (suggestion: PersonalizationSuggestion) => {
    if (onContentUpdate) {
      // For now, just append the implementation
      onContentUpdate(content + '\n\n' + suggestion.implementation);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-amber-600 bg-amber-50';
      case 'low': return 'text-zinc-600 bg-zinc-50';
      default: return 'text-zinc-600 bg-zinc-50';
    }
  };

  return (
    <div className="bg-[var(--ivory)] border border-black/5 rounded-lg shadow-xl overflow-hidden max-w-2xl w-full max-h-[80vh] flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-black/5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg">
            <User className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Personalization</h2>
            <p className="text-xs text-zinc-500">Make every email feel personal</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X size={20} />
          </button>
        )}
      </header>

      {/* Validation Warnings */}
      {validation && (!validation.valid || validation.warnings.length > 0) && (
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100">
          {validation.invalidTags.length > 0 && (
            <div className="flex items-center gap-2 text-amber-700 text-sm">
              <AlertCircle size={14} />
              <span>Invalid tags: {validation.invalidTags.join(', ')}</span>
            </div>
          )}
          {validation.warnings.map((warning, i) => (
            <div key={i} className="flex items-center gap-2 text-amber-600 text-xs mt-1">
              <AlertCircle size={12} />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-black/5">
        {[
          { id: 'merge-tags', label: 'Merge Tags', icon: Variable },
          { id: 'dynamic-blocks', label: 'Dynamic Blocks', icon: GitBranch },
          { id: 'ai-suggest', label: 'AI Suggestions', icon: Sparkles },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as Tab);
              if (tab.id === 'dynamic-blocks') loadDynamicBlocks();
              if (tab.id === 'ai-suggest' && suggestions.length === 0) getSuggestions();
            }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-cyan-600 border-b-2 border-cyan-600 bg-cyan-50/50'
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
        {/* Merge Tags Tab */}
        {activeTab === 'merge-tags' && (
          <div className="space-y-4">
            {/* Category Pills */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-cyan-500 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Tags Grid */}
            <div className="grid grid-cols-2 gap-2">
              {(mergeTags[selectedCategory] || []).map(tag => (
                <button
                  key={tag.tag}
                  onClick={() => insertTag(tag.tag)}
                  className="flex items-center justify-between p-3 bg-white border border-zinc-200 rounded-lg hover:border-cyan-300 hover:bg-cyan-50/50 transition-all text-left group"
                >
                  <div>
                    <p className="text-sm font-medium">{tag.displayName}</p>
                    <p className="text-xs text-zinc-400 font-mono">{tag.tag}</p>
                    {tag.example && (
                      <p className="text-xs text-zinc-500 mt-1">e.g., {tag.example}</p>
                    )}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {copiedTag === tag.tag ? (
                      <Check size={16} className="text-green-500" />
                    ) : (
                      <Copy size={16} className="text-zinc-400" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Fallback Tip */}
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <strong>Tip:</strong> Add fallbacks with the pipe syntax: <code className="bg-blue-100 px-1 rounded">{'{{firstName|there}}'}</code>
            </div>
          </div>
        )}

        {/* Dynamic Blocks Tab */}
        {activeTab === 'dynamic-blocks' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-zinc-600">Show different content based on recipient attributes</p>
              <button
                onClick={() => setShowBlockCreator(true)}
                className="flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700"
              >
                <Plus size={14} />
                New Block
              </button>
            </div>

            {/* Block Creator */}
            {showBlockCreator && (
              <div className="p-4 bg-white border border-cyan-200 rounded-lg space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Block Name</label>
                  <input
                    type="text"
                    value={newBlockName}
                    onChange={(e) => setNewBlockName(e.target.value)}
                    placeholder="e.g., Industry Greeting"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Default Content</label>
                  <textarea
                    value={newBlockDefault}
                    onChange={(e) => setNewBlockDefault(e.target.value)}
                    placeholder="Content shown when no rules match..."
                    rows={3}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowBlockCreator(false)}
                    className="px-3 py-1.5 text-sm text-zinc-600 hover:text-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createDynamicBlock}
                    disabled={isLoading || !newBlockName.trim() || !newBlockDefault.trim()}
                    className="px-3 py-1.5 text-sm bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Create Block'}
                  </button>
                </div>
              </div>
            )}

            {/* Existing Blocks */}
            {dynamicBlocks.length > 0 ? (
              <div className="space-y-2">
                {dynamicBlocks.map(block => (
                  <div
                    key={block.id}
                    className="p-4 bg-white border border-zinc-200 rounded-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-sm">{block.name}</h4>
                        {block.description && (
                          <p className="text-xs text-zinc-500 mt-0.5">{block.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => insertTag(`{{block:${block.id}}}`)}
                        className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                      >
                        Insert <ChevronRight size={12} />
                      </button>
                    </div>
                    <div className="mt-2 p-2 bg-zinc-50 rounded text-xs font-mono text-zinc-600">
                      {block.defaultContent.substring(0, 100)}
                      {block.defaultContent.length > 100 && '...'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500">
                <GitBranch className="mx-auto mb-2 text-zinc-300" size={32} />
                <p>No dynamic blocks yet</p>
                <p className="text-xs text-zinc-400 mt-1">Create blocks for conditional content</p>
              </div>
            )}
          </div>
        )}

        {/* AI Suggestions Tab */}
        {activeTab === 'ai-suggest' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-cyan-500" size={32} />
                <span className="ml-3 text-zinc-500">Analyzing your content...</span>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-3">
                {suggestions.map(suggestion => (
                  <div
                    key={suggestion.id}
                    className="p-4 bg-white border border-zinc-200 rounded-lg hover:border-cyan-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${getImpactColor(suggestion.impact)}`}>
                            {suggestion.impact} impact
                          </span>
                          <span className="text-xs text-zinc-400 capitalize">{suggestion.type.replace('_', ' ')}</span>
                        </div>
                        <p className="font-medium text-sm mt-2">{suggestion.description}</p>
                        <p className="text-xs text-zinc-500 mt-1">{suggestion.reason}</p>
                      </div>
                    </div>
                    <div className="mt-3 p-2 bg-zinc-50 rounded font-mono text-xs text-zinc-700">
                      {suggestion.implementation}
                    </div>
                    <button
                      onClick={() => applySuggestion(suggestion)}
                      className="mt-3 text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                    >
                      Apply suggestion <ChevronRight size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Sparkles className="mx-auto mb-3 text-zinc-300" size={40} />
                <p className="text-zinc-500">No suggestions yet</p>
                <button
                  onClick={getSuggestions}
                  className="mt-3 text-sm text-cyan-600 hover:text-cyan-700"
                >
                  Analyze content for suggestions
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalizationPanel;
