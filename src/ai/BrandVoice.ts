/**
 * Brand Voice Analysis & Management
 *
 * Guided wizard for capturing and analyzing brand voice,
 * then injecting it consistently into all AI-generated content.
 */

import { v4 as uuid } from 'uuid';
import { getRouter } from './AIRouter';

/**
 * Brand voice profile stored for a user/organization
 */
export interface BrandVoiceProfile {
  id: string;
  userId: string;
  organizationId?: string;
  name: string;

  // Step 1: Brand Basics
  brandName: string;
  industry: string;
  targetAudience: string;
  missionStatement?: string;

  // Step 2: Voice Attributes (1-10 scale)
  attributes: VoiceAttributes;

  // Step 3: Examples & Anti-Examples
  exampleContent: string[];   // "This sounds like us"
  antiExamples: string[];     // "This does NOT sound like us"

  // Step 4: Generated Guidelines
  voiceGuidelines: string;
  toneKeywords: string[];
  avoidKeywords: string[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

/**
 * Voice attribute sliders (each 1-10)
 */
export interface VoiceAttributes {
  // Formality: 1=Very Casual, 10=Very Formal
  formality: number;

  // Warmth: 1=Professional/Distant, 10=Warm/Friendly
  warmth: number;

  // Energy: 1=Calm/Measured, 10=Energetic/Enthusiastic
  energy: number;

  // Humor: 1=Serious/Straightforward, 10=Playful/Witty
  humor: number;

  // Authority: 1=Peer/Collaborative, 10=Expert/Authoritative
  authority: number;

  // Complexity: 1=Simple/Accessible, 10=Technical/Sophisticated
  complexity: number;

  // Directness: 1=Nuanced/Diplomatic, 10=Direct/Bold
  directness: number;

  // Personality: 1=Corporate/Neutral, 10=Distinctive/Unique
  personality: number;
}

/**
 * Wizard step data
 */
export interface WizardStep1Data {
  brandName: string;
  industry: string;
  targetAudience: string;
  missionStatement?: string;
}

export interface WizardStep2Data {
  attributes: VoiceAttributes;
}

export interface WizardStep3Data {
  exampleContent: string[];
  antiExamples: string[];
}

export interface WizardStep4Data {
  voiceGuidelines: string;
  toneKeywords: string[];
  avoidKeywords: string[];
}

/**
 * Default voice attributes (neutral middle ground)
 */
export const DEFAULT_VOICE_ATTRIBUTES: VoiceAttributes = {
  formality: 5,
  warmth: 6,
  energy: 5,
  humor: 3,
  authority: 5,
  complexity: 4,
  directness: 6,
  personality: 5,
};

/**
 * Attribute descriptions for UI
 */
export const ATTRIBUTE_LABELS: Record<keyof VoiceAttributes, { name: string; low: string; high: string; description: string }> = {
  formality: {
    name: 'Formality',
    low: 'Casual',
    high: 'Formal',
    description: 'How formal or casual should your communication feel?',
  },
  warmth: {
    name: 'Warmth',
    low: 'Professional',
    high: 'Warm & Friendly',
    description: 'How personally connected do you want to feel to your audience?',
  },
  energy: {
    name: 'Energy',
    low: 'Calm & Measured',
    high: 'Energetic',
    description: 'What energy level should your writing convey?',
  },
  humor: {
    name: 'Humor',
    low: 'Serious',
    high: 'Playful & Witty',
    description: 'How much humor or playfulness fits your brand?',
  },
  authority: {
    name: 'Authority',
    low: 'Peer / Collaborative',
    high: 'Expert / Authoritative',
    description: 'Are you speaking as a peer or as an authority?',
  },
  complexity: {
    name: 'Complexity',
    low: 'Simple & Accessible',
    high: 'Technical',
    description: 'How sophisticated should your vocabulary be?',
  },
  directness: {
    name: 'Directness',
    low: 'Nuanced',
    high: 'Direct & Bold',
    description: 'How directly should you communicate your points?',
  },
  personality: {
    name: 'Personality',
    low: 'Neutral',
    high: 'Distinctive',
    description: 'How unique and memorable should your voice be?',
  },
};

/**
 * Industry presets with suggested attributes
 */
export const INDUSTRY_PRESETS: Record<string, Partial<VoiceAttributes>> = {
  'tech-startup': { formality: 3, warmth: 7, energy: 8, humor: 5, authority: 4, complexity: 5, directness: 8, personality: 7 },
  'saas-b2b': { formality: 5, warmth: 6, energy: 6, humor: 3, authority: 7, complexity: 6, directness: 7, personality: 5 },
  'ecommerce': { formality: 3, warmth: 8, energy: 7, humor: 5, authority: 4, complexity: 3, directness: 7, personality: 6 },
  'finance': { formality: 8, warmth: 5, energy: 4, humor: 1, authority: 9, complexity: 7, directness: 6, personality: 3 },
  'healthcare': { formality: 7, warmth: 8, energy: 4, humor: 2, authority: 8, complexity: 5, directness: 6, personality: 4 },
  'creative-agency': { formality: 2, warmth: 7, energy: 9, humor: 7, authority: 5, complexity: 4, directness: 8, personality: 10 },
  'nonprofit': { formality: 5, warmth: 9, energy: 7, humor: 3, authority: 5, complexity: 3, directness: 7, personality: 6 },
  'education': { formality: 5, warmth: 8, energy: 6, humor: 4, authority: 7, complexity: 5, directness: 6, personality: 5 },
  'consulting': { formality: 7, warmth: 6, energy: 5, humor: 2, authority: 9, complexity: 7, directness: 7, personality: 4 },
  'solo-founder': { formality: 3, warmth: 8, energy: 7, humor: 5, authority: 5, complexity: 4, directness: 8, personality: 8 },
};

/**
 * Brand Voice Analysis Service
 */
export class BrandVoiceService {
  private profiles: Map<string, BrandVoiceProfile> = new Map(); // In-memory, will persist to DB

  /**
   * Analyze sample content to suggest voice attributes
   */
  async analyzeContent(samples: string[]): Promise<{
    suggestedAttributes: VoiceAttributes;
    detectedPatterns: string[];
    confidence: number;
  }> {
    if (samples.length === 0) {
      return {
        suggestedAttributes: DEFAULT_VOICE_ATTRIBUTES,
        detectedPatterns: [],
        confidence: 0,
      };
    }

    const router = getRouter();
    const combinedSamples = samples.join('\n\n---\n\n');

    try {
      const response = await router.generate({
        userId: 'system',
        prompt: `Analyze the following writing samples and extract the brand voice characteristics.

WRITING SAMPLES:
${combinedSamples}

Analyze these samples and provide:
1. Voice attribute scores (1-10 scale) for each dimension
2. Key patterns you detected
3. Confidence level (0-100)

Respond in this exact JSON format:
{
  "attributes": {
    "formality": <1-10>,
    "warmth": <1-10>,
    "energy": <1-10>,
    "humor": <1-10>,
    "authority": <1-10>,
    "complexity": <1-10>,
    "directness": <1-10>,
    "personality": <1-10>
  },
  "patterns": ["pattern1", "pattern2", ...],
  "confidence": <0-100>
}`,
        taskType: 'analysis',
        routingMode: 'quality',
        maxTokens: 500,
      });

      const parsed = JSON.parse(response.content);

      return {
        suggestedAttributes: parsed.attributes,
        detectedPatterns: parsed.patterns || [],
        confidence: parsed.confidence / 100,
      };
    } catch (error) {
      console.error('Voice analysis failed:', error);
      return {
        suggestedAttributes: DEFAULT_VOICE_ATTRIBUTES,
        detectedPatterns: [],
        confidence: 0,
      };
    }
  }

  /**
   * Generate voice guidelines from attributes and examples
   */
  async generateGuidelines(
    brandBasics: WizardStep1Data,
    attributes: VoiceAttributes,
    examples: string[],
    antiExamples: string[]
  ): Promise<{
    guidelines: string;
    toneKeywords: string[];
    avoidKeywords: string[];
  }> {
    const router = getRouter();

    const attributeDescription = this.describeAttributes(attributes);
    const examplesText = examples.length > 0
      ? `EXAMPLES THAT SOUND LIKE US:\n${examples.map((e, i) => `${i + 1}. "${e}"`).join('\n')}`
      : '';
    const antiExamplesText = antiExamples.length > 0
      ? `EXAMPLES THAT DON'T SOUND LIKE US:\n${antiExamples.map((e, i) => `${i + 1}. "${e}"`).join('\n')}`
      : '';

    try {
      const response = await router.generate({
        userId: 'system',
        prompt: `Create brand voice guidelines for ${brandBasics.brandName}.

BRAND CONTEXT:
- Industry: ${brandBasics.industry}
- Target Audience: ${brandBasics.targetAudience}
- Mission: ${brandBasics.missionStatement || 'Not specified'}

VOICE ATTRIBUTES:
${attributeDescription}

${examplesText}

${antiExamplesText}

Generate:
1. A comprehensive but concise voice guidelines document (2-3 paragraphs)
2. 8-12 keywords that capture the desired tone
3. 5-8 words/phrases to avoid

Respond in this exact JSON format:
{
  "guidelines": "Detailed guidelines here...",
  "toneKeywords": ["keyword1", "keyword2", ...],
  "avoidKeywords": ["avoid1", "avoid2", ...]
}`,
        taskType: 'analysis',
        routingMode: 'quality',
        maxTokens: 1000,
      });

      const parsed = JSON.parse(response.content);

      return {
        guidelines: parsed.guidelines,
        toneKeywords: parsed.toneKeywords || [],
        avoidKeywords: parsed.avoidKeywords || [],
      };
    } catch (error) {
      console.error('Guidelines generation failed:', error);
      return {
        guidelines: this.generateFallbackGuidelines(brandBasics, attributes),
        toneKeywords: this.extractToneKeywords(attributes),
        avoidKeywords: [],
      };
    }
  }

  /**
   * Create a new brand voice profile
   */
  async createProfile(
    userId: string,
    step1: WizardStep1Data,
    step2: WizardStep2Data,
    step3: WizardStep3Data,
    step4: WizardStep4Data,
    organizationId?: string
  ): Promise<BrandVoiceProfile> {
    const profile: BrandVoiceProfile = {
      id: uuid(),
      userId,
      organizationId,
      name: `${step1.brandName} Voice`,
      brandName: step1.brandName,
      industry: step1.industry,
      targetAudience: step1.targetAudience,
      missionStatement: step1.missionStatement,
      attributes: step2.attributes,
      exampleContent: step3.exampleContent,
      antiExamples: step3.antiExamples,
      voiceGuidelines: step4.voiceGuidelines,
      toneKeywords: step4.toneKeywords,
      avoidKeywords: step4.avoidKeywords,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    this.profiles.set(profile.id, profile);

    // TODO: Persist to database
    // await query('INSERT INTO brand_voice_profiles (...) VALUES (...)', [...]);

    return profile;
  }

  /**
   * Get user's active brand voice profile
   */
  getActiveProfile(userId: string): BrandVoiceProfile | undefined {
    for (const profile of this.profiles.values()) {
      if (profile.userId === userId && profile.isActive) {
        return profile;
      }
    }
    return undefined;
  }

  /**
   * Get all profiles for a user
   */
  getUserProfiles(userId: string): BrandVoiceProfile[] {
    return Array.from(this.profiles.values()).filter(p => p.userId === userId);
  }

  /**
   * Update a profile
   */
  async updateProfile(profileId: string, updates: Partial<BrandVoiceProfile>): Promise<BrandVoiceProfile | undefined> {
    const existing = this.profiles.get(profileId);
    if (!existing) return undefined;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.profiles.set(profileId, updated);
    return updated;
  }

  /**
   * Set a profile as active (deactivates others for user)
   */
  async setActiveProfile(userId: string, profileId: string): Promise<void> {
    for (const profile of this.profiles.values()) {
      if (profile.userId === userId) {
        profile.isActive = profile.id === profileId;
      }
    }
  }

  /**
   * Delete a profile
   */
  async deleteProfile(profileId: string): Promise<boolean> {
    return this.profiles.delete(profileId);
  }

  /**
   * Generate a voice injection prompt for AI content generation
   */
  generateVoicePrompt(profile: BrandVoiceProfile): string {
    const attributeInstructions = this.describeAttributes(profile.attributes);

    return `BRAND VOICE GUIDELINES FOR ${profile.brandName.toUpperCase()}:

${profile.voiceGuidelines}

VOICE CHARACTERISTICS:
${attributeInstructions}

TONE KEYWORDS TO EMBODY:
${profile.toneKeywords.join(', ')}

WORDS/PHRASES TO AVOID:
${profile.avoidKeywords.join(', ')}

TARGET AUDIENCE: ${profile.targetAudience}

Ensure all generated content authentically reflects this brand voice.`;
  }

  /**
   * Describe attributes in natural language
   */
  private describeAttributes(attrs: VoiceAttributes): string {
    const descriptions: string[] = [];

    // Formality
    if (attrs.formality <= 3) descriptions.push('Very casual and conversational');
    else if (attrs.formality <= 5) descriptions.push('Relaxed but professional');
    else if (attrs.formality <= 7) descriptions.push('Professional and polished');
    else descriptions.push('Formal and sophisticated');

    // Warmth
    if (attrs.warmth >= 7) descriptions.push('Warm, friendly, and personable');
    else if (attrs.warmth >= 5) descriptions.push('Approachable and genuine');
    else descriptions.push('Professional and measured');

    // Energy
    if (attrs.energy >= 7) descriptions.push('Energetic and enthusiastic');
    else if (attrs.energy >= 4) descriptions.push('Balanced energy');
    else descriptions.push('Calm and composed');

    // Humor
    if (attrs.humor >= 7) descriptions.push('Playful with appropriate humor');
    else if (attrs.humor >= 4) descriptions.push('Occasional light touches');
    else descriptions.push('Straightforward, minimal humor');

    // Authority
    if (attrs.authority >= 7) descriptions.push('Authoritative expert voice');
    else if (attrs.authority >= 4) descriptions.push('Knowledgeable but collaborative');
    else descriptions.push('Peer-level, collaborative tone');

    // Complexity
    if (attrs.complexity >= 7) descriptions.push('Technical and sophisticated vocabulary');
    else if (attrs.complexity >= 4) descriptions.push('Clear with some industry terms');
    else descriptions.push('Simple, accessible language');

    // Directness
    if (attrs.directness >= 7) descriptions.push('Direct and bold statements');
    else if (attrs.directness >= 4) descriptions.push('Clear but nuanced');
    else descriptions.push('Diplomatic and measured');

    // Personality
    if (attrs.personality >= 7) descriptions.push('Distinctive and memorable voice');
    else if (attrs.personality >= 4) descriptions.push('Some personality touches');
    else descriptions.push('Clean, neutral presentation');

    return descriptions.map((d, i) => `${i + 1}. ${d}`).join('\n');
  }

  /**
   * Generate fallback guidelines if AI fails
   */
  private generateFallbackGuidelines(basics: WizardStep1Data, attrs: VoiceAttributes): string {
    const formalityDesc = attrs.formality >= 6 ? 'professional' : 'conversational';
    const warmthDesc = attrs.warmth >= 6 ? 'warm and approachable' : 'clear and direct';

    return `${basics.brandName} communicates in a ${formalityDesc}, ${warmthDesc} manner. ` +
      `Our content is written for ${basics.targetAudience} and reflects our commitment to ` +
      `${basics.missionStatement || 'delivering value'}. We maintain consistency across all ` +
      `communications while adapting appropriately to context.`;
  }

  /**
   * Extract tone keywords from attributes
   */
  private extractToneKeywords(attrs: VoiceAttributes): string[] {
    const keywords: string[] = [];

    if (attrs.formality >= 6) keywords.push('professional', 'polished');
    else keywords.push('casual', 'relaxed');

    if (attrs.warmth >= 6) keywords.push('friendly', 'approachable');
    if (attrs.energy >= 6) keywords.push('energetic', 'dynamic');
    if (attrs.humor >= 5) keywords.push('witty', 'playful');
    if (attrs.authority >= 6) keywords.push('expert', 'authoritative');
    if (attrs.directness >= 6) keywords.push('direct', 'bold');
    if (attrs.personality >= 6) keywords.push('distinctive', 'memorable');

    return keywords;
  }
}

// Singleton instance
let brandVoiceInstance: BrandVoiceService | null = null;

export function getBrandVoiceService(): BrandVoiceService {
  if (!brandVoiceInstance) {
    brandVoiceInstance = new BrandVoiceService();
  }
  return brandVoiceInstance;
}
