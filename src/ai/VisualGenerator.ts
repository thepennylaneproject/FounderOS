/**
 * AI Visual Generator
 *
 * Generates images for email campaigns including hero images,
 * product mockups, social proof graphics, and branded visuals.
 */

import { v4 as uuid } from 'uuid';
import { getBrandVoiceService } from './BrandVoice';

// ============================================================================
// Types
// ============================================================================

export type ImageProvider = 'openai' | 'stability' | 'replicate' | 'deepai';

export type ImageStyle =
  | 'photorealistic'
  | 'illustration'
  | 'flat-design'
  | '3d-render'
  | 'watercolor'
  | 'minimalist'
  | 'vintage'
  | 'abstract'
  | 'corporate'
  | 'hand-drawn';

export type ImagePurpose =
  | 'hero-banner'
  | 'product-showcase'
  | 'social-proof'
  | 'announcement'
  | 'feature-highlight'
  | 'testimonial-bg'
  | 'cta-background'
  | 'header-image'
  | 'icon-set'
  | 'pattern-bg';

export type AspectRatio =
  | '1:1'      // Square (600x600)
  | '16:9'    // Wide banner (1200x675)
  | '4:3'     // Standard (800x600)
  | '2:1'     // Email header (1200x600)
  | '3:2'     // Product image (900x600)
  | '9:16';   // Mobile story (675x1200)

export interface ImageGenerationRequest {
  userId: string;

  // Core prompt
  description: string;

  // Style options
  style: ImageStyle;
  purpose: ImagePurpose;
  aspectRatio: AspectRatio;

  // Brand integration
  useBrandColors?: boolean;
  brandColors?: string[];  // Hex codes
  includeLogo?: boolean;

  // Technical options
  provider?: ImageProvider;
  quality?: 'draft' | 'standard' | 'hd';
  variantCount?: number;

  // Content guidance
  mood?: string;           // e.g., "professional", "exciting", "calm"
  excludeElements?: string[];  // Things to avoid in the image
}

export interface GeneratedImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  prompt: string;           // The enhanced prompt used
  originalDescription: string;
  provider: ImageProvider;
  style: ImageStyle;
  purpose: ImagePurpose;
  aspectRatio: AspectRatio;
  dimensions: { width: number; height: number };
  createdAt: Date;
  cost: number;
}

export interface ImageTemplate {
  id: string;
  name: string;
  description: string;
  purpose: ImagePurpose;
  style: ImageStyle;
  promptTemplate: string;    // Template with {{placeholders}}
  exampleUrl?: string;
  tags: string[];
}

// ============================================================================
// Constants
// ============================================================================

const ASPECT_RATIO_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1792, height: 1024 },
  '4:3': { width: 1024, height: 768 },
  '2:1': { width: 1792, height: 896 },
  '3:2': { width: 1024, height: 683 },
  '9:16': { width: 1024, height: 1792 },
};

const STYLE_PROMPTS: Record<ImageStyle, string> = {
  'photorealistic': 'photorealistic, high quality photograph, professional lighting, sharp focus, 8k resolution',
  'illustration': 'digital illustration, clean lines, vibrant colors, modern illustration style',
  'flat-design': 'flat design, minimal, clean shapes, solid colors, geometric, modern UI style',
  '3d-render': '3D render, octane render, high detail, volumetric lighting, realistic materials',
  'watercolor': 'watercolor painting, soft edges, artistic, hand-painted texture, flowing colors',
  'minimalist': 'minimalist design, simple, clean, white space, elegant, understated',
  'vintage': 'vintage style, retro, nostalgic, aged texture, classic design, muted colors',
  'abstract': 'abstract art, creative, artistic interpretation, bold shapes, expressive',
  'corporate': 'corporate professional, clean, trustworthy, business-appropriate, polished',
  'hand-drawn': 'hand-drawn sketch style, artistic, organic lines, authentic feel',
};

