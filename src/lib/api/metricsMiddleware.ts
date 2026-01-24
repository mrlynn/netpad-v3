/**
 * API Metrics Middleware
 *
 * Collects request metrics (count, latency, status codes) for API endpoints
 * Aggregates data hourly into the api_metrics collection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAPIMetricsCollection, getAPIMetricSamplesCollection } from '@/lib/platform/db';
import { APIMetricAggregation, APIMetricSample, EndpointMetrics } from '@/types/observability';

// ============================================
// Route Handler Wrapper
// ============================================

type RouteHandler = (
  request: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse> | NextResponse;

interface WithMetricsOptions {
  /** Override the endpoint name (defaults to request pathname) */
  endpoint?: string;
  /** Skip metrics recording for this route */
  skip?: boolean;
}

/**
 * Wrap an API route handler to automatically record metrics
 *
 * @example
 * ```ts
 * export const GET = withMetrics(async (request) => {
 *   // your handler logic
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withMetrics(
  handler: RouteHandler,
  options?: WithMetricsOptions
): RouteHandler {
  return async (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    const startTime = Date.now();
    let response: NextResponse;

    try {
      response = await handler(request, context);
    } catch (error) {
      // Re-throw the error but record the failure
      const latencyMs = Date.now() - startTime;
      const endpoint = options?.endpoint || normalizeEndpoint(request.nextUrl.pathname);

      if (!options?.skip) {
        // Fire and forget - don't block on metrics recording
        recordAPIMetric({
          endpoint,
          method: request.method,
          statusCode: 500,
          latencyMs,
        }).catch(() => {});
      }

      throw error;
    }

    // Record successful response
    const latencyMs = Date.now() - startTime;
    const endpoint = options?.endpoint || normalizeEndpoint(request.nextUrl.pathname);

    if (!options?.skip) {
      // Fire and forget - don't block on metrics recording
      recordAPIMetric({
        endpoint,
        method: request.method,
        statusCode: response.status,
        latencyMs,
      }).catch(() => {});
    }

    return response;
  };
}

/**
 * Normalize endpoint path by replacing dynamic segments with placeholders
 * e.g., /api/forms/abc123 -> /api/forms/[id]
 */
function normalizeEndpoint(pathname: string): string {
  // Common patterns to normalize
  const patterns = [
    // MongoDB ObjectIds (24 hex chars)
    { regex: /\/[a-f0-9]{24}(?=\/|$)/gi, replacement: '/[id]' },
    // UUIDs
    { regex: /\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?=\/|$)/gi, replacement: '/[id]' },
    // Generic alphanumeric IDs (8+ chars)
    { regex: /\/[a-z0-9_-]{8,}(?=\/|$)/gi, replacement: '/[id]' },
  ];

  let normalized = pathname;
  for (const { regex, replacement } of patterns) {
    normalized = normalized.replace(regex, replacement);
  }

  return normalized;
}

/**
 * Record a single API request metric
 */
export async function recordAPIMetric(params: {
  endpoint: string;
  method: string;
  statusCode: number;
  latencyMs: number;
  requestId?: string;
  userId?: string;
  organizationId?: string;
}): Promise<void> {
  try {
    const samplesCollection = await getAPIMetricSamplesCollection();
    const now = new Date();

    const sample: APIMetricSample = {
      endpoint: params.endpoint,
      method: params.method,
      statusCode: params.statusCode,
      latencyMs: params.latencyMs,
      requestId: params.requestId,
      userId: params.userId,
      organizationId: params.organizationId,
      timestamp: now,
    };

    await samplesCollection.insertOne(sample);
  } catch (error) {
    // Don't let metrics recording break the API
    console.error('[Metrics] Failed to record API metric:', error);
  }
}

/**
 * Aggregate metrics into hourly buckets
 * Should be called periodically (e.g., every 5-10 minutes)
 */
