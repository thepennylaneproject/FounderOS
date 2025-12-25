/**
 * Anthropic Provider Implementation
 */

import { BaseProvider, ProviderRequestOptions, ProviderResponse, registerProvider } from './base';
import { AIProvider, AIRouterError } from '../types';

export class AnthropicProvider extends BaseProvider {
  readonly provider: AIProvider = 'anthropic';
  readonly defaultModel = 'claude-3-5-haiku-20241022';

  private readonly baseUrl = 'https://api.anthropic.com/v1';
  private readonly apiVersion = '2023-06-01';

  async generate(options: ProviderRequestOptions): Promise<ProviderResponse> {
    const { prompt, systemPrompt, model, maxTokens, temperature, apiKey } = options;

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': this.apiVersion,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt || undefined,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw this.handleError(response.status, error);
      }

      const data = await response.json();
      const content = data.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('');

      return {
        content,
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
        finishReason: this.mapStopReason(data.stop_reason),
      };
    } catch (error) {
      if (error instanceof AIRouterError) throw error;
      throw new AIRouterError(
        `Anthropic API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR',
        'anthropic',
        true
      );
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      // Anthropic doesn't have a simple validation endpoint, so we make a minimal request
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': this.apiVersion,
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });
      return response.ok || response.status === 400; // 400 means key is valid but request malformed
    } catch {
      return false;
    }
  }

  getAvailableModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ];
  }

  private mapStopReason(reason: string): 'stop' | 'length' | 'error' {
    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'length';
      default:
        return 'error';
    }
  }

  private handleError(status: number, error: any): AIRouterError {
    const message = error?.error?.message || 'Unknown error';

    switch (status) {
      case 401:
        return new AIRouterError('Invalid Anthropic API key', 'INVALID_API_KEY', 'anthropic', false);
      case 429:
        return new AIRouterError('Anthropic rate limit exceeded', 'RATE_LIMITED', 'anthropic', true);
      case 400:
        if (message.includes('context')) {
          return new AIRouterError('Input too long for model', 'CONTEXT_TOO_LONG', 'anthropic', false);
        }
        return new AIRouterError(message, 'PROVIDER_ERROR', 'anthropic', false);
      default:
        return new AIRouterError(message, 'PROVIDER_ERROR', 'anthropic', true);
    }
  }
}

// Register the provider
export const anthropicProvider = new AnthropicProvider();
registerProvider(anthropicProvider);
