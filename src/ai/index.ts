/**
 * AI Campaign Studio - Main Export
 *
 * Multi-model AI routing with intelligent selection, cost tracking,
 * and brand voice management.
 */

// Core types
export * from './types';

// AI Router
export { AIRouter, getRouter, configureRouter, type RouterConfig } from './AIRouter';

// Cost Tracking
export { CostTracker, costTracker, AI_USAGE_MIGRATION, type BudgetCheckResult } from './CostTracker';

// Providers
export {
  BaseProvider,
  getProvider,
  getAllProviders,
  getAvailableProviders,
} from './providers';

// Brand Voice
export {
  BrandVoiceService,
  getBrandVoiceService,
  DEFAULT_VOICE_ATTRIBUTES,
  ATTRIBUTE_LABELS,
  INDUSTRY_PRESETS,
  type BrandVoiceProfile,
  type VoiceAttributes,
  type WizardStep1Data,
  type WizardStep2Data,
  type WizardStep3Data,
  type WizardStep4Data,
} from './BrandVoice';

// Copywriter Agent
export {
  CopywriterService,
  getCopywriter,
  type SubjectLineRequest,
  type EmailBodyRequest,
  type CTARequest,
  type EmailPurpose,
  type EmailFormat,
  type ToneStyle,
  type SubjectLineVariant,
  type GeneratedEmailBody,
  type CTAVariant,
} from './Copywriter';

// Visual Generator
export {
  VisualGeneratorService,
  getVisualGenerator,
  IMAGE_TEMPLATES,
  type ImageProvider,
  type ImageStyle,
  type ImagePurpose,
  type AspectRatio,
  type ImageGenerationRequest,
  type GeneratedImage,
  type ImageTemplate,
} from './VisualGenerator';

// Personalization Engine
export {
  PersonalizationEngine,
  getPersonalizationEngine,
  STANDARD_MERGE_TAGS,
  type ContactData,
  type MergeTag,
  type MergeTagCategory,
  type DynamicBlock,
  type ContentRule,
  type RuleCondition,
  type ConditionOperator,
  type PersonalizationSuggestion,
  type PersonalizedContent,
} from './PersonalizationEngine';