export async function aggregateHourlyMetrics(): Promise<{
  period: string;
  endpointsProcessed: number;
  samplesProcessed: number;
}> {
  const samplesCollection = await getAPIMetricSamplesCollection();
  const metricsCollection = await getAPIMetricsCollection();

  const now = new Date();
  const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  const lastHour = new Date(currentHour.getTime() - 60 * 60 * 1000);
  const period = `${lastHour.toISOString().split(':')[0]}:00`; // YYYY-MM-DDTHH:00

  // Get samples from the last hour
  const samples = await samplesCollection
    .find({
      timestamp: {
        $gte: lastHour,
        $lt: currentHour,
      },
    })
    .toArray();

  if (samples.length === 0) {
    return { period, endpointsProcessed: 0, samplesProcessed: 0 };
  }

  // Group by endpoint
  const endpointGroups = new Map<
    string,
    {
      totalRequests: number;
      successCount: number;
      errorCount: number;
      latencies: number[];
      statusCodes: Map<number, number>;
      methods: Map<string, number>;
    }
  >();

  for (const sample of samples) {
    const key = `${sample.method}:${sample.endpoint}`;
    let group = endpointGroups.get(key);

    if (!group) {
      group = {
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        latencies: [],
        statusCodes: new Map(),
        methods: new Map(),
      };
      endpointGroups.set(key, group);
    }

    group.totalRequests++;
    group.latencies.push(sample.latencyMs);
    group.methods.set(sample.method, (group.methods.get(sample.method) || 0) + 1);

    if (sample.statusCode >= 200 && sample.statusCode < 400) {
      group.successCount++;
    } else {
      group.errorCount++;
    }

    group.statusCodes.set(sample.statusCode, (group.statusCodes.get(sample.statusCode) || 0) + 1);
  }

  // Calculate percentiles
  function calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  // Build aggregation
  const endpoints: Record<string, EndpointMetrics> = {};

  let globalTotalRequests = 0;
  let globalTotalErrors = 0;
  let globalLatencySum = 0;
  let globalMaxP95 = 0;

  for (const [key, group] of endpointGroups) {
    const avgLatency =
      group.latencies.reduce((sum, l) => sum + l, 0) / group.latencies.length;
    const minLatency = Math.min(...group.latencies);
    const maxLatency = Math.max(...group.latencies);
    const p95 = calculatePercentile(group.latencies, 95);

    endpoints[key] = {
      totalRequests: group.totalRequests,
      successCount: group.successCount,
      errorCount: group.errorCount,
      avgLatencyMs: Math.round(avgLatency * 100) / 100,
      minLatencyMs: minLatency,
      maxLatencyMs: maxLatency,
      p50LatencyMs: calculatePercentile(group.latencies, 50),
      p95LatencyMs: p95,
      p99LatencyMs: calculatePercentile(group.latencies, 99),
      statusCodes: Object.fromEntries(group.statusCodes),
      methods: Object.fromEntries(group.methods),
    };

    globalTotalRequests += group.totalRequests;
    globalTotalErrors += group.errorCount;
    globalLatencySum += avgLatency * group.totalRequests;
    globalMaxP95 = Math.max(globalMaxP95, p95);
  }

  const aggregation: APIMetricAggregation = {
    period,
    periodType: 'hourly',
    totalRequests: globalTotalRequests,
    totalErrors: globalTotalErrors,
    avgLatencyMs: globalTotalRequests > 0 ? Math.round((globalLatencySum / globalTotalRequests) * 100) / 100 : 0,
    p95LatencyMs: globalMaxP95,
    endpoints,
    createdAt: now,
    updatedAt: now,
  };

  // Upsert the hourly aggregation
  await metricsCollection.updateOne(
    { period, periodType: 'hourly' },
    { $set: aggregation },
    { upsert: true }
  );

  // Clean up processed samples older than 2 hours (keep some buffer)
  const cleanupCutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  await samplesCollection.deleteMany({ timestamp: { $lt: cleanupCutoff } });

  return {
    period,
    endpointsProcessed: endpointGroups.size,
    samplesProcessed: samples.length,
  };
}

/**
 * Aggregate daily metrics from hourly data
 * Should be called once per day
 */
