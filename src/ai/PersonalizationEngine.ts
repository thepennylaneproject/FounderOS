/**
 * AI Personalization Engine
 *
 * Creates hyper-personalized email content using contact data,
 * behavioral signals, and AI-powered content generation.
 */

import { v4 as uuid } from 'uuid';
import { getRouter } from './AIRouter';

// ============================================================================
// Types
// ============================================================================

/**
 * Contact data that can be used for personalization
 */
export interface ContactData {
  // Identity
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  company?: string;
  jobTitle?: string;

  // Demographics
  location?: {
    city?: string;
    state?: string;
    country?: string;
    timezone?: string;
  };

  // Behavioral
  lastActivity?: Date;
  totalPurchases?: number;
  lifetimeValue?: number;
  engagementScore?: number;  // 0-100

  // Preferences
  preferredProducts?: string[];
  interests?: string[];
  communicationPreference?: 'frequent' | 'occasional' | 'minimal';

  // Segments
  segments?: string[];
  tags?: string[];

  // Custom fields
  customFields?: Record<string, string | number | boolean>;
}

/**
 * A merge tag that can be inserted into content
 */
export interface MergeTag {
  tag: string;            // e.g., {{firstName}}
  displayName: string;    // e.g., "First Name"
  fallback?: string;      // e.g., "there" (for "Hi {{firstName|there}}")
  category: MergeTagCategory;
  example?: string;
}

export type MergeTagCategory =
  | 'identity'
  | 'company'
  | 'location'
  | 'behavior'
  | 'custom'
  | 'computed'
  | 'conditional';

/**
 * Dynamic content block that varies by recipient
 */
export interface DynamicBlock {
  id: string;
  name: string;
  description?: string;

  // The rules that determine which variant to show
  rules: ContentRule[];

  // Default content if no rules match
  defaultContent: string;
}

/**
 * A rule for conditional content
 */
export interface ContentRule {
  id: string;
  name: string;
  priority: number;  // Lower = higher priority

  // Condition
  condition: RuleCondition;

  // Content to show if condition matches
  content: string;
}

export interface RuleCondition {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean | string[];
  conjunction?: 'AND' | 'OR';
  nested?: RuleCondition[];
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty'
  | 'in_list'
  | 'not_in_list';

/**
 * A personalization suggestion from AI
 */
export interface PersonalizationSuggestion {
  id: string;
  type: 'merge_tag' | 'dynamic_block' | 'conditional' | 'ai_generated';
  description: string;
  implementation: string;  // The actual code/template to use
  impact: 'low' | 'medium' | 'high';
  reason: string;
}

/**
 * Personalized content result
 */
export interface PersonalizedContent {
  originalContent: string;
  personalizedContent: string;
  mergeTagsUsed: string[];
  dynamicBlocksUsed: string[];
  personalizationScore: number;  // 0-100
}

// ============================================================================
// Standard Merge Tags
// ============================================================================

export const STANDARD_MERGE_TAGS: MergeTag[] = [
  // Identity
  { tag: '{{firstName}}', displayName: 'First Name', fallback: 'there', category: 'identity', example: 'John' },
  { tag: '{{lastName}}', displayName: 'Last Name', category: 'identity', example: 'Smith' },
  { tag: '{{fullName}}', displayName: 'Full Name', category: 'identity', example: 'John Smith' },
  { tag: '{{email}}', displayName: 'Email Address', category: 'identity', example: 'john@example.com' },

  // Company
  { tag: '{{company}}', displayName: 'Company Name', category: 'company', example: 'Acme Inc' },
  { tag: '{{jobTitle}}', displayName: 'Job Title', category: 'company', example: 'Product Manager' },

  // Location
  { tag: '{{city}}', displayName: 'City', category: 'location', example: 'San Francisco' },
  { tag: '{{state}}', displayName: 'State/Region', category: 'location', example: 'California' },
  { tag: '{{country}}', displayName: 'Country', category: 'location', example: 'United States' },
  { tag: '{{timezone}}', displayName: 'Timezone', category: 'location', example: 'PST' },

  // Behavioral
  { tag: '{{lastPurchaseDate}}', displayName: 'Last Purchase Date', category: 'behavior', example: 'December 15' },
  { tag: '{{totalPurchases}}', displayName: 'Total Purchases', category: 'behavior', example: '5' },
  { tag: '{{lifetimeValue}}', displayName: 'Lifetime Value', category: 'behavior', example: '$1,250' },

  // Computed
  { tag: '{{dayOfWeek}}', displayName: 'Current Day', category: 'computed', example: 'Monday' },
  { tag: '{{timeOfDay}}', displayName: 'Time of Day Greeting', category: 'computed', example: 'Good morning' },
  { tag: '{{seasonalGreeting}}', displayName: 'Seasonal Greeting', category: 'computed', example: 'Happy holidays' },
];

// ============================================================================
// Personalization Engine Service
// ============================================================================

export class PersonalizationEngine {
  private dynamicBlocks: Map<string, DynamicBlock> = new Map();

