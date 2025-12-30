/**
 * Rate Limiting Service
 *
 * Implements sliding window rate limiting using MongoDB.
 * Limits are stored with TTL for automatic cleanup.
 */

import { getRateLimitsCollection } from './db';
import {
  RateLimitEntry,
  RateLimitResource,
  RateLimitConfig,
  DEFAULT_RATE_LIMITS,
} from '@/types/platform';

// ============================================
// Rate Limit Checking
// ============================================

export interface RateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds
}

/**
 * Check and increment rate limit for a key
 * Uses a two-phase approach to handle the unique index properly:
 * 1. Try to increment existing valid window entry
 * 2. If no valid window exists, reset and start new window
 */
export async function checkRateLimit(
  key: string,
  resource: RateLimitResource,
  config?: RateLimitConfig
): Promise<RateLimitResult> {
  const collection = await getRateLimitsCollection();
  const limits = config || DEFAULT_RATE_LIMITS[resource];

  const now = new Date();
  const windowStart = new Date(now.getTime() - limits.windowSeconds * 1000);
  const expiresAt = new Date(now.getTime() + limits.windowSeconds * 1000);

  // First, try to increment an existing entry that's within the valid window
  const existingResult = await collection.findOneAndUpdate(
    {
      key,
      resource,
      windowStart: { $gte: windowStart },
    },
    {
      $inc: { count: 1 },
      $set: { expiresAt },
    },
    {
      returnDocument: 'after',
    }
  );

  if (existingResult) {
    // Found and incremented an existing valid window entry
    const resetAt = new Date(existingResult.windowStart.getTime() + limits.windowSeconds * 1000);

    if (existingResult.count > limits.limit) {
      const retryAfter = Math.ceil((resetAt.getTime() - now.getTime()) / 1000);
      return {
        allowed: false,
        current: existingResult.count,
        limit: limits.limit,
        remaining: 0,
        resetAt,
        retryAfter: retryAfter > 0 ? retryAfter : 1,
      };
    }

    return {
      allowed: true,
      current: existingResult.count,
      limit: limits.limit,
      remaining: limits.limit - existingResult.count,
      resetAt,
    };
  }

  // No valid window exists - either no entry or it's expired
  // Use findOneAndUpdate to atomically reset the entry (or create if doesn't exist)
  try {
    const resetResult = await collection.findOneAndUpdate(
      {
        key,
        resource,
      },
      {
        $set: {
          count: 1,
          windowStart: now,
          expiresAt,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
      }
    );

    // Successfully reset or created entry
    return {
      allowed: true,
      current: 1,
      limit: limits.limit,
      remaining: limits.limit - 1,
      resetAt: expiresAt,
    };
  } catch (error) {
    // Handle race condition: another request may have created/updated the entry
    if (error instanceof Error && error.message.includes('E11000')) {
      // Retry the increment - entry should exist now
      const retryResult = await collection.findOneAndUpdate(
        {
          key,
          resource,
        },
        {
          $inc: { count: 1 },
          $set: { expiresAt },
        },
        {
          returnDocument: 'after',
        }
      );

      if (retryResult) {
        const resetAt = new Date(retryResult.windowStart.getTime() + limits.windowSeconds * 1000);

        if (retryResult.count > limits.limit) {
          const retryAfter = Math.ceil((resetAt.getTime() - now.getTime()) / 1000);
          return {
            allowed: false,
            current: retryResult.count,
            limit: limits.limit,
            remaining: 0,
            resetAt,
            retryAfter: retryAfter > 0 ? retryAfter : 1,
          };
        }

        return {
          allowed: true,
          current: retryResult.count,
          limit: limits.limit,
          remaining: limits.limit - retryResult.count,
          resetAt,
        };
      }
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Check rate limit without incrementing (peek)
 */
export async function peekRateLimit(
  key: string,
  resource: RateLimitResource,
  config?: RateLimitConfig
): Promise<RateLimitResult> {
  const collection = await getRateLimitsCollection();
  const limits = config || DEFAULT_RATE_LIMITS[resource];

  const now = new Date();
  const windowStart = new Date(now.getTime() - limits.windowSeconds * 1000);

  const existing = await collection.findOne({
    key,
    resource,
    windowStart: { $gte: windowStart },
  });

  if (!existing) {
    return {
      allowed: true,
      current: 0,
      limit: limits.limit,
      remaining: limits.limit,
      resetAt: new Date(now.getTime() + limits.windowSeconds * 1000),
    };
  }

  const resetAt = new Date(existing.windowStart.getTime() + limits.windowSeconds * 1000);
  const remaining = Math.max(0, limits.limit - existing.count);
  const allowed = existing.count < limits.limit;

  return {
    allowed,
    current: existing.count,
    limit: limits.limit,
    remaining,
    resetAt,
    retryAfter: allowed ? undefined : Math.ceil((resetAt.getTime() - now.getTime()) / 1000),
  };
}

/**
 * Reset rate limit for a key
 */
export async function resetRateLimit(key: string, resource: RateLimitResource): Promise<void> {
  const collection = await getRateLimitsCollection();
  await collection.deleteMany({ key, resource });
}

// ============================================
// Key Generators
// ============================================

/**
 * Generate rate limit key for IP address
 */
export function getIpKey(ip: string): string {
  // Normalize IP (handle IPv6 mapped IPv4)
  const normalizedIp = ip.replace(/^::ffff:/, '');
  return `ip:${normalizedIp}`;
}

/**
 * Generate rate limit key for user
 */
export function getUserKey(userId: string): string {
  return `user:${userId}`;
}

/**
 * Generate rate limit key for email
 */
export function getEmailKey(email: string): string {
  return `email:${email.toLowerCase()}`;
}

/**
 * Generate rate limit key for form + IP
 */
export function getFormIpKey(formId: string, ip: string): string {
  const normalizedIp = ip.replace(/^::ffff:/, '');
  return `form:${formId}:ip:${normalizedIp}`;
}

/**
 * Generate rate limit key for form + user
 */
export function getFormUserKey(formId: string, userId: string): string {
  return `form:${formId}:user:${userId}`;
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Check form submission rate limit (public, IP-based)
 */
export async function checkPublicSubmissionLimit(
  formId: string,
  ip: string
): Promise<RateLimitResult> {
  const key = getFormIpKey(formId, ip);
  return checkRateLimit(key, 'form_submit_public');
}

/**
 * Check form submission rate limit (authenticated, user-based)
 */
export async function checkAuthSubmissionLimit(
  formId: string,
  userId: string
): Promise<RateLimitResult> {
  const key = getFormUserKey(formId, userId);
  return checkRateLimit(key, 'form_submit_auth');
}

/**
 * Check API rate limit
 */
export async function checkApiLimit(userId: string): Promise<RateLimitResult> {
  const key = getUserKey(userId);
  return checkRateLimit(key, 'api');
}

/**
 * Check magic link rate limit
 */
export async function checkMagicLinkLimit(email: string): Promise<RateLimitResult> {
  const key = getEmailKey(email);
  return checkRateLimit(key, 'magic_link');
}

// ============================================
// Response Headers
// ============================================

/**
 * Generate rate limit headers for HTTP response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(result.resetAt.getTime() / 1000).toString(),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Create rate limit error response
 */
export function createRateLimitError(result: RateLimitResult): {
  status: number;
  body: { error: string; retryAfter: number };
  headers: Record<string, string>;
} {
  return {
    status: 429,
    body: {
      error: 'Too many requests. Please try again later.',
      retryAfter: result.retryAfter || 60,
    },
    headers: getRateLimitHeaders(result),
  };
}