const PURPOSE_CONTEXT: Record<ImagePurpose, string> = {
  'hero-banner': 'hero banner image for email header, eye-catching, prominent focal point',
  'product-showcase': 'product showcase image, clean background, professional product photography style',
  'social-proof': 'social proof graphic, testimonial background, trustworthy and authentic feel',
  'announcement': 'announcement graphic, exciting, attention-grabbing, celebration feel',
  'feature-highlight': 'feature highlight image, demonstrating functionality, clear and informative',
  'testimonial-bg': 'subtle background for testimonial quote, soft, professional, non-distracting',
  'cta-background': 'call-to-action background, draws attention, energetic, action-oriented',
  'header-image': 'email header image, branded, professional, sets the tone',
  'icon-set': 'icon or small graphic element, simple, recognizable, consistent style',
  'pattern-bg': 'subtle pattern background, repeatable, non-distracting, adds texture',
};

/**
 * Pre-built templates for common email image needs
 */
export const IMAGE_TEMPLATES: ImageTemplate[] = [
  {
    id: 'hero-product-launch',
    name: 'Product Launch Hero',
    description: 'Exciting hero image for product launch announcements',
    purpose: 'hero-banner',
    style: '3d-render',
    promptTemplate: 'A stunning hero banner showcasing {{product}}, with dynamic lighting and modern aesthetic, {{mood}} atmosphere, professional marketing image',
    tags: ['product', 'launch', 'hero'],
  },
  {
    id: 'newsletter-header',
    name: 'Newsletter Header',
    description: 'Clean header for weekly/monthly newsletters',
    purpose: 'header-image',
    style: 'flat-design',
    promptTemplate: 'Modern newsletter header design about {{topic}}, clean and minimal, with subtle {{brandColor}} accents, professional and welcoming',
    tags: ['newsletter', 'header', 'clean'],
  },
  {
    id: 'sale-announcement',
    name: 'Sale Announcement',
    description: 'Eye-catching graphic for promotions and sales',
    purpose: 'announcement',
    style: 'illustration',
    promptTemplate: 'Exciting sale announcement graphic, {{discount}} theme, vibrant and energetic, shopping and celebration elements, attention-grabbing',
    tags: ['sale', 'promotion', 'discount'],
  },
  {
    id: 'testimonial-subtle',
    name: 'Testimonial Background',
    description: 'Subtle background for customer quotes',
    purpose: 'testimonial-bg',
    style: 'minimalist',
    promptTemplate: 'Soft, subtle background for customer testimonial, {{mood}} feeling, gentle gradient, professional and trustworthy, minimal design',
    tags: ['testimonial', 'quote', 'background'],
  },
  {
    id: 'feature-showcase',
    name: 'Feature Showcase',
    description: 'Highlight a specific product feature',
    purpose: 'feature-highlight',
    style: 'corporate',
    promptTemplate: 'Clean feature showcase image for {{feature}}, professional, informative, modern tech aesthetic, clear visual hierarchy',
    tags: ['feature', 'product', 'showcase'],
  },
  {
    id: 'welcome-warm',
    name: 'Welcome Email Hero',
    description: 'Warm, inviting image for welcome emails',
    purpose: 'hero-banner',
    style: 'illustration',
    promptTemplate: 'Warm and welcoming illustration for {{brand}} welcome email, friendly, approachable, inviting atmosphere, modern and clean',
    tags: ['welcome', 'onboarding', 'friendly'],
  },
  {
    id: 'cta-energetic',
    name: 'CTA Background',
    description: 'Energetic background for call-to-action sections',
    purpose: 'cta-background',
    style: 'abstract',
    promptTemplate: 'Dynamic, energetic abstract background for call-to-action, {{brandColor}} color scheme, motion and energy, inspiring action',
    tags: ['cta', 'action', 'dynamic'],
  },
  {
    id: 'event-invitation',
    name: 'Event Invitation',
    description: 'Professional graphic for event invites',
    purpose: 'announcement',
    style: 'corporate',
    promptTemplate: 'Professional event invitation graphic for {{eventType}}, elegant, sophisticated, {{mood}} atmosphere, premium feel',
    tags: ['event', 'invitation', 'professional'],
  },
];

