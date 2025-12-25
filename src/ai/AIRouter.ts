/**
 * AI Router - Multi-Model Intelligent Routing
 *
 * The brain of the AI Campaign Studio. Routes requests to the optimal
 * provider based on cost, quality, speed, and user preferences.
 */

import { v4 as uuid } from 'uuid';
import {
  AIProvider,
  GenerationRequest,
  GenerationResponse,
  RoutingMode,
  TaskType,
  ModelDefinition,
  MODEL_REGISTRY,
  getModelById,
  AIRouterError,
  UsageRecord,
  CostBreakdown,
  TokenUsage,
  UserAISettings,
} from './types';
import { getProvider, getAllProviders, BaseProvider } from './providers';

// Import providers to register them
import './providers/openai';
import './providers/anthropic';
import './providers/google';
import './providers/mistral';
import './providers/deepseek';

/**
 * Configuration for the router
 */
export interface RouterConfig {
  // Default API keys (platform keys)
  platformKeys: Partial<Record<AIProvider, string>>;

  // Fallback chain order
  fallbackOrder: AIProvider[];

  // Retry configuration
  maxRetries: number;
  retryDelayMs: number;

  // Default settings
  defaultRoutingMode: RoutingMode;
  defaultTemperature: number;
  defaultMaxTokens: number;
}

const DEFAULT_CONFIG: RouterConfig = {
  platformKeys: {},
  fallbackOrder: ['anthropic', 'openai', 'google', 'mistral', 'deepseek'],
  maxRetries: 3,
  retryDelayMs: 1000,
  defaultRoutingMode: 'auto',
  defaultTemperature: 0.7,
  defaultMaxTokens: 2048,
};

/**
 * Model selection result
 */
interface ModelSelection {
  model: ModelDefinition;
  provider: BaseProvider;
  apiKey: string;
  isUserKey: boolean;
  estimatedCost: CostBreakdown;
}

/**
 * Main AI Router Class
 */
export class AIRouter {
  private config: RouterConfig;
  private usageLog: UsageRecord[] = []; // In-memory for now, will persist to DB

