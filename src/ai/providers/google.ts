/**
 * Google Gemini Provider Implementation
 */

import { BaseProvider, ProviderRequestOptions, ProviderResponse, registerProvider } from './base';
import { AIProvider, AIRouterError } from '../types';

export class GoogleProvider extends BaseProvider {
  readonly provider: AIProvider = 'google';
  readonly defaultModel = 'gemini-1.5-flash';

  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  async generate(options: ProviderRequestOptions): Promise<ProviderResponse> {
    const { prompt, systemPrompt, model, maxTokens, temperature, apiKey } = options;

    const contents = [];

    // Gemini handles system prompts differently
    if (systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: `System: ${systemPrompt}\n\nUser: ${prompt}` }],
      });
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: prompt }],
      });
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw this.handleError(response.status, error);
      }

      const data = await response.json();

      // Extract text from response
      const candidate = data.candidates?.[0];
      const content = candidate?.content?.parts
        ?.map((part: any) => part.text)
        .join('') || '';

      // Gemini's usage metadata
      const usageMetadata = data.usageMetadata || {};

      return {
        content,
        inputTokens: usageMetadata.promptTokenCount || this.estimateTokens(prompt),
        outputTokens: usageMetadata.candidatesTokenCount || this.estimateTokens(content),
        finishReason: this.mapFinishReason(candidate?.finishReason),
      };
    } catch (error) {
      if (error instanceof AIRouterError) throw error;
      throw new AIRouterError(
        `Google API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR',
        'google',
        true
      );
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/models?key=${apiKey}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  getAvailableModels(): string[] {
    return ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];
  }

  private mapFinishReason(reason: string): 'stop' | 'length' | 'error' {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
      case 'RECITATION':
      case 'OTHER':
      default:
        return 'error';
    }
  }

  private handleError(status: number, error: any): AIRouterError {
    const message = error?.error?.message || 'Unknown error';

    switch (status) {
      case 401:
      case 403:
        return new AIRouterError('Invalid Google API key', 'INVALID_API_KEY', 'google', false);
      case 429:
        return new AIRouterError('Google rate limit exceeded', 'RATE_LIMITED', 'google', true);
      case 400:
        if (message.includes('safety')) {
          return new AIRouterError('Content filtered by safety settings', 'CONTENT_FILTERED', 'google', false);
        }
        return new AIRouterError(message, 'PROVIDER_ERROR', 'google', false);
      default:
        return new AIRouterError(message, 'PROVIDER_ERROR', 'google', true);
    }
  }
}

// Register the provider
export const googleProvider = new GoogleProvider();
registerProvider(googleProvider);