// ============================================================================
// Visual Generator Service
// ============================================================================

export class VisualGeneratorService {
  private generatedImages: Map<string, GeneratedImage> = new Map();

  /**
   * Generate an image based on the request
   */
  async generateImage(request: ImageGenerationRequest): Promise<GeneratedImage[]> {
    const variantCount = request.variantCount || 1;
    const enhancedPrompt = await this.buildPrompt(request);
    const dimensions = ASPECT_RATIO_DIMENSIONS[request.aspectRatio];
    const provider = request.provider || 'openai';

    const results: GeneratedImage[] = [];

    for (let i = 0; i < variantCount; i++) {
      try {
        const imageUrl = await this.callProvider(
          provider,
          enhancedPrompt,
          dimensions,
          request.quality || 'standard'
        );

        const image: GeneratedImage = {
          id: uuid(),
          url: imageUrl,
          prompt: enhancedPrompt,
          originalDescription: request.description,
          provider,
          style: request.style,
          purpose: request.purpose,
          aspectRatio: request.aspectRatio,
          dimensions,
          createdAt: new Date(),
          cost: this.calculateCost(provider, request.quality || 'standard'),
        };

        this.generatedImages.set(image.id, image);
        results.push(image);
      } catch (error) {
        console.error(`Image generation variant ${i + 1} failed:`, error);
      }
    }

    if (results.length === 0) {
      throw new Error('All image generation attempts failed');
    }

    return results;
  }

