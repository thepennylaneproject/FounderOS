/**
 * AI Copywriter Agent
 *
 * Generates compelling email subject lines, body content,
 * and call-to-action copy with brand voice consistency.
 */

import { v4 as uuid } from 'uuid';
import { getRouter } from './AIRouter';
import { getBrandVoiceService } from './BrandVoice';
import { TaskType } from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Email subject line generation request
 */
export interface SubjectLineRequest {
  userId: string;

  // Context about the email
  emailPurpose: EmailPurpose;
  productOrService?: string;
  targetAction?: string;

  // Personalization
  recipientName?: string;
  companyName?: string;
  customVariables?: Record<string, string>;

  // Generation options
  variantCount?: number;  // How many A/B variants (default: 3)
  maxLength?: number;     // Max characters (default: 60)
  includeEmoji?: boolean;
  urgencyLevel?: 'none' | 'subtle' | 'moderate' | 'high';

  // Style overrides
  toneOverride?: ToneStyle;
}

/**
 * Email body generation request
 */
export interface EmailBodyRequest {
  userId: string;

  // Email context
  subjectLine: string;
  emailPurpose: EmailPurpose;
  keyPoints: string[];
  callToAction: string;

  // Personalization
  recipientName?: string;
  recipientContext?: string;  // e.g., "Downloaded our ebook last week"
  companyName?: string;
  customVariables?: Record<string, string>;

  // Format options
  format: EmailFormat;
  lengthPreference: 'short' | 'medium' | 'long';
  includePSLine?: boolean;

  // Style overrides
  toneOverride?: ToneStyle;
}

/**
 * Call-to-action generation request
 */
export interface CTARequest {
  userId: string;
  context: string;
  targetAction: string;
  buttonOrLink: 'button' | 'link' | 'both';
  variantCount?: number;
}

export type EmailPurpose =
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

export type EmailFormat =
  | 'plain-text'
  | 'simple-html'
  | 'rich-html';

export type ToneStyle =
  | 'professional'
  | 'friendly'
  | 'urgent'
  | 'casual'
  | 'authoritative'
  | 'empathetic'
  | 'enthusiastic'
  | 'conversational';

/**
 * Generated subject line with metadata
 */
export interface SubjectLineVariant {
  id: string;
  text: string;
  textWithVariables: string;  // With {{variable}} placeholders
  characterCount: number;
  hasEmoji: boolean;
  estimatedOpenRate: 'low' | 'medium' | 'high';
  strategy: string;  // e.g., "curiosity gap", "social proof", "urgency"
}

/**
 * Generated email body
 */
export interface GeneratedEmailBody {
  id: string;
  subject: string;

  // Content
  greeting: string;
  body: string;
  callToAction: string;
  signature: string;
  psLine?: string;

  // Full assembled content
  fullText: string;
  fullHtml?: string;

  // Metadata
  wordCount: number;
  readingTimeSeconds: number;
  personalizations: string[];  // Variables used
}

/**
 * Generated CTA
 */
export interface CTAVariant {
  id: string;
  buttonText: string;
  linkText: string;
  urgencyScore: number;  // 1-10
  style: 'direct' | 'benefit-focused' | 'curiosity' | 'social-proof';
}

// ============================================================================
// Copywriter Service
// ============================================================================

export class CopywriterService {

