/**
 * Performance Logger (Server-Side)
 * Centralized structured logging for all performance metrics
 * Also records metrics to the admin performance dashboard
 */

import type {
  APIRequestLog,
  SlowQueryLog,
  QueryErrorLog,
  ClientMetricsBatch,
  SLOW_API_THRESHOLD_MS,
  SLOW_NAVIGATION_THRESHOLD_MS,
} from './types';
import {
  recordAPIMetric,
  recordSlowQuery,
  recordNavigationMetric,
} from './metricsStore';

// Threshold for slow queries (ms)
const SLOW_QUERY_THRESHOLD = 100;

class PerformanceLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Log an API request with timing breakdown
   */
  logAPIRequest(log: APIRequestLog): void {
    const { route, method, duration, statusCode, queries } = log;

    // Calculate total DB time
    const dbTime = queries.reduce((sum, q) => sum + q.duration, 0);
    const serverTime = duration - dbTime;

    const logEntry = {
      level: duration > 1000 ? 'warn' : 'info',
      type: 'api_request',
      ...log,
      dbTime,
      serverTime,
      queryCount: queries.length,
    };

    // Record to admin performance dashboard
    try {
      recordAPIMetric({
        route,
        method,
        duration,
        statusCode,
        dbTime,
        queryCount: queries.length,
      });

      // Record slow queries separately
      queries
        .filter((q) => q.duration >= SLOW_QUERY_THRESHOLD)
        .forEach((q) => {
          recordSlowQuery({
            operation: q.operation,
            collection: q.collection || 'unknown',
            duration: q.duration,
            route,
          });
        });
    } catch {
      // Silently fail - don't let metrics recording break the app
    }

    // Structured JSON logging for production
    if (!this.isDevelopment) {
      console.log(JSON.stringify(logEntry));
    } else {
      // Pretty logging for development
      const status = duration > 1000 ? '🔴' : duration > 500 ? '🟡' : '🟢';
      console.log(
        `${status} [API] ${method} ${route}: ${duration}ms ` +
          `(server: ${serverTime}ms, db: ${dbTime}ms, queries: ${queries.length})`
      );

      if (queries.length > 0 && duration > 500) {
        console.log(
          '  Queries:',
          queries
            .map(
              (q) =>
                `${q.operation}${q.collection ? `(${q.collection})` : ''}: ${q.duration}ms`
            )
            .join(', ')
        );
      }
    }
  }

  /**
   * Log a slow database query
   */
  logSlowQuery(log: SlowQueryLog): void {
    const logEntry = {
      level: 'warn',
      type: 'slow_query',
      ...log,
    };

    // Record to admin performance dashboard
    try {
      recordSlowQuery({
        operation: log.operation,
        collection: log.collection || 'unknown',
        duration: log.duration,
      });
    } catch {
      // Silently fail
    }

    if (!this.isDevelopment) {
      console.log(JSON.stringify(logEntry));
    } else {
      console.warn(
        `🐢 [SLOW QUERY] ${log.operation}` +
          `${log.collection ? ` (${log.collection})` : ''}: ${log.duration}ms`
      );
    }
  }

  /**
   * Log a database query error
   */
  logQueryError(log: QueryErrorLog): void {
    const logEntry = {
      level: 'error',
      type: 'query_error',
      ...log,
    };

    if (!this.isDevelopment) {
      console.log(JSON.stringify(logEntry));
    } else {
      console.error(
        `❌ [DB ERROR] ${log.operation}` +
          `${log.collection ? ` (${log.collection})` : ''}: ${log.error}`
      );
    }
  }

  /**
   * Log a batch of client-side metrics
   */
  logClientMetrics(batch: ClientMetricsBatch): void {
    const logEntry = {
      level: 'info',
      type: 'client_metrics',
      count: batch.metrics.length,
      metrics: batch.metrics,
      timestamp: batch.timestamp,
    };

    // Record navigation metrics to admin performance dashboard
    try {
      batch.metrics.forEach((metric) => {
        if (metric.type === 'navigation') {
          const navMetric = metric as { duration: number; from: string; to: string };
          recordNavigationMetric({
            from: navMetric.from,
            to: navMetric.to,
            duration: navMetric.duration,
          });
        }
      });
    } catch {
      // Silently fail
    }

    if (!this.isDevelopment) {
      console.log(JSON.stringify(logEntry));
    } else {
      batch.metrics.forEach((metric) => {
        if (metric.type === 'navigation') {
          const navMetric = metric as { duration: number; from: string; to: string };
          const status =
            navMetric.duration > 1000
              ? '🔴'
              : navMetric.duration > 500
                ? '🟡'
                : '🟢';
          console.log(
            `${status} [CLIENT NAV] ${navMetric.from} → ${navMetric.to}: ${navMetric.duration}ms`
          );
        } else if (metric.type === 'custom') {
          const customMetric = metric as { name: string; duration: number };
          console.log(
            `📊 [CLIENT] ${customMetric.name}: ${customMetric.duration}ms`
          );
        }
      });
    }
  }

  /**
   * Log a generic performance event
   */
  log(
    level: 'info' | 'warn' | 'error',
    type: string,
    data: Record<string, unknown>
  ): void {
    const logEntry = {
      level,
      type,
      timestamp: Date.now(),
      ...data,
    };

    if (!this.isDevelopment) {
      console.log(JSON.stringify(logEntry));
    } else {
      const prefix =
        level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
      console.log(`${prefix} [${type.toUpperCase()}]`, data);
    }
  }
}

// Singleton export
export const performanceLogger = new PerformanceLogger();
