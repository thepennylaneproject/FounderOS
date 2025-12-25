/**
 * AI Campaign Studio - Core Types
 *
 * Shared type definitions for the multi-model AI router
 */

// ============================================================================
// Provider & Model Definitions
// ============================================================================

export type AIProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'mistral'
  | 'cohere'
  | 'deepseek'
  | 'huggingface';

export interface ModelDefinition {
  id: string;
  provider: AIProvider;
  name: string;
  contextWindow: number;
  maxOutput: number;
  inputCostPer1k: number;   // Cost per 1000 input tokens
  outputCostPer1k: number;  // Cost per 1000 output tokens
  speedTier: 'fast' | 'medium' | 'slow';
  qualityTier: 'standard' | 'good' | 'excellent';
  capabilities: ModelCapability[];
}

export type ModelCapability =
  | 'text-generation'
  | 'chat'
  | 'code'
  | 'vision'
  | 'function-calling'
  | 'json-mode';

// ============================================================================
// Request & Response Types
// ============================================================================

export interface GenerationRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;

  // Routing preferences
  routingMode?: RoutingMode;
  preferredProvider?: AIProvider;
  maxCost?: number;  // Maximum cost in dollars for this request

  // Context for smart routing
  taskType?: TaskType;
  brandVoiceId?: string;

  // Metadata
  userId: string;
  requestId?: string;
}

export type RoutingMode =
  | 'auto'           // System picks best model
  | 'quality'        // Always use top-tier models
  | 'budget'         // Use most cost-effective
  | 'speed'          // Use fastest available
  | 'specific';      // Use preferredProvider

export type TaskType =
  | 'email-subject'
  | 'email-body'
  | 'personalization'
  | 'campaign-strategy'
  | 'document'
  | 'analysis'
  | 'general';

export interface GenerationResponse {
  content: string;
  model: string;
  provider: AIProvider;

  // Usage & cost
  usage: TokenUsage;
  cost: CostBreakdown;

  // Performance
  latencyMs: number;

  // Metadata
  requestId: string;
  finishReason: 'stop' | 'length' | 'error';
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: 'USD';
}

// ============================================================================
// Provider Configuration
// ============================================================================

export interface ProviderConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string;  // For custom endpoints
  isUserKey: boolean; // BYOK - is this the user's own key?
  enabled: boolean;
}

export interface UserAISettings {
  userId: string;
  routingMode: RoutingMode;
  preferredProvider?: AIProvider;

  // Budget controls
  monthlyBudget?: number;
  perCampaignLimit?: number;
  perRequestLimit?: number;
  warnAtPercent: number;  // Warn when budget hits this %

  // BYOK keys (encrypted)
  providerKeys: Partial<Record<AIProvider, string>>;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Cost Tracking
// ============================================================================

export interface UsageRecord {
  id: string;
  userId: string;
  requestId: string;

  provider: AIProvider;
  model: string;
  taskType: TaskType;

  inputTokens: number;
  outputTokens: number;
  cost: number;

  latencyMs: number;
  success: boolean;
  errorMessage?: string;

  createdAt: Date;
}

export interface UsageSummary {
  userId: string;
  period: 'day' | 'week' | 'month';
  periodStart: Date;
  periodEnd: Date;

  totalRequests: number;
  totalTokens: number;
  totalCost: number;

  byProvider: Record<AIProvider, { requests: number; cost: number }>;
  byTaskType: Record<TaskType, { requests: number; cost: number }>;