  /**
   * Generate image from template
   */
  async generateFromTemplate(
    userId: string,
    templateId: string,
    variables: Record<string, string>,
    options?: Partial<ImageGenerationRequest>
  ): Promise<GeneratedImage[]> {
    const template = IMAGE_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Replace template variables
    let description = template.promptTemplate;
    for (const [key, value] of Object.entries(variables)) {
      description = description.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    // Merge template defaults with provided options
    const request: ImageGenerationRequest = {
      userId,
      description,
      style: options?.style || template.style,
      purpose: options?.purpose || template.purpose,
      aspectRatio: options?.aspectRatio || '2:1',
      ...options,
    };

    return this.generateImage(request);
  }

  /**
   * Get available templates, optionally filtered
   */
  getTemplates(filter?: { purpose?: ImagePurpose; style?: ImageStyle; tags?: string[] }): ImageTemplate[] {
    let templates = [...IMAGE_TEMPLATES];

    if (filter?.purpose) {
      templates = templates.filter(t => t.purpose === filter.purpose);
    }
    if (filter?.style) {
      templates = templates.filter(t => t.style === filter.style);
    }
    if (filter?.tags && filter.tags.length > 0) {
      templates = templates.filter(t =>
        filter.tags!.some(tag => t.tags.includes(tag))
      );
    }

    return templates;
  }

  /**
   * Get a previously generated image
   */
  getImage(imageId: string): GeneratedImage | undefined {
    return this.generatedImages.get(imageId);
  }

  /**
   * Get all images for a user (from current session)
   */
  getUserImages(userId: string): GeneratedImage[] {
    // In production, this would query the database
    return Array.from(this.generatedImages.values());
  }

  /**
   * Suggest images based on email content
   */
  async suggestImages(
    userId: string,
    emailSubject: string,
    emailBody: string,
    emailPurpose: string
  ): Promise<{
    suggestions: Array<{
      description: string;
      style: ImageStyle;
      purpose: ImagePurpose;
      templateId?: string;
    }>;
  }> {
    // Analyze the email content and suggest appropriate images
    const suggestions: Array<{
      description: string;
      style: ImageStyle;
      purpose: ImagePurpose;
      templateId?: string;
    }> = [];

    // Hero image suggestion based on purpose
    const purposeMapping: Record<string, { style: ImageStyle; purpose: ImagePurpose; templateId?: string }> = {
      'welcome': { style: 'illustration', purpose: 'hero-banner', templateId: 'welcome-warm' },
      'product-launch': { style: '3d-render', purpose: 'hero-banner', templateId: 'hero-product-launch' },
      'newsletter': { style: 'flat-design', purpose: 'header-image', templateId: 'newsletter-header' },
      'promotion': { style: 'illustration', purpose: 'announcement', templateId: 'sale-announcement' },
      'event-invitation': { style: 'corporate', purpose: 'announcement', templateId: 'event-invitation' },
    };

    const mapping = purposeMapping[emailPurpose];
    if (mapping) {
      suggestions.push({
        description: `Hero image for: ${emailSubject}`,
        ...mapping,
      });
    }

    // Always suggest a CTA background
    suggestions.push({
      description: 'Energetic background for your call-to-action section',
      style: 'abstract',
      purpose: 'cta-background',
      templateId: 'cta-energetic',
    });

    // If it looks like there might be testimonials
    if (emailBody.toLowerCase().includes('customer') ||
        emailBody.toLowerCase().includes('testimonial') ||
        emailBody.toLowerCase().includes('said')) {
      suggestions.push({
        description: 'Subtle background for customer testimonial',
        style: 'minimalist',
        purpose: 'testimonial-bg',
        templateId: 'testimonial-subtle',
      });
    }

    return { suggestions };
  }

  /**
   * Optimize image for email (resize, compress)
   */
  async optimizeForEmail(
    imageUrl: string,
    maxWidth: number = 600
  ): Promise<{ optimizedUrl: string; fileSizeKb: number }> {
    // In production, this would call an image optimization service
    // For now, return the original
    return {
      optimizedUrl: imageUrl,
      fileSizeKb: 150, // Placeholder
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Build the full prompt from request
   */
  private async buildPrompt(request: ImageGenerationRequest): Promise<string> {
    const parts: string[] = [];

    // Core description
    parts.push(request.description);

    // Add style guidance
    parts.push(STYLE_PROMPTS[request.style]);

    // Add purpose context
    parts.push(PURPOSE_CONTEXT[request.purpose]);

    // Add mood if specified
    if (request.mood) {
      parts.push(`${request.mood} mood and atmosphere`);
    }

    // Add brand colors if specified
    if (request.useBrandColors && request.brandColors?.length) {
      const colorList = request.brandColors.join(', ');
      parts.push(`using brand colors: ${colorList}`);
    }

    // Add exclusions
    if (request.excludeElements?.length) {
      parts.push(`exclude: ${request.excludeElements.join(', ')}`);
    }

    // Add quality modifiers
    if (request.quality === 'hd') {
      parts.push('ultra high quality, 8k resolution, extremely detailed');
    }

    // Try to incorporate brand voice characteristics
    try {
      const brandVoice = getBrandVoiceService();
      const profile = brandVoice.getActiveProfile(request.userId);
      if (profile) {
        if (profile.attributes.formality >= 7) {
          parts.push('professional and polished');
        } else if (profile.attributes.formality <= 3) {
          parts.push('casual and approachable');
        }

        if (profile.attributes.warmth >= 7) {
          parts.push('warm and inviting');
        }

        if (profile.attributes.energy >= 7) {
          parts.push('dynamic and energetic');
        }
      }
    } catch (e) {
      // Brand voice not available, continue without it
    }

    // Email-safe requirements
    parts.push('clean composition, email-friendly, no text overlay needed');

    return parts.join(', ');
  }

  /**
   * Call the image generation provider
   */
  private async callProvider(
    provider: ImageProvider,
    prompt: string,
    dimensions: { width: number; height: number },
    quality: 'draft' | 'standard' | 'hd'
  ): Promise<string> {
    // In production, this would call the actual provider APIs
    // For now, return a placeholder that indicates the request details

    switch (provider) {
      case 'openai':
        return this.callOpenAI(prompt, dimensions, quality);
      case 'stability':
        return this.callStability(prompt, dimensions, quality);
      case 'replicate':
        return this.callReplicate(prompt, dimensions, quality);
      case 'deepai':
        return this.callDeepAI(prompt, dimensions, quality);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  private async callOpenAI(
    prompt: string,
    dimensions: { width: number; height: number },
    quality: string
  ): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Return placeholder for development
      return `https://placehold.co/${dimensions.width}x${dimensions.height}/1a1a2e/eaeaea?text=AI+Generated+Image`;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: this.getOpenAISize(dimensions),
          quality: quality === 'hd' ? 'hd' : 'standard',
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].url;
    } catch (error) {
      console.error('OpenAI image generation failed:', error);
      return `https://placehold.co/${dimensions.width}x${dimensions.height}/1a1a2e/eaeaea?text=Generation+Failed`;
    }
  }

  private async callStability(
    prompt: string,
    dimensions: { width: number; height: number },
    quality: string
  ): Promise<string> {
    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) {
      return `https://placehold.co/${dimensions.width}x${dimensions.height}/2d3436/dfe6e9?text=Stability+AI`;
    }

    try {
      const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text_prompts: [{ text: prompt }],
          cfg_scale: 7,
          width: Math.min(dimensions.width, 1024),
          height: Math.min(dimensions.height, 1024),
          steps: quality === 'hd' ? 50 : 30,
        }),
      });

      if (!response.ok) {
        throw new Error(`Stability API error: ${response.status}`);
      }

      const data = await response.json();
      // Stability returns base64, would need to upload to storage
      return `data:image/png;base64,${data.artifacts[0].base64}`;
    } catch (error) {
      console.error('Stability image generation failed:', error);
      return `https://placehold.co/${dimensions.width}x${dimensions.height}/2d3436/dfe6e9?text=Generation+Failed`;
    }
  }

  private async callReplicate(
    prompt: string,
    dimensions: { width: number; height: number },
    quality: string
  ): Promise<string> {
    // Replicate integration placeholder
    return `https://placehold.co/${dimensions.width}x${dimensions.height}/6c5ce7/ffffff?text=Replicate`;
  }

  private async callDeepAI(
    prompt: string,
    dimensions: { width: number; height: number },
    quality: string
  ): Promise<string> {
    // DeepAI integration placeholder
    return `https://placehold.co/${dimensions.width}x${dimensions.height}/00b894/ffffff?text=DeepAI`;
  }

  private getOpenAISize(dimensions: { width: number; height: number }): string {
    // DALL-E 3 only supports specific sizes
    const ratio = dimensions.width / dimensions.height;

    if (ratio > 1.5) return '1792x1024';  // Wide
    if (ratio < 0.75) return '1024x1792'; // Tall
    return '1024x1024';                    // Square
  }

  private calculateCost(provider: ImageProvider, quality: string): number {
    const costs: Record<ImageProvider, Record<string, number>> = {
      openai: { draft: 0.04, standard: 0.04, hd: 0.08 },
      stability: { draft: 0.002, standard: 0.006, hd: 0.01 },
      replicate: { draft: 0.002, standard: 0.004, hd: 0.008 },
      deepai: { draft: 0.001, standard: 0.005, hd: 0.01 },
    };

    return costs[provider]?.[quality] || 0.05;
  }
}

// Singleton instance
let visualGeneratorInstance: VisualGeneratorService | null = null;

export function getVisualGenerator(): VisualGeneratorService {
  if (!visualGeneratorInstance) {
    visualGeneratorInstance = new VisualGeneratorService();
  }
  return visualGeneratorInstance;
}