  constructor(config: Partial<RouterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Main generation method - routes to optimal provider
   */
  async generate(
    request: GenerationRequest,
    userSettings?: UserAISettings
  ): Promise<GenerationResponse> {
    const requestId = request.requestId || uuid();
    const startTime = Date.now();

    // Select the best model based on request and settings
    const selection = await this.selectModel(request, userSettings);

    // Check budget before proceeding
    if (userSettings?.perRequestLimit) {
      if (selection.estimatedCost.totalCost > userSettings.perRequestLimit) {
        throw new AIRouterError(
          `Estimated cost $${selection.estimatedCost.totalCost.toFixed(4)} exceeds per-request limit of $${userSettings.perRequestLimit}`,
          'BUDGET_EXCEEDED',
          selection.model.provider,
          false
        );
      }
    }

    // Execute with retry and fallback
    const response = await this.executeWithFallback(
      request,
      selection,
      userSettings,
      requestId
    );

    const latencyMs = Date.now() - startTime;

    // Log usage
    await this.logUsage({
      id: uuid(),
      userId: request.userId,
      requestId,
      provider: response.provider,
      model: response.model,
      taskType: request.taskType || 'general',
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      cost: response.cost.totalCost,
      latencyMs,
      success: true,
      createdAt: new Date(),
    });

    return {
      ...response,
      requestId,
      latencyMs,
    };
  }

  /**
   * Select the best model based on routing mode and preferences
   */
  private async selectModel(
    request: GenerationRequest,
    userSettings?: UserAISettings
  ): Promise<ModelSelection> {
    const routingMode = request.routingMode || userSettings?.routingMode || this.config.defaultRoutingMode;

    let candidates: ModelDefinition[];

    switch (routingMode) {
      case 'quality':
        candidates = MODEL_REGISTRY.filter(m => m.qualityTier === 'excellent');
        break;

      case 'budget':
        candidates = MODEL_REGISTRY.filter(m => m.qualityTier !== 'standard')
          .sort((a, b) => {
            const aCost = (a.inputCostPer1k + a.outputCostPer1k) / 2;
            const bCost = (b.inputCostPer1k + b.outputCostPer1k) / 2;
            return aCost - bCost;
          });
        break;

      case 'speed':
        candidates = MODEL_REGISTRY.filter(m => m.speedTier === 'fast');
        break;

      case 'specific':
        if (request.preferredProvider) {
          candidates = MODEL_REGISTRY.filter(m => m.provider === request.preferredProvider);
        } else {
          candidates = MODEL_REGISTRY;
        }
        break;

      case 'auto':
      default:
        candidates = this.selectForTask(request.taskType || 'general');
        break;
    }

    // Filter to available providers (ones we have keys for)
    const availableCandidates = candidates.filter(m =>
      this.getApiKey(m.provider, userSettings) !== undefined
    );

    if (availableCandidates.length === 0) {
      throw new AIRouterError(
        'No AI providers available. Please configure at least one API key.',
        'NO_PROVIDERS_AVAILABLE',
        undefined,
        false
      );
    }

    // Pick the best candidate
    const model = availableCandidates[0];
    const provider = getProvider(model.provider);

    if (!provider) {
      throw new AIRouterError(
        `Provider ${model.provider} not found`,
        'PROVIDER_ERROR',
        model.provider,
        false
      );
    }

    const apiKey = this.getApiKey(model.provider, userSettings)!;
    const isUserKey = !!(userSettings?.providerKeys?.[model.provider]);

    // Estimate cost
    const estimatedInputTokens = provider.estimateTokens(request.prompt + (request.systemPrompt || ''));
    const estimatedOutputTokens = request.maxTokens || this.config.defaultMaxTokens;
    const estimatedCost = provider.estimateCost(model.id, estimatedInputTokens, estimatedOutputTokens);

    return {
      model,
      provider,
      apiKey,
      isUserKey,
      estimatedCost,
    };
  }

  /**
   * Select models optimized for specific task types
   */
  private selectForTask(taskType: TaskType): ModelDefinition[] {
    switch (taskType) {
      case 'email-subject':
        // Short, creative task - fast models work well
        return MODEL_REGISTRY.filter(m => m.speedTier === 'fast');

      case 'email-body':
      case 'personalization':
        // Need good quality for personalization
        return MODEL_REGISTRY.filter(m => m.qualityTier !== 'standard')
          .sort((a, b) => {
            // Prefer balanced cost/quality
            const aScore = a.qualityTier === 'excellent' ? 2 : 1;
            const bScore = b.qualityTier === 'excellent' ? 2 : 1;
            const aCost = (a.inputCostPer1k + a.outputCostPer1k) / 2;
            const bCost = (b.inputCostPer1k + b.outputCostPer1k) / 2;
            return (bScore - aScore) || (aCost - bCost);
          });

      case 'campaign-strategy':
      case 'analysis':
        // Complex reasoning - use best models
        return MODEL_REGISTRY.filter(m => m.qualityTier === 'excellent');

      case 'document':
        // Long-form content - need large context
        return MODEL_REGISTRY.filter(m => m.contextWindow >= 100000)
          .sort((a, b) => b.contextWindow - a.contextWindow);

      default:
        // General: balance cost and quality
        return MODEL_REGISTRY.filter(m => m.qualityTier !== 'standard')
          .sort((a, b) => {
            const aCost = (a.inputCostPer1k + a.outputCostPer1k) / 2;
            const bCost = (b.inputCostPer1k + b.outputCostPer1k) / 2;
            return aCost - bCost;
          });
    }
  }

  /**
   * Execute request with retry and fallback logic
   */
  private async executeWithFallback(
    request: GenerationRequest,
    selection: ModelSelection,
    userSettings: UserAISettings | undefined,
    requestId: string
  ): Promise<GenerationResponse> {
    let lastError: Error | undefined;
    let attempts = 0;

    // Build fallback chain
    const fallbackProviders = [
      selection.model.provider,
      ...this.config.fallbackOrder.filter(p => p !== selection.model.provider),
    ];

    for (const providerName of fallbackProviders) {
      const apiKey = this.getApiKey(providerName, userSettings);
      if (!apiKey) continue;

      const provider = getProvider(providerName);
      if (!provider) continue;

      // Get model for this provider
      const models = MODEL_REGISTRY.filter(m => m.provider === providerName);
      if (models.length === 0) continue;

      const model = models[0];

      // Retry loop
      for (let retry = 0; retry < this.config.maxRetries; retry++) {
        attempts++;

        try {
          const response = await provider.generate({
            prompt: request.prompt,
            systemPrompt: request.systemPrompt,
            model: model.id,
            maxTokens: request.maxTokens || this.config.defaultMaxTokens,
            temperature: request.temperature ?? this.config.defaultTemperature,
            apiKey,
          });

          const usage: TokenUsage = {
            inputTokens: response.inputTokens,
            outputTokens: response.outputTokens,
            totalTokens: response.inputTokens + response.outputTokens,
          };

          const cost = provider.calculateCost(model.id, usage);

          return {
            content: response.content,
            model: model.id,
            provider: providerName,
            usage,
            cost,
            latencyMs: 0, // Will be set by caller
            requestId,
            finishReason: response.finishReason,
          };
        } catch (error) {
          lastError = error as Error;

          // Don't retry non-retryable errors
          if (error instanceof AIRouterError && !error.retryable) {
            break;
          }

          // Wait before retry (exponential backoff)
          if (retry < this.config.maxRetries - 1) {
            await this.delay(this.config.retryDelayMs * Math.pow(2, retry));
          }
        }
      }
    }

    // All attempts failed
    throw lastError || new AIRouterError(
      'All providers failed',
      'NO_PROVIDERS_AVAILABLE',
      undefined,
      false
    );
  }

  /**
   * Get API key for a provider (user key takes precedence)
   */
  private getApiKey(provider: AIProvider, userSettings?: UserAISettings): string | undefined {
    // Check user's BYOK first
    const userKey = userSettings?.providerKeys?.[provider];
    if (userKey) return userKey;

    // Fall back to platform key
    return this.config.platformKeys[provider];
  }

  /**
   * Log usage for analytics and billing
   */
  private async logUsage(record: UsageRecord): Promise<void> {
    this.usageLog.push(record);

    // TODO: Persist to database
    // await query('INSERT INTO ai_usage_logs (...) VALUES (...)', [...]);
  }

  /**
   * Get usage summary for a user
   */
  async getUsageSummary(
    userId: string,
    period: 'day' | 'week' | 'month'
  ): Promise<{
    totalRequests: number;
    totalCost: number;
    byProvider: Record<string, { requests: number; cost: number }>;
  }> {
    const now = new Date();
    let periodStart: Date;

    switch (period) {
      case 'day':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const records = this.usageLog.filter(
      r => r.userId === userId && r.createdAt >= periodStart
    );

    const byProvider: Record<string, { requests: number; cost: number }> = {};

    for (const record of records) {
      if (!byProvider[record.provider]) {
        byProvider[record.provider] = { requests: 0, cost: 0 };
      }
      byProvider[record.provider].requests++;
      byProvider[record.provider].cost += record.cost;
    }

    return {
      totalRequests: records.length,
      totalCost: records.reduce((sum, r) => sum + r.cost, 0),
      byProvider,
    };
  }

  /**
   * Estimate cost before generation
   */
  estimateCost(
    prompt: string,
    systemPrompt: string = '',
    routingMode: RoutingMode = 'auto',
    preferredProvider?: AIProvider
  ): { lowEstimate: CostBreakdown; highEstimate: CostBreakdown; model: string } {
    // Get likely model
    let models: ModelDefinition[];

    switch (routingMode) {
      case 'quality':
        models = MODEL_REGISTRY.filter(m => m.qualityTier === 'excellent');
        break;
      case 'budget':
        models = MODEL_REGISTRY.sort((a, b) => a.inputCostPer1k - b.inputCostPer1k);
        break;
      case 'specific':
        models = preferredProvider
          ? MODEL_REGISTRY.filter(m => m.provider === preferredProvider)
          : MODEL_REGISTRY;
        break;
      default:
        models = MODEL_REGISTRY.filter(m => m.qualityTier === 'good');
    }

    const model = models[0] || MODEL_REGISTRY[0];
    const provider = getProvider(model.provider);

    const inputTokens = provider?.estimateTokens(prompt + systemPrompt) || Math.ceil((prompt + systemPrompt).length / 4);

    // Estimate output as 50-200% of input for typical tasks
    const lowOutputTokens = Math.ceil(inputTokens * 0.5);
    const highOutputTokens = Math.ceil(inputTokens * 2);

    const lowEstimate: CostBreakdown = {
      inputCost: (inputTokens / 1000) * model.inputCostPer1k,
      outputCost: (lowOutputTokens / 1000) * model.outputCostPer1k,
      totalCost: 0,
      currency: 'USD',
    };
    lowEstimate.totalCost = lowEstimate.inputCost + lowEstimate.outputCost;

    const highEstimate: CostBreakdown = {
      inputCost: (inputTokens / 1000) * model.inputCostPer1k,
      outputCost: (highOutputTokens / 1000) * model.outputCostPer1k,
      totalCost: 0,
      currency: 'USD',
    };
    highEstimate.totalCost = highEstimate.inputCost + highEstimate.outputCost;

    return { lowEstimate, highEstimate, model: model.id };
  }

  /**
   * Configure platform API keys
   */
  setApiKey(provider: AIProvider, key: string): void {
    this.config.platformKeys[provider] = key;
  }

  /**
   * Check which providers are available
   */
  getAvailableProviders(userSettings?: UserAISettings): AIProvider[] {
    const available: AIProvider[] = [];

    for (const provider of this.config.fallbackOrder) {
      if (this.getApiKey(provider, userSettings)) {
        available.push(provider);
      }
    }

    return available;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let routerInstance: AIRouter | null = null;

export function getRouter(): AIRouter {
  if (!routerInstance) {
    routerInstance = new AIRouter({
      platformKeys: {
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        google: process.env.GOOGLE_API_KEY,
        mistral: process.env.MISTRAL_API_KEY,
        deepseek: process.env.DEEPSEEK_API_KEY,
      },
    });
  }
  return routerInstance;
}

export function configureRouter(config: Partial<RouterConfig>): AIRouter {
  routerInstance = new AIRouter(config);
  return routerInstance;
}
