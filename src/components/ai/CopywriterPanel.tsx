'use client';

import React, { useState, useCallback } from 'react';
import {
  Sparkles,
  Mail,
  Type,
  MousePointer,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Zap,
  TrendingUp,
  ChevronDown,
  X,
} from 'lucide-react';

interface CopywriterPanelProps {
  userId: string;
  onSelectSubject?: (subject: string) => void;
  onSelectBody?: (body: string) => void;
  onClose?: () => void;
}

type Tab = 'subject' | 'body' | 'cta' | 'complete';
type EmailPurpose =
  | 'welcome'
  | 'newsletter'
  | 'product-launch'
  | 'promotion'
  | 'cart-abandonment'
  | 're-engagement'
  | 'follow-up'
  | 'event-invitation'
  | 'feedback-request'
  | 'announcement'
  | 'educational'
  | 'cold-outreach';

const EMAIL_PURPOSES: { value: EmailPurpose; label: string }[] = [
  { value: 'welcome', label: 'Welcome Email' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'product-launch', label: 'Product Launch' },
  { value: 'promotion', label: 'Promotion / Sale' },
  { value: 'cart-abandonment', label: 'Cart Abandonment' },
  { value: 're-engagement', label: 'Re-engagement' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'event-invitation', label: 'Event Invitation' },
  { value: 'feedback-request', label: 'Feedback Request' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'educational', label: 'Educational / Tips' },
  { value: 'cold-outreach', label: 'Cold Outreach' },
];

interface SubjectVariant {
  id: string;
  text: string;
  textWithVariables: string;
  characterCount: number;
  hasEmoji: boolean;
  estimatedOpenRate: 'low' | 'medium' | 'high';
  strategy: string;
}

interface GeneratedEmail {
  id: string;
  subject: string;
  greeting: string;
  body: string;
  callToAction: string;
  signature: string;
  psLine?: string;
  fullText: string;
  fullHtml?: string;
  wordCount: number;
  readingTimeSeconds: number;
}

interface CTAVariant {
  id: string;
  buttonText: string;
  linkText: string;
  urgencyScore: number;
  style: string;
}

