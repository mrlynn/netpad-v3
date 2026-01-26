/**
 * Performance Instrumentation - Public API
 *
 * This module provides tools for measuring and tracking performance
 * across the NetPad application.
 *
 * ## Client-Side Usage
 *
 * ```typescript
 * import { performanceCollector } from '@/lib/performance';
 *
 * // Record a custom metric
 * const stopTimer = performanceCollector.startTimer('my-operation');
 * // ... do work ...
 * stopTimer(); // Records the duration
 * ```
 *
 * ## Server-Side Usage
 *
 * ```typescript
 * import { withTiming, timedQuery } from '@/lib/performance';
 *
 * // Wrap an API route
 * export const GET = withTiming(async (req) => {
 *   const data = await timedQuery(
 *     { operation: 'find', collection: 'forms' },
 *     () => db.collection('forms').find({}).toArray()
 *   );
 *   return NextResponse.json(data);
 * });
 * ```
 */

// Client-side exports
export { performanceCollector } from './PerformanceCollector';
export { NavigationTimer } from './NavigationTimer';

// Server-side exports
export { performanceLogger } from './PerformanceLogger';
export {
  withTiming,
  withTimingContext,
  wrapAPIRoute,
  addQueryTiming,
  getCurrentTimingContext,
  timingContext,
} from './withTiming';
export { timedQuery, createTimedCollection } from './timedQuery';

// Type exports
export type {
  // Metric types
  PerformanceMetric,
  NavigationMetric,
  RenderMetric,
  NetworkMetric,
  CustomMetric,
  // Configuration
  CollectorConfig,
  // Server-side types
  QueryTiming,
  APIRequestLog,
  SlowQueryLog,
  QueryErrorLog,
  ClientMetricsBatch,
  TimingContext,
  QueryOptions,
} from './types';

// Constants
export {
  SLOW_QUERY_THRESHOLD_MS,
  SLOW_API_THRESHOLD_MS,
  SLOW_NAVIGATION_THRESHOLD_MS,
} from './types';
