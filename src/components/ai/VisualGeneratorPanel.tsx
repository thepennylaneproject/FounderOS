'use client';

import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  Loader2,
  Download,
  Copy,
  Check,
  RefreshCw,
  Palette,
  Layout,
  Wand2,
  X,
  ChevronRight,
  Grid,
  Layers,
} from 'lucide-react';

interface VisualGeneratorPanelProps {
  userId: string;
  onSelectImage?: (imageUrl: string) => void;
  onClose?: () => void;
}

type Tab = 'generate' | 'templates' | 'history';

interface ImageStyle {
  value: string;
  label: string;
  description: string;
}

interface ImagePurpose {
  value: string;
  label: string;
}

interface AspectRatio {
  value: string;
  label: string;
  dimensions: string;
}

interface ImageTemplate {
  id: string;
  name: string;
  description: string;
  purpose: string;
  style: string;
  promptTemplate: string;
  tags: string[];
}

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  style: string;
  purpose: string;
  aspectRatio: string;
  dimensions: { width: number; height: number };
  cost: number;
}

const STYLES: ImageStyle[] = [
  { value: 'photorealistic', label: 'Photorealistic', description: 'High-quality photograph style' },
  { value: 'illustration', label: 'Illustration', description: 'Digital illustration, vibrant' },
  { value: 'flat-design', label: 'Flat Design', description: 'Clean, minimal, geometric' },
  { value: '3d-render', label: '3D Render', description: 'Modern 3D graphics' },
  { value: 'minimalist', label: 'Minimalist', description: 'Simple and elegant' },
  { value: 'corporate', label: 'Corporate', description: 'Professional business style' },
  { value: 'abstract', label: 'Abstract', description: 'Artistic and creative' },
  { value: 'hand-drawn', label: 'Hand-drawn', description: 'Sketch-like, organic' },
];

const PURPOSES: ImagePurpose[] = [
  { value: 'hero-banner', label: 'Hero Banner' },
  { value: 'product-showcase', label: 'Product Showcase' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'header-image', label: 'Email Header' },
  { value: 'cta-background', label: 'CTA Background' },
  { value: 'testimonial-bg', label: 'Testimonial Background' },
  { value: 'feature-highlight', label: 'Feature Highlight' },
  { value: 'pattern-bg', label: 'Pattern Background' },
];

const ASPECT_RATIOS: AspectRatio[] = [
  { value: '2:1', label: 'Email Header', dimensions: '1792×896' },
  { value: '16:9', label: 'Wide Banner', dimensions: '1792×1024' },
  { value: '1:1', label: 'Square', dimensions: '1024×1024' },
  { value: '4:3', label: 'Standard', dimensions: '1024×768' },
  { value: '3:2', label: 'Product', dimensions: '1024×683' },
];

