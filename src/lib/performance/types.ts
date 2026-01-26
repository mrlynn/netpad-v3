/**
 * Performance Instrumentation Types
 * Shared type definitions for the performance monitoring system
 */

// ============================================================================
// Client-Side Metric Types
// ============================================================================

export interface NavigationMetric {
  type: 'navigation';
  from: string;
  to: string;
  duration: number;
  timestamp: number;
  sessionId?: string;
  // Web Vitals
  ttfb?: number; // Time to First Byte
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  // Custom metrics
  hydrationTime?: number;
  dataFetchTime?: number;
}

export interface RenderMetric {
  type: 'render';
  component: string;
  duration: number;
  timestamp: number;
  sessionId?: string;
  renderCount?: number;
}

export interface NetworkMetric {
  type: 'network';
  url: string;
  method: string;
  duration: number;
  status: number;
  timestamp: number;
  sessionId?: string;
  size?: number;
}

export interface CustomMetric {
  type: 'custom';
  name: string;
  duration: number;
  timestamp: number;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export type PerformanceMetric =
  | NavigationMetric
  | RenderMetric
  | NetworkMetric
  | CustomMetric;

// ============================================================================
// Collector Configuration
// ============================================================================

export interface CollectorConfig {
  batchSize: number;
  flushInterval: number; // ms
  endpoint: string;
  enabled: boolean;
}

// ============================================================================
// Server-Side Log Types
// ============================================================================

export interface QueryTiming {
  operation: string;
  collection?: string;
  duration: number;
}

export interface APIRequestLog {
  route: string;
  method: string;
  duration: number;
  statusCode: number;
  queries: QueryTiming[];
  error?: string;
  timestamp: number;
  dbTime?: number;
  serverTime?: number;
  queryCount?: number;
}

export interface SlowQueryLog {
  operation: string;
  collection?: string;
  duration: number;
  filter?: object;
  timestamp: number;
}

export interface QueryErrorLog {
  operation: string;
  collection?: string;
  duration: number;
  error: string;
  timestamp: number;
}

export interface ClientMetricsBatch {
  metrics: PerformanceMetric[];
  timestamp: number;
}

// ============================================================================
// Timing Context (for AsyncLocalStorage)
// ============================================================================

export interface TimingContext {
  startTime: number;
  route: string;
  method: string;
  queries: QueryTiming[];
}

// ============================================================================
// Query Options
// ============================================================================

export interface QueryOptions {
  operation: string;
  collection?: string;
  filter?: object;
  // Set to true for queries that are expected to be slow
  allowSlow?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

export const SLOW_QUERY_THRESHOLD_MS = 100;
export const SLOW_API_THRESHOLD_MS = 1000;
export const SLOW_NAVIGATION_THRESHOLD_MS = 500;
