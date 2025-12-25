/**
 * AI Providers - Export all provider implementations
 *
 * Importing this file registers all providers automatically
 */

// Base types and utilities
export * from './base';

// Provider implementations (auto-register on import)
export { openaiProvider } from './openai';
export { anthropicProvider } from './anthropic';
export { googleProvider } from './google';
export { mistralProvider } from './mistral';
export { deepseekProvider } from './deepseek';

// Re-export provider getter functions
import { getProvider, getAllProviders, getAvailableProviders } from './base';
export { getProvider, getAllProviders, getAvailableProviders };
