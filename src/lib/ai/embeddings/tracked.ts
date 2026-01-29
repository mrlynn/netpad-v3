/**
 * Tracked Embedding Provider Wrapper
 *
 * Wraps embedding providers to add centralized analytics tracking.
 * All embedding calls go through aiAnalytics.logAIRequest for dashboard visibility.
 */

import { EmbeddingProvider, estimateTotalTokens } from './base';
import { logAIRequest } from '../aiAnalytics';
import { AIProvider } from '@/types/ai-analytics';

/**
 * Context for tracking embedding requests
 */
export interface EmbeddingTrackingContext {
  organizationId: string;
  userId: string;
  isGuest?: boolean;
  feature: string; // e.g., 'rag_conversational_forms', 'rag_faq_search'
  endpoint: string; // e.g., '/api/rag/documents/upload', '/api/rag/faqs'
}

/**
 * Wraps an embedding provider to add analytics tracking
 */
export class TrackedEmbeddingProvider implements EmbeddingProvider {
  constructor(
    private readonly innerProvider: EmbeddingProvider,
    private readonly context: EmbeddingTrackingContext
  ) {}

  get providerId() {
    return this.innerProvider.providerId;
  }

  get dimensions() {
    return this.innerProvider.dimensions;
  }

  get modelName() {
    return this.innerProvider.modelName;
  }

  /**
   * Generate embeddings with tracking
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const startTime = Date.now();
    const estimatedTokens = estimateTotalTokens(texts);

    try {
      const embeddings = await this.innerProvider.generateEmbeddings(texts);
      const latencyMs = Date.now() - startTime;

      // Log successful request
      await this.trackRequest(estimatedTokens, 0, latencyMs, true);

      return embeddings;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = (error as any).code;

      // Log failed request
      await this.trackRequest(estimatedTokens, 0, latencyMs, false, errorCode, errorMessage);

      throw error;
    }
  }

  /**
   * Generate query embedding with tracking
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    const startTime = Date.now();
    const estimatedTokens = estimateTotalTokens([query]);

    try {
      const embedding = await this.innerProvider.generateQueryEmbedding(query);
      const latencyMs = Date.now() - startTime;

      // Log successful request
      await this.trackRequest(estimatedTokens, 0, latencyMs, true);

      return embedding;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = (error as any).code;

      // Log failed request
      await this.trackRequest(estimatedTokens, 0, latencyMs, false, errorCode, errorMessage);

      throw error;
    }
  }

  /**
   * Pass through availability check (no tracking needed)
   */
  async isAvailable(): Promise<boolean> {
    return this.innerProvider.isAvailable();
  }

  /**
   * Pass through cost estimation (no tracking needed)
   */
  estimateCost(texts: string[]): number {
    return this.innerProvider.estimateCost(texts);
  }

  /**
   * Pass through model info (no tracking needed)
   */
  getModelInfo() {
    return this.innerProvider.getModelInfo();
  }

  /**
   * Track embedding request through centralized analytics
   */
  private async trackRequest(
    promptTokens: number,
    completionTokens: number,
    latencyMs: number,
    success: boolean,
    errorCode?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      // Map embedding provider to AIProvider type
      const provider = this.mapProviderType(this.innerProvider.providerId);

      await logAIRequest({
        organizationId: this.context.organizationId,
        userId: this.context.userId,
        isGuest: this.context.isGuest || false,
        feature: this.context.feature as any, // Cast to AIFeature
        endpoint: this.context.endpoint,
        model: this.innerProvider.modelName,
        provider,
        tokens: {
          prompt: promptTokens,
          completion: completionTokens,
          total: promptTokens + completionTokens,
        },
        latencyMs,
        success,
        errorCode,
        errorMessage,
      });
    } catch (error) {
      // Don't let tracking failures break the main flow
      console.error('[TrackedEmbedding] Failed to log analytics:', error);
    }
  }

  /**
   * Map embedding provider type to AI provider type for analytics
   */
  private mapProviderType(providerId: string): AIProvider {
    switch (providerId) {
      case 'openai':
        return 'openai';
      case 'voyage':
      case 'atlas-ai':
      case 'atlas-embedding-api':
        // Map embedding providers to openrouter for analytics tracking
        // (Voyage and Atlas AI Services are third-party providers)
        return 'openrouter';
      default:
        return 'openai'; // Default fallback
    }
  }
}

/**
 * Create a tracked embedding provider
 *
 * Use this instead of directly using embedding providers to ensure
 * all calls are tracked in the AI dashboard.
 *
 * @example
 * ```typescript
 * const provider = createDefaultEmbeddingProvider();
 * const tracked = createTrackedEmbeddingProvider(provider, {
 *   organizationId: 'org_123',
 *   userId: 'user_456',
 *   feature: 'rag_conversational_forms',
 *   endpoint: '/api/rag/documents/upload'
 * });
 *
 * const embeddings = await tracked.generateEmbeddings(['hello', 'world']);
 * // Now tracked in AI dashboard!
 * ```
 */
export function createTrackedEmbeddingProvider(
  provider: EmbeddingProvider,
  context: EmbeddingTrackingContext
): TrackedEmbeddingProvider {
  return new TrackedEmbeddingProvider(provider, context);
}