export async function aggregateDailyMetrics(date: Date = new Date()): Promise<{
  period: string;
  endpointsProcessed: number;
}> {
  const metricsCollection = await getAPIMetricsCollection();

  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const period = startOfDay.toISOString().split('T')[0]; // YYYY-MM-DD

  // Get all hourly aggregations for this day
  const hourlyMetrics = await metricsCollection
    .find({
      periodType: 'hourly',
      period: {
        $gte: startOfDay.toISOString().split(':')[0] + ':00',
        $lt: endOfDay.toISOString().split(':')[0] + ':00',
      },
    })
    .toArray();

  if (hourlyMetrics.length === 0) {
    return { period, endpointsProcessed: 0 };
  }

  // Merge hourly metrics
  const endpointGroups = new Map<
    string,
    {
      totalRequests: number;
      successCount: number;
      errorCount: number;
      avgLatencies: number[];
      minLatency: number;
      maxLatency: number;
      p95Latencies: number[];
      p99Latencies: number[];
      statusCodes: Map<number, number>;
      methods: Map<string, number>;
    }
  >();

  for (const hourly of hourlyMetrics) {
    for (const [key, ep] of Object.entries(hourly.endpoints)) {
      let group = endpointGroups.get(key);

      if (!group) {
        group = {
          totalRequests: 0,
          successCount: 0,
          errorCount: 0,
          avgLatencies: [],
          minLatency: Infinity,
          maxLatency: 0,
          p95Latencies: [],
          p99Latencies: [],
          statusCodes: new Map(),
          methods: new Map(),
        };
        endpointGroups.set(key, group);
      }

      group.totalRequests += ep.totalRequests;
      group.successCount += ep.successCount;
      group.errorCount += ep.errorCount;
      group.avgLatencies.push(ep.avgLatencyMs);
      group.minLatency = Math.min(group.minLatency, ep.minLatencyMs);
      group.maxLatency = Math.max(group.maxLatency, ep.maxLatencyMs);
      group.p95Latencies.push(ep.p95LatencyMs);
      group.p99Latencies.push(ep.p99LatencyMs || ep.p95LatencyMs);

      for (const [code, count] of Object.entries(ep.statusCodes)) {
        const statusCode = parseInt(code, 10);
        group.statusCodes.set(statusCode, (group.statusCodes.get(statusCode) || 0) + count);
      }

      for (const [method, count] of Object.entries(ep.methods)) {
        group.methods.set(method, (group.methods.get(method) || 0) + count);
      }
    }
  }

  // Build daily aggregation
  const endpoints: Record<string, EndpointMetrics> = {};

  let globalTotalRequests = 0;
  let globalTotalErrors = 0;
  let globalLatencySum = 0;
  let globalMaxP95 = 0;

  for (const [key, group] of endpointGroups) {
    const avgLatency =
      group.avgLatencies.reduce((sum, l) => sum + l, 0) / group.avgLatencies.length;
    const p95Latency = Math.max(...group.p95Latencies);
    const p99Latency = Math.max(...group.p99Latencies);

    endpoints[key] = {
      totalRequests: group.totalRequests,
      successCount: group.successCount,
      errorCount: group.errorCount,
      avgLatencyMs: Math.round(avgLatency * 100) / 100,
      minLatencyMs: group.minLatency === Infinity ? 0 : group.minLatency,
      maxLatencyMs: group.maxLatency,
      p50LatencyMs: 0, // Not tracked at daily level
      p95LatencyMs: p95Latency,
      p99LatencyMs: p99Latency,
      statusCodes: Object.fromEntries(group.statusCodes),
      methods: Object.fromEntries(group.methods),
    };

    globalTotalRequests += group.totalRequests;
    globalTotalErrors += group.errorCount;
    globalLatencySum += avgLatency * group.totalRequests;
    globalMaxP95 = Math.max(globalMaxP95, p95Latency);
  }

  const now = new Date();
  const aggregation: APIMetricAggregation = {
    period,
    periodType: 'daily',
    totalRequests: globalTotalRequests,
    totalErrors: globalTotalErrors,
    avgLatencyMs: globalTotalRequests > 0 ? Math.round((globalLatencySum / globalTotalRequests) * 100) / 100 : 0,
    p95LatencyMs: globalMaxP95,
    endpoints,
    createdAt: now,
    updatedAt: now,
  };

  // Upsert the daily aggregation
  await metricsCollection.updateOne(
    { period, periodType: 'daily' },
    { $set: aggregation },
    { upsert: true }
  );

  return {
    period,
    endpointsProcessed: endpointGroups.size,
  };
}

/**
 * Get API metrics for a time range
 */