  /**
   * Personalize content for a specific contact
   */
  async personalizeContent(
    content: string,
    contact: ContactData,
    dynamicBlockIds?: string[]
  ): Promise<PersonalizedContent> {
    let personalizedContent = content;
    const mergeTagsUsed: string[] = [];
    const dynamicBlocksUsed: string[] = [];

    // Replace merge tags
    personalizedContent = this.replaceMergeTags(personalizedContent, contact, mergeTagsUsed);

    // Process dynamic blocks
    if (dynamicBlockIds?.length) {
      for (const blockId of dynamicBlockIds) {
        const block = this.dynamicBlocks.get(blockId);
        if (block) {
          const blockContent = this.evaluateDynamicBlock(block, contact);
          personalizedContent = personalizedContent.replace(
            new RegExp(`\\{\\{block:${blockId}\\}\\}`, 'g'),
            blockContent
          );
          dynamicBlocksUsed.push(blockId);
        }
      }
    }

    // Calculate personalization score
    const personalizationScore = this.calculatePersonalizationScore(
      content,
      personalizedContent,
      mergeTagsUsed,
      dynamicBlocksUsed
    );

    return {
      originalContent: content,
      personalizedContent,
      mergeTagsUsed,
      dynamicBlocksUsed,
      personalizationScore,
    };
  }

  /**
   * Batch personalize for multiple contacts
   */
  async batchPersonalize(
    content: string,
    contacts: ContactData[],
    dynamicBlockIds?: string[]
  ): Promise<Map<string, PersonalizedContent>> {
    const results = new Map<string, PersonalizedContent>();

    for (const contact of contacts) {
      const personalized = await this.personalizeContent(content, contact, dynamicBlockIds);
      results.set(contact.id, personalized);
    }

    return results;
  }

  /**
   * Get AI-powered personalization suggestions for content
   */
  async getSuggestions(
    content: string,
    availableContactFields: string[]
  ): Promise<PersonalizationSuggestion[]> {
    const router = getRouter();

    const prompt = `Analyze this email content and suggest personalization improvements.

CURRENT CONTENT:
"""
${content}
"""

AVAILABLE CONTACT FIELDS:
${availableContactFields.join(', ')}

Suggest personalization opportunities:
1. Merge tags to add (using {{fieldName}} syntax)
2. Dynamic content blocks (content that varies by segment)
3. Conditional content (if/then rules)
4. AI-generated personalized elements

For each suggestion, provide:
- Type (merge_tag, dynamic_block, conditional, ai_generated)
- Description of what to personalize
- Implementation (the template code)
- Expected impact (low/medium/high)
- Reason why this improves engagement

Respond in this exact JSON format:
{
  "suggestions": [
    {
      "type": "merge_tag",
      "description": "Add first name to greeting",
      "implementation": "Hi {{firstName|there}},",
      "impact": "high",
      "reason": "Personal greetings increase open rates by 26%"
    }
  ]
}`;

    try {
      const response = await router.generate({
        userId: 'system',
        prompt,
        taskType: 'analysis',
        routingMode: 'quality',
        maxTokens: 1500,
      });

      const parsed = JSON.parse(response.content);

      return parsed.suggestions.map((s: any) => ({
        id: uuid(),
        type: s.type,
        description: s.description,
        implementation: s.implementation,
        impact: s.impact,
        reason: s.reason,
      }));
    } catch (error) {
      console.error('Personalization suggestions failed:', error);
      return [];
    }
  }