  budgetUsedPercent?: number;
  budgetRemaining?: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class AIRouterError extends Error {
  constructor(
    message: string,
    public code: AIErrorCode,
    public provider?: AIProvider,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIRouterError';
  }
}

export type AIErrorCode =
  | 'PROVIDER_ERROR'
  | 'RATE_LIMITED'
  | 'INVALID_API_KEY'
  | 'BUDGET_EXCEEDED'
  | 'NO_PROVIDERS_AVAILABLE'
  | 'MODEL_NOT_FOUND'
  | 'CONTEXT_TOO_LONG'
  | 'CONTENT_FILTERED'
  | 'TIMEOUT'
  | 'UNKNOWN';

// ============================================================================
// Model Registry
// ============================================================================

export const MODEL_REGISTRY: ModelDefinition[] = [
  // OpenAI
  {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'GPT-4o',
    contextWindow: 128000,
    maxOutput: 4096,
    inputCostPer1k: 0.005,
    outputCostPer1k: 0.015,
    speedTier: 'medium',
    qualityTier: 'excellent',
    capabilities: ['text-generation', 'chat', 'vision', 'function-calling', 'json-mode'],
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    name: 'GPT-4o Mini',
    contextWindow: 128000,
    maxOutput: 16384,
    inputCostPer1k: 0.00015,
    outputCostPer1k: 0.0006,
    speedTier: 'fast',
    qualityTier: 'good',
    capabilities: ['text-generation', 'chat', 'vision', 'function-calling', 'json-mode'],
  },

  // Anthropic
  {
    id: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    name: 'Claude 3.5 Sonnet',
    contextWindow: 200000,
    maxOutput: 8192,
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
    speedTier: 'medium',
    qualityTier: 'excellent',
    capabilities: ['text-generation', 'chat', 'vision', 'function-calling'],
  },
  {
    id: 'claude-3-5-haiku-20241022',
    provider: 'anthropic',
    name: 'Claude 3.5 Haiku',
    contextWindow: 200000,
    maxOutput: 8192,
    inputCostPer1k: 0.001,
    outputCostPer1k: 0.005,
    speedTier: 'fast',
    qualityTier: 'good',
    capabilities: ['text-generation', 'chat', 'vision', 'function-calling'],
  },

  // Google
  {
    id: 'gemini-1.5-pro',
    provider: 'google',
    name: 'Gemini 1.5 Pro',
    contextWindow: 2000000,
    maxOutput: 8192,
    inputCostPer1k: 0.00125,
    outputCostPer1k: 0.005,
    speedTier: 'medium',
    qualityTier: 'excellent',
    capabilities: ['text-generation', 'chat', 'vision', 'function-calling'],
  },
  {
    id: 'gemini-1.5-flash',
    provider: 'google',
    name: 'Gemini 1.5 Flash',
    contextWindow: 1000000,
    maxOutput: 8192,
    inputCostPer1k: 0.000075,
    outputCostPer1k: 0.0003,
    speedTier: 'fast',
    qualityTier: 'good',
    capabilities: ['text-generation', 'chat', 'vision', 'function-calling'],
  },

  // Mistral
  {
    id: 'mistral-large-latest',
    provider: 'mistral',
    name: 'Mistral Large',
    contextWindow: 128000,
    maxOutput: 8192,
    inputCostPer1k: 0.002,
    outputCostPer1k: 0.006,
    speedTier: 'medium',
    qualityTier: 'excellent',
    capabilities: ['text-generation', 'chat', 'function-calling', 'json-mode'],
  },
  {
    id: 'mistral-small-latest',
    provider: 'mistral',
    name: 'Mistral Small',
    contextWindow: 128000,
    maxOutput: 8192,
    inputCostPer1k: 0.0002,
    outputCostPer1k: 0.0006,
    speedTier: 'fast',
    qualityTier: 'good',
    capabilities: ['text-generation', 'chat', 'function-calling', 'json-mode'],
  },

  // Cohere
  {
    id: 'command-r-plus',
    provider: 'cohere',
    name: 'Command R+',
    contextWindow: 128000,
    maxOutput: 4096,
    inputCostPer1k: 0.0025,
    outputCostPer1k: 0.01,
    speedTier: 'medium',
    qualityTier: 'excellent',
    capabilities: ['text-generation', 'chat', 'function-calling'],
  },
  {
    id: 'command-r',
    provider: 'cohere',
    name: 'Command R',
    contextWindow: 128000,
    maxOutput: 4096,
    inputCostPer1k: 0.00015,
    outputCostPer1k: 0.0006,
    speedTier: 'fast',
    qualityTier: 'good',
    capabilities: ['text-generation', 'chat', 'function-calling'],
  },

  // DeepSeek
  {
    id: 'deepseek-chat',
    provider: 'deepseek',
    name: 'DeepSeek V3',
    contextWindow: 64000,
    maxOutput: 8192,
    inputCostPer1k: 0.00014,
    outputCostPer1k: 0.00028,
    speedTier: 'fast',
    qualityTier: 'good',
    capabilities: ['text-generation', 'chat', 'code', 'function-calling'],
  },
];

// Helper to get models by criteria
export function getModelsByProvider(provider: AIProvider): ModelDefinition[] {
  return MODEL_REGISTRY.filter(m => m.provider === provider);
}

export function getModelById(id: string): ModelDefinition | undefined {
  return MODEL_REGISTRY.find(m => m.id === id);
}

export function getModelsByQuality(tier: 'standard' | 'good' | 'excellent'): ModelDefinition[] {
  return MODEL_REGISTRY.filter(m => m.qualityTier === tier);
}

export function getModelsBySpeed(tier: 'fast' | 'medium' | 'slow'): ModelDefinition[] {
  return MODEL_REGISTRY.filter(m => m.speedTier === tier);
}

export function getCheapestModel(): ModelDefinition {
  return MODEL_REGISTRY.reduce((cheapest, model) => {
    const modelAvgCost = (model.inputCostPer1k + model.outputCostPer1k) / 2;
    const cheapestAvgCost = (cheapest.inputCostPer1k + cheapest.outputCostPer1k) / 2;
    return modelAvgCost < cheapestAvgCost ? model : cheapest;
  });
}
