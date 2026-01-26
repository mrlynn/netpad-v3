/**
 * API Timing Middleware
 * Automatically times all API route handlers
 *
 * This middleware complements the existing withMetrics middleware by adding:
 * - Console logging in development (colored output for quick debugging)
 * - Response headers (X-Response-Time, Server-Timing)
 * - Database query tracking via AsyncLocalStorage
 * - Integration with timedQuery for detailed query breakdowns
 *
 * For routes that already use withMetrics, you can use withTimingContext
 * to just enable query tracking without duplicate logging.
 */

import { NextRequest, NextResponse } from 'next/server';
import { AsyncLocalStorage } from 'async_hooks';
import { performanceLogger } from './PerformanceLogger';
import type { TimingContext, QueryTiming } from './types';

// AsyncLocalStorage for tracking nested query timings
export const timingContext = new AsyncLocalStorage<TimingContext>();

/**
 * Wrap an API route handler with full timing instrumentation
 * Use this for routes that don't already use withMetrics
 */
export function withTiming<T extends unknown[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = performance.now();
    const route = req.nextUrl.pathname;
    const method = req.method;

    const context: TimingContext = {
      startTime,
      route,
      method,
      queries: [],
    };

    try {
      // Run handler with timing context
      const response = await timingContext.run(context, () =>
        handler(req, ...args)
      );

      const duration = performance.now() - startTime;

      // Add timing headers
      response.headers.set('X-Response-Time', `${Math.round(duration)}ms`);
      response.headers.set('Server-Timing', `total;dur=${Math.round(duration)}`);

      // Log the request
      performanceLogger.logAPIRequest({
        route,
        method,
        duration: Math.round(duration),
        statusCode: response.status,
        queries: context.queries,
        timestamp: Date.now(),
      });

      return response;
    } catch (error) {
      const duration = performance.now() - startTime;

      performanceLogger.logAPIRequest({
        route,
        method,
        duration: Math.round(duration),
        statusCode: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
        queries: context.queries,
        timestamp: Date.now(),
      });

      throw error;
    }
  };
}

/**
 * Lightweight wrapper that only sets up the timing context for query tracking.
 * Use this for routes that already use withMetrics to avoid duplicate logging.
 * This enables timedQuery() calls to be tracked without additional overhead.
 */
export function withTimingContext<T extends unknown[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = performance.now();
    const route = req.nextUrl.pathname;
    const method = req.method;

    const context: TimingContext = {
      startTime,
      route,
      method,
      queries: [],
    };

    // Run handler with timing context (no logging, just context setup)
    return timingContext.run(context, () => handler(req, ...args));
  };
}

/**
 * Helper to wrap existing handlers (type-safe alternative)
 */
export function wrapAPIRoute<T extends unknown[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
): (req: NextRequest, ...args: T) => Promise<NextResponse> {
  return withTiming(handler);
}

/**
 * Add a query timing to the current request context
 * Call this from within timedQuery to track database operations
 */
export function addQueryTiming(timing: QueryTiming): void {
  const context = timingContext.getStore();
  if (context) {
    context.queries.push(timing);
  }
}

/**
 * Get the current timing context (if available)
 */
export function getCurrentTimingContext(): TimingContext | undefined {
  return timingContext.getStore();
}
