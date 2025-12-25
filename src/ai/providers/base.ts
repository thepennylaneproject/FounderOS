/**
 * AI Provider Base Interface
 *
 * All AI providers must implement this interface for unified access
 */

import {
  AIProvider,
  GenerationRequest,
  GenerationResponse,
  TokenUsage,
  CostBreakdown,
  AIRouterError,
  ModelDefinition,
  getModelById,
} from '../types';

export interface ProviderRequestOptions {
  prompt: string;
  systemPrompt?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  apiKey: string;
}

export interface ProviderResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  finishReason: 'stop' | 'length' | 'error';
}

export abstract class BaseProvider {
  abstract readonly provider: AIProvider;
  abstract readonly defaultModel: string;

  /**
   * Generate a completion using this provider
   */
  abstract generate(options: ProviderRequestOptions): Promise<ProviderResponse>;

  /**
   * Check if the API key is valid
   */
  abstract validateApiKey(apiKey: string): Promise<boolean>;

  /**
   * Get available models for this provider
   */
  abstract getAvailableModels(): string[];

  /**
   * Calculate cost for a generation
   */
  calculateCost(modelId: string, usage: TokenUsage): CostBreakdown {
    const model = getModelById(modelId);
    if (!model) {
      // Fallback to zero cost if model not found
      return { inputCost: 0, outputCost: 0, totalCost: 0, currency: 'USD' };
    }

    const inputCost = (usage.inputTokens / 1000) * model.inputCostPer1k;
    const outputCost = (usage.outputTokens / 1000) * model.outputCostPer1k;

    return {
      inputCost: Math.round(inputCost * 1000000) / 1000000,  // Round to 6 decimal places
      outputCost: Math.round(outputCost * 1000000) / 1000000,
      totalCost: Math.round((inputCost + outputCost) * 1000000) / 1000000,
      currency: 'USD',
    };
  }

  /**
   * Estimate cost before generation (based on input tokens only)
   */
  estimateCost(modelId: string, inputTokens: number, estimatedOutputTokens: number): CostBreakdown {
    return this.calculateCost(modelId, {
      inputTokens,
      outputTokens: estimatedOutputTokens,
      totalTokens: inputTokens + estimatedOutputTokens,
    });
  }

  /**
   * Rough token count estimation (4 chars ≈ 1 token)
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

/**
 * Provider Registry - maps provider names to their implementations
 */
const providerRegistry = new Map<AIProvider, BaseProvider>();

export function registerProvider(provider: BaseProvider): void {
  providerRegistry.set(provider.provider, provider);
}

export function getProvider(name: AIProvider): BaseProvider | undefined {
  return providerRegistry.get(name);
}

export function getAllProviders(): BaseProvider[] {
  return Array.from(providerRegistry.values());
}

export function getAvailableProviders(): AIProvider[] {
  return Array.from(providerRegistry.keys());
}