export const CopywriterPanel: React.FC<CopywriterPanelProps> = ({
  userId,
  onSelectSubject,
  onSelectBody,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('complete');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [emailPurpose, setEmailPurpose] = useState<EmailPurpose>('newsletter');
  const [productOrService, setProductOrService] = useState('');
  const [targetAction, setTargetAction] = useState('');
  const [keyPoints, setKeyPoints] = useState<string[]>(['']);
  const [includeEmoji, setIncludeEmoji] = useState(false);
  const [urgencyLevel, setUrgencyLevel] = useState<'none' | 'subtle' | 'moderate' | 'high'>('none');
  const [lengthPreference, setLengthPreference] = useState<'short' | 'medium' | 'long'>('medium');

  // Results
  const [subjectVariants, setSubjectVariants] = useState<SubjectVariant[]>([]);
  const [generatedEmail, setGeneratedEmail] = useState<GeneratedEmail | null>(null);
  const [ctaVariants, setCTAVariants] = useState<CTAVariant[]>([]);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const addKeyPoint = () => setKeyPoints([...keyPoints, '']);
  const removeKeyPoint = (index: number) => {
    setKeyPoints(keyPoints.filter((_, i) => i !== index));
  };
  const updateKeyPoint = (index: number, value: string) => {
    const updated = [...keyPoints];
    updated[index] = value;
    setKeyPoints(updated);
  };

  const generateSubjects = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/copywriter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subject-lines',
          userId,
          emailPurpose,
          productOrService,
          targetAction,
          includeEmoji,
          urgencyLevel,
          variantCount: 5,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSubjectVariants(data.variants);
      }
    } catch (error) {
      console.error('Subject generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateEmail = async () => {
    if (keyPoints.filter(k => k.trim()).length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/copywriter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'email-body',
          userId,
          subjectLine: subjectVariants[0]?.text || 'Your subject here',
          emailPurpose,
          keyPoints: keyPoints.filter(k => k.trim()),
          callToAction: targetAction || 'Learn more',
          format: 'simple-html',
          lengthPreference,
          includePSLine: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedEmail(data.email);
      }
    } catch (error) {
      console.error('Email generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateComplete = async () => {
    if (keyPoints.filter(k => k.trim()).length === 0 || !targetAction) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/copywriter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete-email',
          userId,
          emailPurpose,
          productOrService,
          keyPoints: keyPoints.filter(k => k.trim()),
          targetAction,
          lengthPreference,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSubjectVariants(data.subjectVariants);
        setGeneratedEmail(data.email);
        setCTAVariants(data.ctaVariants);
      }
    } catch (error) {
      console.error('Complete email generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRateColor = (rate: 'low' | 'medium' | 'high') => {
    switch (rate) {
      case 'high': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-amber-600 bg-amber-50';
      case 'low': return 'text-zinc-600 bg-zinc-50';
    }
  };

  return (
    <div className="bg-[var(--ivory)] border border-black/5 rounded-lg shadow-xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-black/5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
            <Sparkles className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">AI Copywriter</h2>
            <p className="text-xs text-zinc-500">Generate compelling email copy</p>
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
          { id: 'complete', label: 'Complete Email', icon: Mail },
          { id: 'subject', label: 'Subject Lines', icon: Type },
          { id: 'body', label: 'Email Body', icon: Mail },
          { id: 'cta', label: 'CTAs', icon: MousePointer },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-violet-600 border-b-2 border-violet-600 bg-violet-50/50'
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
        <div className="grid grid-cols-2 gap-6">
          {/* Left: Input Form */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-zinc-700">Configuration</h3>

            <div>
              <label className="block text-sm text-zinc-600 mb-1">Email Purpose</label>
              <select
                value={emailPurpose}
                onChange={(e) => setEmailPurpose(e.target.value as EmailPurpose)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                {EMAIL_PURPOSES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-600 mb-1">Product / Service</label>
              <input
                type="text"
                value={productOrService}
                onChange={(e) => setProductOrService(e.target.value)}
                placeholder="What are you promoting?"
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-600 mb-1">Key Points</label>
              {keyPoints.map((point, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={point}
                    onChange={(e) => updateKeyPoint(i, e.target.value)}
                    placeholder={`Point ${i + 1}`}
                    className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                  {keyPoints.length > 1 && (
                    <button
                      onClick={() => removeKeyPoint(i)}
                      className="text-zinc-400 hover:text-zinc-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addKeyPoint}
                className="text-sm text-violet-600 hover:text-violet-700"
              >
                + Add point
              </button>
            </div>

            <div>
              <label className="block text-sm text-zinc-600 mb-1">Call to Action</label>
              <input
                type="text"
                value={targetAction}
                onChange={(e) => setTargetAction(e.target.value)}
                placeholder="What should they do? e.g., Sign up for free trial"
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-600 mb-1">Length</label>
                <select
                  value={lengthPreference}
                  onChange={(e) => setLengthPreference(e.target.value as any)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                >
                  <option value="short">Short (50-100 words)</option>
                  <option value="medium">Medium (100-200 words)</option>
                  <option value="long">Long (200-350 words)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-600 mb-1">Urgency</label>
                <select
                  value={urgencyLevel}
                  onChange={(e) => setUrgencyLevel(e.target.value as any)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                >
                  <option value="none">None</option>
                  <option value="subtle">Subtle</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeEmoji}
                onChange={(e) => setIncludeEmoji(e.target.checked)}
                className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
              />
              Include emoji in subject lines
            </label>

            <button
              onClick={activeTab === 'complete' ? generateComplete : activeTab === 'subject' ? generateSubjects : generateEmail}
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  Generate {activeTab === 'complete' ? 'Complete Email' : activeTab === 'subject' ? 'Subject Lines' : activeTab === 'body' ? 'Email Body' : 'CTAs'}
                </>
              )}
            </button>
          </div>

          {/* Right: Results */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-zinc-700">Generated Content</h3>

            {/* Subject Lines */}
            {subjectVariants.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Subject Lines</h4>
                {subjectVariants.map((variant) => (
                  <div
                    key={variant.id}
                    className="p-3 bg-white border border-zinc-200 rounded-lg hover:border-violet-300 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-medium flex-1">{variant.text}</p>
                      <button
                        onClick={() => copyToClipboard(variant.text, variant.id)}
                        className="text-zinc-400 hover:text-zinc-600"
                      >
                        {copiedId === variant.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full ${getRateColor(variant.estimatedOpenRate)}`}>
                        <TrendingUp size={10} className="inline mr-1" />
                        {variant.estimatedOpenRate} potential
                      </span>
                      <span className="text-zinc-400">{variant.characterCount} chars</span>
                      <span className="text-zinc-400">{variant.strategy}</span>
                    </div>
                    {onSelectSubject && (
                      <button
                        onClick={() => onSelectSubject(variant.text)}
                        className="mt-2 text-xs text-violet-600 hover:text-violet-700"
                      >
                        Use this subject
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Email Body */}
            {generatedEmail && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Email Body</h4>
                <div className="p-4 bg-white border border-zinc-200 rounded-lg">
                  <div className="prose prose-sm max-w-none">
                    <p className="text-zinc-600">{generatedEmail.greeting}</p>
                    <div className="whitespace-pre-wrap text-sm">{generatedEmail.body}</div>
                    <p className="font-medium text-violet-600">{generatedEmail.callToAction}</p>
                    <p className="text-zinc-500 text-sm whitespace-pre-wrap">{generatedEmail.signature}</p>
                    {generatedEmail.psLine && (
                      <p className="text-sm italic text-zinc-600">{generatedEmail.psLine}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100">
                    <span className="text-xs text-zinc-400">
                      {generatedEmail.wordCount} words • {Math.ceil(generatedEmail.readingTimeSeconds / 60)} min read
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(generatedEmail.fullText, generatedEmail.id)}
                        className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-1"
                      >
                        {copiedId === generatedEmail.id ? <Check size={12} /> : <Copy size={12} />}
                        Copy
                      </button>
                      {onSelectBody && (
                        <button
                          onClick={() => onSelectBody(generatedEmail.fullText)}
                          className="text-xs text-violet-600 hover:text-violet-700"
                        >
                          Use this body
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CTAs */}
            {ctaVariants.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Call-to-Action Options</h4>
                <div className="grid grid-cols-2 gap-2">
                  {ctaVariants.map((cta) => (
                    <div
                      key={cta.id}
                      className="p-3 bg-white border border-zinc-200 rounded-lg"
                    >
                      <button className="w-full py-2 px-4 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
                        {cta.buttonText}
                      </button>
                      <p className="text-xs text-center text-zinc-500 mt-2">{cta.linkText}</p>
                      <div className="flex justify-between items-center mt-2 text-xs text-zinc-400">
                        <span>{cta.style}</span>
                        <span>Urgency: {cta.urgencyScore}/10</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {subjectVariants.length === 0 && !generatedEmail && ctaVariants.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Sparkles className="text-zinc-300 mb-3" size={40} />
                <p className="text-zinc-500">Configure your email and click generate</p>
                <p className="text-xs text-zinc-400 mt-1">AI-powered copy tailored to your brand voice</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CopywriterPanel;