export async function getAPIMetrics(params: {
  periodType?: 'hourly' | 'daily';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<APIMetricAggregation[]> {
  const metricsCollection = await getAPIMetricsCollection();
  const { periodType = 'hourly', limit = 24 } = params;

  const filter: Record<string, unknown> = { periodType };

  if (params.startDate || params.endDate) {
    filter.createdAt = {};
    if (params.startDate) (filter.createdAt as Record<string, Date>).$gte = params.startDate;
    if (params.endDate) (filter.createdAt as Record<string, Date>).$lte = params.endDate;
  }

  return metricsCollection
    .find(filter)
    .sort({ period: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Get metrics summary for dashboard
 */
export async function getMetricsSummary(hours: number = 24): Promise<{
  totalRequests: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorRate: number;
  topEndpoints: Array<{ endpoint: string; requests: number; avgLatency: number }>;
  slowestEndpoints: Array<{ endpoint: string; p95Latency: number; requests: number }>;
  statusCodeDistribution: Record<string, number>;
  requestsByHour: Array<{ hour: string; requests: number; errors: number }>;
}> {
  const metricsCollection = await getAPIMetricsCollection();
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  const hourlyMetrics = await metricsCollection
    .find({
      periodType: 'hourly',
      createdAt: { $gte: cutoff },
    })
    .sort({ period: -1 })
    .toArray();

  if (hourlyMetrics.length === 0) {
    return {
      totalRequests: 0,
      avgLatencyMs: 0,
      p95LatencyMs: 0,
      errorRate: 0,
      topEndpoints: [],
      slowestEndpoints: [],
      statusCodeDistribution: {},
      requestsByHour: [],
    };
  }

  // Aggregate totals
  let totalRequests = 0;
  let totalErrors = 0;
  let totalLatencySum = 0;
  let maxP95 = 0;
  const statusCodes: Record<string, number> = {};
  const endpointStats = new Map<
    string,
    { requests: number; latencySum: number; p95Max: number }
  >();

  const requestsByHour: Array<{ hour: string; requests: number; errors: number }> = [];

  for (const metric of hourlyMetrics) {
    let hourRequests = 0;
    let hourErrors = 0;

    for (const [endpoint, stats] of Object.entries(metric.endpoints)) {
      totalRequests += stats.totalRequests;
      totalErrors += stats.errorCount;
      totalLatencySum += stats.avgLatencyMs * stats.totalRequests;
      maxP95 = Math.max(maxP95, stats.p95LatencyMs);

      hourRequests += stats.totalRequests;
      hourErrors += stats.errorCount;

      // Track per-endpoint stats
      const existing = endpointStats.get(endpoint) || { requests: 0, latencySum: 0, p95Max: 0 };
      existing.requests += stats.totalRequests;
      existing.latencySum += stats.avgLatencyMs * stats.totalRequests;
      existing.p95Max = Math.max(existing.p95Max, stats.p95LatencyMs);
      endpointStats.set(endpoint, existing);

      // Status codes
      for (const [code, count] of Object.entries(stats.statusCodes)) {
        const category = `${code[0]}xx`;
        statusCodes[category] = (statusCodes[category] || 0) + count;
      }
    }

    requestsByHour.push({
      hour: metric.period,
      requests: hourRequests,
      errors: hourErrors,
    });
  }

  // Calculate top endpoints
  const topEndpoints = Array.from(endpointStats.entries())
    .map(([endpoint, stats]) => ({
      endpoint,
      requests: stats.requests,
      avgLatency: Math.round((stats.latencySum / stats.requests) * 100) / 100,
    }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 10);

  // Calculate slowest endpoints
  const slowestEndpoints = Array.from(endpointStats.entries())
    .filter(([, stats]) => stats.requests >= 10) // At least 10 requests
    .map(([endpoint, stats]) => ({
      endpoint,
      p95Latency: stats.p95Max,
      requests: stats.requests,
    }))
    .sort((a, b) => b.p95Latency - a.p95Latency)
    .slice(0, 10);

  return {
    totalRequests,
    avgLatencyMs: totalRequests > 0 ? Math.round((totalLatencySum / totalRequests) * 100) / 100 : 0,
    p95LatencyMs: maxP95,
    errorRate: totalRequests > 0 ? Math.round((totalErrors / totalRequests) * 10000) / 100 : 0,
    topEndpoints,
    slowestEndpoints,
    statusCodeDistribution: statusCodes,
    requestsByHour: requestsByHour.reverse(), // Chronological order
  };
}