export const VisualGeneratorPanel: React.FC<VisualGeneratorPanelProps> = ({
  userId,
  onSelectImage,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('illustration');
  const [purpose, setPurpose] = useState('hero-banner');
  const [aspectRatio, setAspectRatio] = useState('2:1');
  const [mood, setMood] = useState('');
  const [variantCount, setVariantCount] = useState(2);
  const [quality, setQuality] = useState<'draft' | 'standard' | 'hd'>('standard');

  // Template state
  const [templates, setTemplates] = useState<ImageTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ImageTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});

  // Results
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [totalCost, setTotalCost] = useState(0);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/ai/visual?action=templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const generateImage = async () => {
    if (!description.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          userId,
          description,
          style,
          purpose,
          aspectRatio,
          mood: mood || undefined,
          quality,
          variantCount,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedImages(data.images);
        setTotalCost(data.cost);
      }
    } catch (error) {
      console.error('Image generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFromTemplate = async () => {
    if (!selectedTemplate) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'from-template',
          userId,
          templateId: selectedTemplate.id,
          variables: templateVariables,
          options: { aspectRatio, quality },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedImages(data.images);
        setTotalCost(data.cost);
        setActiveTab('generate'); // Switch to show results
      }
    } catch (error) {
      console.error('Template generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyImageUrl = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const extractTemplateVariables = (template: ImageTemplate): string[] => {
    const matches = template.promptTemplate.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
  };

  const selectTemplate = (template: ImageTemplate) => {
    setSelectedTemplate(template);
    const vars = extractTemplateVariables(template);
    setTemplateVariables(
      vars.reduce((acc, v) => ({ ...acc, [v]: '' }), {})
    );
  };

  return (
    <div className="bg-[var(--ivory)] border border-black/5 rounded-lg shadow-xl overflow-hidden max-w-5xl w-full max-h-[90vh] flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-black/5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg">
            <ImageIcon className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Visual Generator</h2>
            <p className="text-xs text-zinc-500">AI-powered images for your emails</p>
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
          { id: 'generate', label: 'Generate', icon: Wand2 },
          { id: 'templates', label: 'Templates', icon: Grid },
          { id: 'history', label: 'History', icon: Layers },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50/50'
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
        {activeTab === 'generate' && (
          <div className="grid grid-cols-2 gap-6">
            {/* Left: Form */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-zinc-700">Describe Your Image</h3>

              <div>
                <label className="block text-sm text-zinc-600 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the image you want to create..."
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-600 mb-2">Style</label>
                <div className="grid grid-cols-4 gap-2">
                  {STYLES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setStyle(s.value)}
                      className={`p-2 text-xs rounded-lg border transition-all ${
                        style === s.value
                          ? 'border-pink-500 bg-pink-50 text-pink-700'
                          : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-600 mb-1">Purpose</label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                  >
                    {PURPOSES.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-zinc-600 mb-1">Aspect Ratio</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                  >
                    {ASPECT_RATIOS.map(ar => (
                      <option key={ar.value} value={ar.value}>
                        {ar.label} ({ar.dimensions})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-600 mb-1">Mood (optional)</label>
                  <input
                    type="text"
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    placeholder="e.g., professional, exciting"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-600 mb-1">Quality</label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as any)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                  >
                    <option value="draft">Draft ($0.02)</option>
                    <option value="standard">Standard ($0.04)</option>
                    <option value="hd">HD ($0.08)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-600 mb-1">Variants: {variantCount}</label>
                <input
                  type="range"
                  min="1"
                  max="4"
                  value={variantCount}
                  onChange={(e) => setVariantCount(parseInt(e.target.value))}
                  className="w-full accent-pink-500"
                />
              </div>

              <button
                onClick={generateImage}
                disabled={isLoading || !description.trim()}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:from-pink-600 hover:to-rose-700 disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate Image
                  </>
                )}
              </button>
            </div>

            {/* Right: Results */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-sm text-zinc-700">Generated Images</h3>
                {totalCost > 0 && (
                  <span className="text-xs text-zinc-500">
                    Cost: ${totalCost.toFixed(4)}
                  </span>
                )}
              </div>

              {generatedImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {generatedImages.map((img) => (
                    <div
                      key={img.id}
                      className="relative group rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100"
                    >
                      <img
                        src={img.url}
                        alt="Generated"
                        className="w-full aspect-video object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => copyImageUrl(img.url, img.id)}
                          className="p-2 bg-white rounded-lg text-zinc-700 hover:bg-zinc-100"
                          title="Copy URL"
                        >
                          {copiedId === img.id ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                        <a
                          href={img.url}
                          download
                          className="p-2 bg-white rounded-lg text-zinc-700 hover:bg-zinc-100"
                          title="Download"
                        >
                          <Download size={16} />
                        </a>
                        {onSelectImage && (
                          <button
                            onClick={() => onSelectImage(img.url)}
                            className="p-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
                            title="Use this image"
                          >
                            <Check size={16} />
                          </button>
                        )}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-white text-xs truncate">{img.style}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
                  <ImageIcon className="text-zinc-300 mb-3" size={48} />
                  <p className="text-zinc-500">Describe your image and click generate</p>
                  <p className="text-xs text-zinc-400 mt-1">AI will create custom visuals for your emails</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="grid grid-cols-3 gap-4">
            {selectedTemplate ? (
              <div className="col-span-3 bg-white border border-zinc-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-medium">{selectedTemplate.name}</h3>
                    <p className="text-sm text-zinc-500">{selectedTemplate.description}</p>
                  </div>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="text-zinc-400 hover:text-zinc-600"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-zinc-600">Fill in the template variables:</p>

                  {Object.keys(templateVariables).map((varName) => (
                    <div key={varName}>
                      <label className="block text-sm font-medium text-zinc-700 mb-1 capitalize">
                        {varName.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <input
                        type="text"
                        value={templateVariables[varName]}
                        onChange={(e) => setTemplateVariables({
                          ...templateVariables,
                          [varName]: e.target.value,
                        })}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                        placeholder={`Enter ${varName}...`}
                      />
                    </div>
                  ))}

                  <button
                    onClick={generateFromTemplate}
                    disabled={isLoading || Object.values(templateVariables).some(v => !v.trim())}
                    className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:from-pink-600 hover:to-rose-700 disabled:opacity-50 transition-all"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 size={18} />
                        Generate from Template
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => selectTemplate(template)}
                  className="text-left p-4 bg-white border border-zinc-200 rounded-lg hover:border-pink-300 hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-sm">{template.name}</h4>
                    <ChevronRight size={16} className="text-zinc-300 group-hover:text-pink-500 transition-colors" />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{template.description}</p>
                  <div className="flex gap-1 mt-3">
                    {template.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="text-center py-16">
            <Layers className="text-zinc-300 mx-auto mb-3" size={48} />
            <p className="text-zinc-500">Your generated images will appear here</p>
            <p className="text-xs text-zinc-400 mt-1">Images are saved for 30 days</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualGeneratorPanel;
