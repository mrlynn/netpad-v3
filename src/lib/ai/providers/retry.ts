/**
 * Retry Utilities for LLM Providers
 * 
 * Provides retry logic with exponential backoff for provider operations
 */

import { ProviderError } from './base';

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Initial delay in milliseconds */
  initialDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier?: number;
  /** Whether to retry on rate limit errors */
  retryOnRateLimit?: boolean;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryOnRateLimit: true,
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay for retry attempt
 */
function calculateDelay(
  attempt: number,
  config: Required<RetryConfig>,
  retryAfter?: number
): number {
  // If provider specified retry-after, use that (for rate limits)
  if (retryAfter) {
    return Math.min(retryAfter * 1000, config.maxDelay);
  }

  // Exponential backoff: initialDelay * (backoffMultiplier ^ attempt)
  const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelay);
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | ProviderError | null = null;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if it's not a retryable error
      if (error instanceof ProviderError && !error.isRetryable()) {
        throw error;
      }

      // Don't retry rate limits if disabled
      if (
        error instanceof ProviderError &&
        error.code === 'RATE_LIMIT_EXCEEDED' &&
        !finalConfig.retryOnRateLimit
      ) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt >= finalConfig.maxRetries) {
        break;
      }

      // Calculate delay and wait
      const delay = calculateDelay(
        attempt,
        finalConfig,
        error instanceof ProviderError ? error.retryAfter : undefined
      );

      console.warn(
        `[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
        error.message
      );

      await sleep(delay);
    }
  }

  // All retries exhausted
  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Retry wrapper for streaming operations
 * 
 * Note: Streaming is more complex - errors can occur mid-stream.
 * This wrapper retries the initial connection, but once streaming
 * starts, errors should be handled by the consumer.
 */
export async function withRetryStream<T>(
  fn: () => Promise<AsyncIterable<T>>,
  config: RetryConfig = {}
): Promise<AsyncIterable<T>> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | ProviderError | null = null;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if it's not a retryable error
      if (error instanceof ProviderError && !error.isRetryable()) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt >= finalConfig.maxRetries) {
        break;
      }

      // Calculate delay and wait
      const delay = calculateDelay(
        attempt,
        finalConfig,
        error instanceof ProviderError ? error.retryAfter : undefined
      );

      console.warn(
        `[Retry Stream] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
        error.message
      );

      await sleep(delay);
    }
  }

  throw lastError || new Error('Retry failed with unknown error');
}
