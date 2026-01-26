/**
 * Performance Metrics Store
 * In-memory storage for performance metrics with rolling window.
 * Used by both the performance logger and admin API.
 */

const MAX_ENTRIES = 1000;

export interface APIMetric {
  route: string;
  method: string;
  duration: number;
  statusCode: number;
  dbTime: number;
  queryCount: number;
  timestamp: number;
}

export interface NavigationMetric {
  from: string;
  to: string;
  duration: number;
  timestamp: number;
}

export interface SlowQuery {
  operation: string;
  collection: string;
  duration: number;
  route?: string;
  timestamp: number;
}

interface MetricsStorage {
  apiRequests: APIMetric[];
  navigations: NavigationMetric[];
  slowQueries: SlowQuery[];
  lastReset: number;
}

// Global storage (persists across requests in the same process)
declare global {
  // eslint-disable-next-line no-var
  var __performanceMetrics: MetricsStorage | undefined;
}

if (!global.__performanceMetrics) {
  global.__performanceMetrics = {
    apiRequests: [],
    navigations: [],
    slowQueries: [],
    lastReset: Date.now(),
  };
}

export const metricsStore = global.__performanceMetrics;

// Helper to add metric with rolling window
function addMetric<T>(array: T[], metric: T): void {
  array.push(metric);
  if (array.length > MAX_ENTRIES) {
    array.shift();
  }
}

/**
 * Record an API request metric
 */
export function recordAPIMetric(metric: Omit<APIMetric, 'timestamp'>): void {
  addMetric(metricsStore.apiRequests, { ...metric, timestamp: Date.now() });
}

/**
 * Record a navigation metric
 */
export function recordNavigationMetric(
  metric: Omit<NavigationMetric, 'timestamp'>
): void {
  addMetric(metricsStore.navigations, { ...metric, timestamp: Date.now() });
}

/**
 * Record a slow query
 */
export function recordSlowQuery(metric: Omit<SlowQuery, 'timestamp'>): void {
  addMetric(metricsStore.slowQueries, { ...metric, timestamp: Date.now() });
}

/**
 * Reset all metrics
 */
export function resetMetrics(): void {
  metricsStore.apiRequests = [];
  metricsStore.navigations = [];
  metricsStore.slowQueries = [];
  metricsStore.lastReset = Date.now();
}

/**
 * Get metrics filtered by time range
 */
export function getMetricsInTimeRange(minutes: number = 60) {
  const cutoff = Date.now() - minutes * 60 * 1000;

  return {
    apiRequests: metricsStore.apiRequests.filter((m) => m.timestamp > cutoff),
    navigations: metricsStore.navigations.filter((m) => m.timestamp > cutoff),
    slowQueries: metricsStore.slowQueries.filter((m) => m.timestamp > cutoff),
  };
}