  /**
   * Generate AI-personalized content for a contact
   */
  async generatePersonalizedContent(
    baseContent: string,
    contact: ContactData,
    personalizationType: 'subtle' | 'moderate' | 'aggressive'
  ): Promise<{ content: string; changes: string[] }> {
    const router = getRouter();

    const intensityGuide = {
      subtle: 'Make minimal personalization changes. Just add name and basic details.',
      moderate: 'Add meaningful personalization based on their industry, role, and interests.',
      aggressive: 'Heavily personalize every aspect possible. Reference their specific situation, company, and needs.',
    };

    const contactContext = this.buildContactContext(contact);

    const prompt = `Personalize this email for a specific recipient.

BASE CONTENT:
"""
${baseContent}
"""

RECIPIENT DETAILS:
${contactContext}

PERSONALIZATION LEVEL: ${personalizationType}
${intensityGuide[personalizationType]}

Rewrite the content with personalization. Keep the core message but adapt it to resonate with this specific person.

Respond in this exact JSON format:
{
  "content": "The personalized email content...",
  "changes": ["Change 1 description", "Change 2 description"]
}`;

    try {
      const response = await router.generate({
        userId: 'system',
        prompt,
        taskType: 'personalization',
        routingMode: 'quality',
        maxTokens: 2000,
      });

      return JSON.parse(response.content);
    } catch (error) {
      console.error('AI personalization failed:', error);
      return { content: baseContent, changes: [] };
    }
  }

  /**
   * Create a dynamic content block
   */
  createDynamicBlock(
    name: string,
    rules: ContentRule[],
    defaultContent: string,
    description?: string
  ): DynamicBlock {
    const block: DynamicBlock = {
      id: uuid(),
      name,
      description,
      rules: rules.sort((a, b) => a.priority - b.priority),
      defaultContent,
    };

    this.dynamicBlocks.set(block.id, block);
    return block;
  }

  /**
   * Get all dynamic blocks
   */
  getDynamicBlocks(): DynamicBlock[] {
    return Array.from(this.dynamicBlocks.values());
  }

  /**
   * Get a specific dynamic block
   */
  getDynamicBlock(id: string): DynamicBlock | undefined {
    return this.dynamicBlocks.get(id);
  }

  /**
   * Update a dynamic block
   */
  updateDynamicBlock(id: string, updates: Partial<DynamicBlock>): DynamicBlock | undefined {
    const existing = this.dynamicBlocks.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.dynamicBlocks.set(id, updated);
    return updated;
  }

  /**
   * Delete a dynamic block
   */
  deleteDynamicBlock(id: string): boolean {
    return this.dynamicBlocks.delete(id);
  }

  /**
   * Preview dynamic block content for a contact
   */
  previewDynamicBlock(blockId: string, contact: ContactData): string {
    const block = this.dynamicBlocks.get(blockId);
    if (!block) return '[Block not found]';

    return this.evaluateDynamicBlock(block, contact);
  }

  /**
   * Get available merge tags (standard + custom)
   */
  getAvailableMergeTags(customFields?: string[]): MergeTag[] {
    const tags = [...STANDARD_MERGE_TAGS];

    // Add custom field tags
    if (customFields) {
      for (const field of customFields) {
        tags.push({
          tag: `{{custom.${field}}}`,
          displayName: this.formatFieldName(field),
          category: 'custom',
        });
      }
    }

    return tags;
  }

  /**
   * Validate that content has valid merge tags
   */
  validateMergeTags(content: string, availableTags: MergeTag[]): {
    valid: boolean;
    invalidTags: string[];
    warnings: string[];
  } {
    const tagPattern = /\{\{([^}]+)\}\}/g;
    const foundTags: string[] = [];
    let match;

    while ((match = tagPattern.exec(content)) !== null) {
      foundTags.push(`{{${match[1]}}}`);
    }

    const validTagStrings = availableTags.map(t => t.tag);
    const invalidTags: string[] = [];
    const warnings: string[] = [];