  /**
   * Generate subject line variants
   */
  async generateSubjectLines(request: SubjectLineRequest): Promise<SubjectLineVariant[]> {
    const router = getRouter();
    const variantCount = request.variantCount || 3;
    const maxLength = request.maxLength || 60;

    const purposeContext = this.getPurposeContext(request.emailPurpose);
    const toneInstruction = request.toneOverride
      ? `Use a ${request.toneOverride} tone.`
      : '';

    const personalizationContext = this.buildPersonalizationContext(request);

    const prompt = `Generate ${variantCount} compelling email subject line variants.

CONTEXT:
- Email Type: ${request.emailPurpose}
- Purpose: ${purposeContext}
${request.productOrService ? `- Product/Service: ${request.productOrService}` : ''}
${request.targetAction ? `- Desired Action: ${request.targetAction}` : ''}
${personalizationContext}

REQUIREMENTS:
- Maximum ${maxLength} characters each
- ${request.includeEmoji ? 'Include relevant emoji where appropriate' : 'No emojis'}
- Urgency Level: ${request.urgencyLevel || 'none'}
${toneInstruction}

Generate diverse approaches:
1. One using curiosity/intrigue
2. One using benefit-focused messaging
3. One using ${request.urgencyLevel === 'high' ? 'urgency/scarcity' : 'social proof or personalization'}

For each variant include:
- The subject line text (use {{firstName}}, {{companyName}} for personalization)
- Character count
- The strategy used
- Estimated open rate potential (low/medium/high)

Respond in this exact JSON format:
{
  "variants": [
    {
      "text": "subject line here",
      "characterCount": 45,
      "hasEmoji": false,
      "estimatedOpenRate": "high",
      "strategy": "curiosity gap"
    }
  ]
}`;

    try {
      const response = await router.generate({
        userId: request.userId,
        prompt,
        taskType: 'email-subject',
        routingMode: 'quality',
        maxTokens: 800,
      });

      const parsed = JSON.parse(response.content);

      return parsed.variants.map((v: any) => ({
        id: uuid(),
        text: this.resolveVariables(v.text, request),
        textWithVariables: v.text,
        characterCount: v.characterCount,
        hasEmoji: v.hasEmoji,
        estimatedOpenRate: v.estimatedOpenRate,
        strategy: v.strategy,
      }));
    } catch (error) {
      console.error('Subject line generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate email body content
   */
  async generateEmailBody(request: EmailBodyRequest): Promise<GeneratedEmailBody> {
    const router = getRouter();

    const lengthGuide = {
      short: '50-100 words',
      medium: '100-200 words',
      long: '200-350 words',
    }[request.lengthPreference];

    const formatInstruction = request.format === 'plain-text'
      ? 'Plain text only, no HTML or markdown.'
      : request.format === 'simple-html'
      ? 'Simple HTML with basic formatting (<p>, <strong>, <a>).'
      : 'Rich HTML with styled elements.';

    const personalizationContext = this.buildPersonalizationContext(request);

    const prompt = `Write a compelling email body.

EMAIL CONTEXT:
- Subject Line: "${request.subjectLine}"
- Purpose: ${request.emailPurpose}
- Key Points to Cover:
${request.keyPoints.map((p, i) => `  ${i + 1}. ${p}`).join('\n')}
- Call to Action: ${request.callToAction}
${personalizationContext}
${request.recipientContext ? `- Recipient Context: ${request.recipientContext}` : ''}

REQUIREMENTS:
- Length: ${lengthGuide}
- Format: ${formatInstruction}
${request.toneOverride ? `- Tone: ${request.toneOverride}` : ''}
${request.includePSLine ? '- Include a compelling P.S. line' : ''}

Structure the email with:
1. Personalized greeting
2. Opening hook related to the subject
3. Body covering key points naturally
4. Clear call-to-action
5. Professional signature placeholder
${request.includePSLine ? '6. P.S. line with bonus value or urgency' : ''}

Use {{firstName}}, {{companyName}} for personalization placeholders.

Respond in this exact JSON format:
{
  "greeting": "Hi {{firstName}},",
  "body": "Main email content here...",
  "callToAction": "Click here to get started",
  "signature": "Best regards,\\n[Your Name]",
  "psLine": "P.S. Optional post-script..."
}`;

    try {
      const response = await router.generate({
        userId: request.userId,
        prompt,
        taskType: 'email-body',
        routingMode: 'quality',
        maxTokens: 1500,
      });

      const parsed = JSON.parse(response.content);

      // Assemble full content
      const fullText = this.assembleEmail(parsed, request);
      const fullHtml = request.format !== 'plain-text'
        ? this.convertToHtml(fullText, request.format)
        : undefined;

      // Count words and estimate reading time
      const wordCount = fullText.split(/\s+/).length;
      const readingTimeSeconds = Math.ceil(wordCount / 3.5); // ~200 wpm

      // Extract personalization variables used
      const personalizations = this.extractVariables(fullText);

      return {
        id: uuid(),
        subject: request.subjectLine,
        greeting: parsed.greeting,
        body: parsed.body,
        callToAction: parsed.callToAction,
        signature: parsed.signature,
        psLine: parsed.psLine,
        fullText,
        fullHtml,
        wordCount,
        readingTimeSeconds,
        personalizations,
      };
    } catch (error) {
      console.error('Email body generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate CTA variants
   */
  async generateCTAs(request: CTARequest): Promise<CTAVariant[]> {
    const router = getRouter();
    const variantCount = request.variantCount || 4;

    const prompt = `Generate ${variantCount} call-to-action variants.

CONTEXT:
${request.context}

TARGET ACTION:
${request.targetAction}

Generate diverse CTA styles:
1. Direct and action-oriented
2. Benefit-focused (what they'll get)
3. Curiosity-driven (what they'll discover)
4. Social proof (join others)

For each, provide both button text (2-4 words) and link text (can be longer).

Respond in this exact JSON format:
{
  "variants": [
    {
      "buttonText": "Get Started",
      "linkText": "Start your free trial today",
      "urgencyScore": 5,
      "style": "direct"
    }
  ]
}`;

    try {
      const response = await router.generate({
        userId: request.userId,
        prompt,
        taskType: 'email-body',
        routingMode: 'speed',
        maxTokens: 600,
      });

      const parsed = JSON.parse(response.content);

      return parsed.variants.map((v: any) => ({
        id: uuid(),
        buttonText: v.buttonText,
        linkText: v.linkText,
        urgencyScore: v.urgencyScore,
        style: v.style,
      }));
    } catch (error) {
      console.error('CTA generation failed:', error);
      throw error;
    }
  }

  /**
   * Rewrite/improve existing copy
   */
  async improveCopy(
    userId: string,
    originalText: string,
    improvementGoal: 'clarity' | 'engagement' | 'persuasion' | 'brevity' | 'personalization'
  ): Promise<{ improved: string; changes: string[] }> {
    const router = getRouter();

    const goalInstructions = {
      clarity: 'Make the text clearer and easier to understand. Remove jargon and simplify sentence structure.',
      engagement: 'Make the text more engaging and interesting. Add hooks, questions, and dynamic language.',
      persuasion: 'Make the text more persuasive. Add social proof, benefits, and urgency where appropriate.',
      brevity: 'Make the text more concise. Remove filler words and redundancy while preserving meaning.',
      personalization: 'Add personalization opportunities. Insert {{variable}} placeholders where personal touches would help.',
    };

    const prompt = `Improve this email copy.

ORIGINAL TEXT:
"""
${originalText}
"""

IMPROVEMENT GOAL: ${improvementGoal}
${goalInstructions[improvementGoal]}

Provide:
1. The improved version
2. A list of specific changes made

Respond in this exact JSON format:
{
  "improved": "The improved text here...",
  "changes": ["Change 1 description", "Change 2 description"]
}`;

    try {
      const response = await router.generate({
        userId,
        prompt,
        taskType: 'email-body',
        routingMode: 'quality',
        maxTokens: 1000,
      });

      const parsed = JSON.parse(response.content);
      return {
        improved: parsed.improved,
        changes: parsed.changes || [],
      };
    } catch (error) {
      console.error('Copy improvement failed:', error);
      throw error;
    }
  }

  /**
   * Analyze copy for effectiveness
   */
  async analyzeCopy(
    userId: string,
    text: string,
    type: 'subject' | 'body' | 'cta'
  ): Promise<{
    score: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  }> {
    const router = getRouter();

    const typeContext = {
      subject: 'email subject line (evaluate for open rate potential)',
      body: 'email body (evaluate for engagement and conversion)',
      cta: 'call-to-action (evaluate for click-through potential)',
    };

    const prompt = `Analyze this ${typeContext[type]}.

TEXT TO ANALYZE:
"""
${text}
"""

Evaluate for:
- Clarity and readability
- Emotional impact
- Persuasiveness
- Brand voice consistency
- Personalization opportunities

Provide:
1. Overall score (1-100)
2. Key strengths
3. Areas for improvement
4. Specific suggestions

Respond in this exact JSON format:
{
  "score": 75,
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "suggestions": ["suggestion 1", "suggestion 2"]
}`;

    try {
      const response = await router.generate({
        userId,
        prompt,
        taskType: 'analysis',
        routingMode: 'quality',
        maxTokens: 800,
      });

      return JSON.parse(response.content);
    } catch (error) {
      console.error('Copy analysis failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private getPurposeContext(purpose: EmailPurpose): string {
    const contexts: Record<EmailPurpose, string> = {
      'welcome': 'Welcoming new subscriber/customer, setting expectations',
      'newsletter': 'Regular content update, value delivery',
      'product-launch': 'Announcing new product or feature',
      'promotion': 'Special offer, discount, or sale',
      'cart-abandonment': 'Reminding about items left in cart',
      're-engagement': 'Winning back inactive subscribers',
      'follow-up': 'Following up on previous interaction',
      'event-invitation': 'Inviting to webinar, conference, or event',
      'feedback-request': 'Asking for review, survey, or feedback',
      'announcement': 'Company news or important update',
      'educational': 'Teaching, tips, or how-to content',
      'cold-outreach': 'Initial contact with new prospect',
    };
    return contexts[purpose] || purpose;
  }

  private buildPersonalizationContext(request: SubjectLineRequest | EmailBodyRequest): string {
    const parts: string[] = [];

    if (request.recipientName) {
      parts.push(`- Recipient: ${request.recipientName}`);
    }
    if (request.companyName) {
      parts.push(`- Company: ${request.companyName}`);
    }
    if (request.customVariables) {
      for (const [key, value] of Object.entries(request.customVariables)) {
        parts.push(`- ${key}: ${value}`);
      }
    }

    return parts.length > 0
      ? `\nPERSONALIZATION DATA:\n${parts.join('\n')}`
      : '';
  }

  private resolveVariables(
    text: string,
    request: SubjectLineRequest | EmailBodyRequest
  ): string {
    let resolved = text;

    if (request.recipientName) {
      resolved = resolved.replace(/\{\{firstName\}\}/gi, request.recipientName);
      resolved = resolved.replace(/\{\{name\}\}/gi, request.recipientName);
    }
    if (request.companyName) {
      resolved = resolved.replace(/\{\{companyName\}\}/gi, request.companyName);
      resolved = resolved.replace(/\{\{company\}\}/gi, request.companyName);
    }
    if (request.customVariables) {
      for (const [key, value] of Object.entries(request.customVariables)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
        resolved = resolved.replace(regex, value);
      }
    }

    return resolved;
  }

  private extractVariables(text: string): string[] {
    const matches = text.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
  }

  private assembleEmail(parsed: any, request: EmailBodyRequest): string {
    const parts = [
      parsed.greeting,
      '',
      parsed.body,
      '',
      parsed.callToAction,
      '',
      parsed.signature,
    ];

    if (request.includePSLine && parsed.psLine) {
      parts.push('', parsed.psLine);
    }

    return parts.join('\n');
  }

  private convertToHtml(text: string, format: EmailFormat): string {
    if (format === 'plain-text') return text;

    // Basic conversion
    let html = text
      .split('\n\n')
      .map(para => `<p>${para}</p>`)
      .join('\n');

    // Convert line breaks within paragraphs
    html = html.replace(/\n/g, '<br>');

    // Bold text between *asterisks*
    html = html.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');

    return html;
  }
}

// Singleton instance
let copywriterInstance: CopywriterService | null = null;

export function getCopywriter(): CopywriterService {
  if (!copywriterInstance) {
    copywriterInstance = new CopywriterService();
  }
  return copywriterInstance;
}
