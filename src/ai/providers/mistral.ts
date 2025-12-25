/**
 * Mistral AI Provider Implementation
 */

import { BaseProvider, ProviderRequestOptions, ProviderResponse, registerProvider } from './base';
import { AIProvider, AIRouterError } from '../types';

export class MistralProvider extends BaseProvider {
  readonly provider: AIProvider = 'mistral';
  readonly defaultModel = 'mistral-small-latest';

  private readonly baseUrl = 'https://api.mistral.ai/v1';

  async generate(options: ProviderRequestOptions): Promise<ProviderResponse> {
    const { prompt, systemPrompt, model, maxTokens, temperature, apiKey } = options;

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw this.handleError(response.status, error);
      }

      const data = await response.json();
      const choice = data.choices[0];

      return {
        content: choice.message.content || '',
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        finishReason: this.mapFinishReason(choice.finish_reason),
      };
    } catch (error) {
      if (error instanceof AIRouterError) throw error;
      throw new AIRouterError(
        `Mistral API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR',
        'mistral',
        true
      );
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  getAvailableModels(): string[] {
    return ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'open-mistral-7b'];
  }

  private mapFinishReason(reason: string): 'stop' | 'length' | 'error' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      default:
        return 'error';
    }
  }

  private handleError(status: number, error: any): AIRouterError {
    const message = error?.message || error?.error?.message || 'Unknown error';

    switch (status) {
      case 401:
        return new AIRouterError('Invalid Mistral API key', 'INVALID_API_KEY', 'mistral', false);
      case 429:
        return new AIRouterError('Mistral rate limit exceeded', 'RATE_LIMITED', 'mistral', true);
      default:
        return new AIRouterError(message, 'PROVIDER_ERROR', 'mistral', true);
    }
  }
}

// Register the provider
export const mistralProvider = new MistralProvider();
registerProvider(mistralProvider);
