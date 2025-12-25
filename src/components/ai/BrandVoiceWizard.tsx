'use client';

import React, { useState, useCallback } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Building2,
  SlidersHorizontal,
  FileText,
  Check,
  Loader2,
  Wand2,
  Quote,
  X,
} from 'lucide-react';
import {
  VoiceAttributes,
  WizardStep1Data,
  WizardStep2Data,
  WizardStep3Data,
  WizardStep4Data,
  DEFAULT_VOICE_ATTRIBUTES,
  ATTRIBUTE_LABELS,
  INDUSTRY_PRESETS,
} from '@/ai/BrandVoice';

interface BrandVoiceWizardProps {
  userId: string;
  onComplete: (profile: any) => void;
  onClose: () => void;
}

type WizardStep = 1 | 2 | 3 | 4;

const INDUSTRY_OPTIONS = [
  { value: 'tech-startup', label: 'Tech Startup' },
  { value: 'saas-b2b', label: 'SaaS / B2B' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'finance', label: 'Finance' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'creative-agency', label: 'Creative Agency' },
  { value: 'nonprofit', label: 'Non-profit' },
  { value: 'education', label: 'Education' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'solo-founder', label: 'Solo Founder / Personal Brand' },
  { value: 'other', label: 'Other' },
];

export const BrandVoiceWizard: React.FC<BrandVoiceWizardProps> = ({
  userId,
  onComplete,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Step 1: Brand Basics
  const [step1Data, setStep1Data] = useState<WizardStep1Data>({
    brandName: '',
    industry: '',
    targetAudience: '',
    missionStatement: '',
  });

  // Step 2: Voice Attributes
  const [step2Data, setStep2Data] = useState<WizardStep2Data>({
    attributes: { ...DEFAULT_VOICE_ATTRIBUTES },
  });

  // Step 3: Examples
  const [step3Data, setStep3Data] = useState<WizardStep3Data>({
    exampleContent: [''],
    antiExamples: [''],
  });

  // Step 4: Generated Guidelines
  const [step4Data, setStep4Data] = useState<WizardStep4Data>({
    voiceGuidelines: '',
    toneKeywords: [],
    avoidKeywords: [],
  });

  // Load industry preset
  const loadPreset = useCallback(async (industry: string) => {
    if (!industry || industry === 'other') return;

    try {
      const response = await fetch('/api/ai/brand-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-preset', userId, industry }),
      });

      if (response.ok) {
        const { attributes } = await response.json();
        setStep2Data({ attributes });
      }
    } catch (error) {
      console.error('Failed to load preset:', error);
    }
  }, [userId]);

  // Analyze samples to suggest attributes
  const analyzeContent = async () => {
    const samples = step3Data.exampleContent.filter(s => s.trim());
    if (samples.length === 0) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/brand-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', userId, samples }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.confidence > 0.5) {
          setStep2Data({ attributes: data.suggestedAttributes });
        }
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate guidelines
  const generateGuidelines = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/brand-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-guidelines',
          userId,
          step1: step1Data,
          step2: step2Data,
          step3: step3Data,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setStep4Data({
          voiceGuidelines: data.guidelines,
          toneKeywords: data.toneKeywords,
          avoidKeywords: data.avoidKeywords,
        });
      }
    } catch (error) {
      console.error('Guidelines generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Complete wizard
  const completeWizard = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/brand-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          userId,
          step1: step1Data,
          step2: step2Data,
          step3: {
            exampleContent: step3Data.exampleContent.filter(s => s.trim()),
            antiExamples: step3Data.antiExamples.filter(s => s.trim()),
          },
          step4: step4Data,
        }),
      });

      if (response.ok) {
        const { profile } = await response.json();
        onComplete(profile);
      }
    } catch (error) {
      console.error('Profile creation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation
  const goNext = async () => {
    if (currentStep === 3) {
      await generateGuidelines();
    }
    if (currentStep < 4) {
      setCurrentStep((s) => (s + 1) as WizardStep);
    } else {
      await completeWizard();
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => (s - 1) as WizardStep);
    }
  };

  // Validation
  const isStep1Valid = step1Data.brandName && step1Data.industry && step1Data.targetAudience;
  const isStep2Valid = true; // Attributes always have defaults
  const isStep3Valid = true; // Examples are optional
  const isStep4Valid = step4Data.voiceGuidelines.length > 0;

  const canProceed = () => {
    switch (currentStep) {
      case 1: return isStep1Valid;
      case 2: return isStep2Valid;
      case 3: return isStep3Valid;
      case 4: return isStep4Valid;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--ink)]/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Wizard Container */}
      <div className="relative bg-[var(--ivory)] border border-black/5 shadow-2xl rounded-sm w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <header className="px-8 pt-8 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-serif italic tracking-tight flex items-center gap-2">
              <Wand2 className="text-amber-600" size={24} />
              Brand Voice Wizard
            </h2>
            <p className="text-zinc-500 mt-1 text-sm">
              Step {currentStep} of 4
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-[var(--ink)] transition-colors"
          >
            <X size={20} />
          </button>
        </header>

        {/* Progress Bar */}
        <div className="px-8 mt-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-amber-500' : 'bg-zinc-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 min-h-[400px]">
          {/* Step 1: Brand Basics */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Building2 className="text-amber-600" size={20} />
                </div>
                <div>
                  <h3 className="font-medium">Tell us about your brand</h3>
                  <p className="text-sm text-zinc-500">Help us understand your business context</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Brand Name *</label>
                <input
                  type="text"
                  value={step1Data.brandName}
                  onChange={(e) => setStep1Data({ ...step1Data, brandName: e.target.value })}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  placeholder="Your company or product name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Industry *</label>
                <select
                  value={step1Data.industry}
                  onChange={(e) => {
                    setStep1Data({ ...step1Data, industry: e.target.value });
                    loadPreset(e.target.value);
                  }}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="">Select industry...</option>
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Target Audience *</label>
                <input
                  type="text"
                  value={step1Data.targetAudience}
                  onChange={(e) => setStep1Data({ ...step1Data, targetAudience: e.target.value })}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  placeholder="e.g., Startup founders, small business owners"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Mission Statement (Optional)</label>
                <textarea
                  value={step1Data.missionStatement || ''}
                  onChange={(e) => setStep1Data({ ...step1Data, missionStatement: e.target.value })}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                  rows={2}
                  placeholder="What drives your business?"
                />
              </div>
            </div>
          )}

          {/* Step 2: Voice Attributes */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <SlidersHorizontal className="text-amber-600" size={20} />
                </div>
                <div>
                  <h3 className="font-medium">Dial in your voice</h3>
                  <p className="text-sm text-zinc-500">Adjust the sliders to match your brand personality</p>
                </div>
              </div>

              <div className="space-y-5">
                {(Object.keys(ATTRIBUTE_LABELS) as Array<keyof VoiceAttributes>).map((key) => {
                  const label = ATTRIBUTE_LABELS[key];
                  return (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">{label.name}</span>
                        <span className="text-xs text-zinc-500">{step2Data.attributes[key]}/10</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-400 w-24">{label.low}</span>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={step2Data.attributes[key]}
                          onChange={(e) =>
                            setStep2Data({
                              attributes: {
                                ...step2Data.attributes,
                                [key]: parseInt(e.target.value),
                              },
                            })
                          }
                          className="flex-1 h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <span className="text-xs text-zinc-400 w-24 text-right">{label.high}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Examples */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Quote className="text-amber-600" size={20} />
                </div>
                <div>
                  <h3 className="font-medium">Show us your voice</h3>
                  <p className="text-sm text-zinc-500">Paste examples of content that represents you</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">This sounds like us</label>
                  <button
                    onClick={analyzeContent}
                    disabled={isAnalyzing || step3Data.exampleContent.filter(s => s.trim()).length === 0}
                    className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    Analyze & Adjust Sliders
                  </button>
                </div>
                {step3Data.exampleContent.map((example, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <textarea
                      value={example}
                      onChange={(e) => {
                        const updated = [...step3Data.exampleContent];
                        updated[i] = e.target.value;
                        setStep3Data({ ...step3Data, exampleContent: updated });
                      }}
                      className="flex-1 px-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none text-sm"
                      rows={2}
                      placeholder="Paste an email, social post, or copy that represents your voice..."
                    />
                    {step3Data.exampleContent.length > 1 && (
                      <button
                        onClick={() => {
                          const updated = step3Data.exampleContent.filter((_, idx) => idx !== i);
                          setStep3Data({ ...step3Data, exampleContent: updated });
                        }}
                        className="text-zinc-400 hover:text-zinc-600"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setStep3Data({ ...step3Data, exampleContent: [...step3Data.exampleContent, ''] })}
                  className="text-sm text-amber-600 hover:text-amber-700"
                >
                  + Add another example
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">This does NOT sound like us</label>
                {step3Data.antiExamples.map((example, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <textarea
                      value={example}
                      onChange={(e) => {
                        const updated = [...step3Data.antiExamples];
                        updated[i] = e.target.value;
                        setStep3Data({ ...step3Data, antiExamples: updated });
                      }}
                      className="flex-1 px-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none text-sm"
                      rows={2}
                      placeholder="Content style to avoid..."
                    />
                    {step3Data.antiExamples.length > 1 && (
                      <button
                        onClick={() => {
                          const updated = step3Data.antiExamples.filter((_, idx) => idx !== i);
                          setStep3Data({ ...step3Data, antiExamples: updated });
                        }}
                        className="text-zinc-400 hover:text-zinc-600"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setStep3Data({ ...step3Data, antiExamples: [...step3Data.antiExamples, ''] })}
                  className="text-sm text-amber-600 hover:text-amber-700"
                >
                  + Add anti-example
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Confirm */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <FileText className="text-amber-600" size={20} />
                </div>
                <div>
                  <h3 className="font-medium">Your Brand Voice Guidelines</h3>
                  <p className="text-sm text-zinc-500">Review and customize your generated guidelines</p>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-amber-500" size={32} />
                  <span className="ml-3 text-zinc-500">Generating your voice guidelines...</span>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Voice Guidelines</label>
                    <textarea
                      value={step4Data.voiceGuidelines}
                      onChange={(e) => setStep4Data({ ...step4Data, voiceGuidelines: e.target.value })}
                      className="w-full px-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none text-sm"
                      rows={6}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-green-700">Tone Keywords</label>
                      <div className="flex flex-wrap gap-2">
                        {step4Data.toneKeywords.map((keyword, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm border border-green-200"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-red-700">Words to Avoid</label>
                      <div className="flex flex-wrap gap-2">
                        {step4Data.avoidKeywords.map((keyword, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm border border-red-200"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-8 pb-8 flex justify-between items-center">
          <button
            onClick={goBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-4 py-2 text-zinc-600 hover:text-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <button
            onClick={goNext}
            disabled={!canProceed() || isLoading}
            className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {currentStep === 4 ? (
              <>
                <Check size={16} />
                Complete Setup
              </>
            ) : (
              <>
                Continue
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default BrandVoiceWizard;