    for (const tag of foundTags) {
      // Handle fallback syntax: {{firstName|there}}
      const baseTag = `{{${tag.replace(/[{}]/g, '').split('|')[0]}}}`;

      if (!validTagStrings.includes(baseTag)) {
        // Check if it's a block reference
        if (!tag.startsWith('{{block:')) {
          invalidTags.push(tag);
        }
      }

      // Check for missing fallbacks on common fields
      if (tag === '{{firstName}}' && !tag.includes('|')) {
        warnings.push('Consider adding a fallback for firstName: {{firstName|there}}');
      }
    }

    return {
      valid: invalidTags.length === 0,
      invalidTags,
      warnings,
    };
  }

  /**
   * Generate smart fallbacks for merge tags
   */
  async generateSmartFallbacks(
    content: string,
    contact: ContactData
  ): Promise<Record<string, string>> {
    const router = getRouter();
    const missingFields = this.findMissingFields(content, contact);

    if (missingFields.length === 0) {
      return {};
    }

    const prompt = `Generate appropriate fallback values for missing personalization fields.

CONTEXT:
- Email content topic: "${content.substring(0, 200)}..."
- Missing fields: ${missingFields.join(', ')}
- Known about recipient: ${this.buildContactContext(contact)}

For each missing field, suggest a natural fallback that:
1. Sounds natural in context
2. Doesn't reveal that data is missing
3. Maintains a personal tone

Respond in this exact JSON format:
{
  "fallbacks": {
    "firstName": "there",
    "company": "your company"
  }
}`;

    try {
      const response = await router.generate({
        userId: 'system',
        prompt,
        taskType: 'personalization',
        routingMode: 'speed',
        maxTokens: 500,
      });

      const parsed = JSON.parse(response.content);
      return parsed.fallbacks || {};
    } catch (error) {
      console.error('Smart fallback generation failed:', error);
      return {};
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private replaceMergeTags(
    content: string,
    contact: ContactData,
    usedTags: string[]
  ): string {
    let result = content;

    // Standard replacements
    const replacements: Record<string, string | undefined> = {
      'firstName': contact.firstName,
      'lastName': contact.lastName,
      'fullName': contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
      'email': contact.email,
      'company': contact.company,
      'jobTitle': contact.jobTitle,
      'city': contact.location?.city,
      'state': contact.location?.state,
      'country': contact.location?.country,
      'timezone': contact.location?.timezone,
      'totalPurchases': contact.totalPurchases?.toString(),
      'lifetimeValue': contact.lifetimeValue ? `$${contact.lifetimeValue.toLocaleString()}` : undefined,
    };

    // Computed values
    const now = new Date();
    const hour = now.getHours();
    replacements['dayOfWeek'] = now.toLocaleDateString('en-US', { weekday: 'long' });
    replacements['timeOfDay'] = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    // Month-based seasonal greeting
    const month = now.getMonth();
    if (month === 11 || month === 0) {
      replacements['seasonalGreeting'] = 'Happy holidays';
    } else if (month >= 2 && month <= 4) {
      replacements['seasonalGreeting'] = 'Happy spring';
    } else if (month >= 5 && month <= 7) {
      replacements['seasonalGreeting'] = 'Happy summer';
    } else {
      replacements['seasonalGreeting'] = 'Happy fall';
    }

    // Replace tags with fallback support: {{field|fallback}}
    for (const [field, value] of Object.entries(replacements)) {
      const tagWithFallback = new RegExp(`\\{\\{${field}\\|([^}]+)\\}\\}`, 'g');
      const tagWithoutFallback = new RegExp(`\\{\\{${field}\\}\\}`, 'g');

      if (result.match(tagWithFallback) || result.match(tagWithoutFallback)) {
        usedTags.push(`{{${field}}}`);
      }

      // With fallback
      result = result.replace(tagWithFallback, value || '$1');

      // Without fallback
      result = result.replace(tagWithoutFallback, value || '');
    }

    // Custom fields
    if (contact.customFields) {
      for (const [field, value] of Object.entries(contact.customFields)) {
        const tag = new RegExp(`\\{\\{custom\\.${field}\\}\\}`, 'g');
        if (result.match(tag)) {
          usedTags.push(`{{custom.${field}}}`);
        }
        result = result.replace(tag, String(value));
      }
    }

    return result;
  }

  private evaluateDynamicBlock(block: DynamicBlock, contact: ContactData): string {
    // Evaluate rules in priority order
    for (const rule of block.rules) {
      if (this.evaluateCondition(rule.condition, contact)) {
        return rule.content;
      }
    }

    return block.defaultContent;
  }

  private evaluateCondition(condition: RuleCondition, contact: ContactData): boolean {
    const fieldValue = this.getFieldValue(condition.field, contact);

    let result = false;

    switch (condition.operator) {
      case 'equals':
        result = fieldValue === condition.value;
        break;
      case 'not_equals':
        result = fieldValue !== condition.value;
        break;
      case 'contains':
        result = String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
        break;
      case 'not_contains':
        result = !String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
        break;
      case 'starts_with':
        result = String(fieldValue).toLowerCase().startsWith(String(condition.value).toLowerCase());
        break;
      case 'ends_with':
        result = String(fieldValue).toLowerCase().endsWith(String(condition.value).toLowerCase());
        break;
      case 'greater_than':
        result = Number(fieldValue) > Number(condition.value);
        break;
      case 'less_than':
        result = Number(fieldValue) < Number(condition.value);
        break;
      case 'is_empty':
        result = !fieldValue || fieldValue === '';
        break;
      case 'is_not_empty':
        result = !!fieldValue && fieldValue !== '';
        break;
      case 'in_list':
        result = Array.isArray(condition.value) && condition.value.includes(String(fieldValue));
        break;
      case 'not_in_list':
        result = Array.isArray(condition.value) && !condition.value.includes(String(fieldValue));
        break;
    }

    // Handle nested conditions
    if (condition.nested?.length) {
      const nestedResults = condition.nested.map(n => this.evaluateCondition(n, contact));

      if (condition.conjunction === 'AND') {
        result = result && nestedResults.every(r => r);
      } else {
        result = result || nestedResults.some(r => r);
      }
    }

    return result;
  }

  private getFieldValue(field: string, contact: ContactData): any {
    const parts = field.split('.');

    let value: any = contact;
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private buildContactContext(contact: ContactData): string {
    const parts: string[] = [];

    if (contact.firstName) parts.push(`Name: ${contact.firstName} ${contact.lastName || ''}`);
    if (contact.company) parts.push(`Company: ${contact.company}`);
    if (contact.jobTitle) parts.push(`Role: ${contact.jobTitle}`);
    if (contact.location?.city) parts.push(`Location: ${contact.location.city}, ${contact.location.state || contact.location.country || ''}`);
    if (contact.interests?.length) parts.push(`Interests: ${contact.interests.join(', ')}`);
    if (contact.segments?.length) parts.push(`Segments: ${contact.segments.join(', ')}`);
    if (contact.engagementScore) parts.push(`Engagement: ${contact.engagementScore}/100`);
    if (contact.totalPurchases) parts.push(`Purchases: ${contact.totalPurchases}`);

    return parts.join('\n');
  }

  private findMissingFields(content: string, contact: ContactData): string[] {
    const tagPattern = /\{\{(\w+)\}\}/g;
    const missing: string[] = [];
    let match;

    while ((match = tagPattern.exec(content)) !== null) {
      const field = match[1];
      const value = this.getFieldValue(field, contact);
      if (!value) {
        missing.push(field);
      }
    }

    return missing;
  }

  private calculatePersonalizationScore(
    original: string,
    personalized: string,
    mergeTags: string[],
    dynamicBlocks: string[]
  ): number {
    let score = 0;

    // Base points for using merge tags
    score += Math.min(mergeTags.length * 10, 40);

    // Points for dynamic blocks
    score += Math.min(dynamicBlocks.length * 15, 30);

    // Points for personalization changing the content
    if (personalized !== original) {
      score += 20;
    }

    // Points for using identity personalization
    if (mergeTags.some(t => t.includes('firstName') || t.includes('Name'))) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  private formatFieldName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
  }
}

// Singleton instance
let personalizationInstance: PersonalizationEngine | null = null;

export function getPersonalizationEngine(): PersonalizationEngine {
  if (!personalizationInstance) {
    personalizationInstance = new PersonalizationEngine();
  }
  return personalizationInstance;
}
