/**
 * AI Analytics Module
 *
 * Functions for logging AI requests and querying usage analytics.
 * Supports per-request logging and daily aggregates.
 */

import {
  AIRequestLog,
  AIUsageAggregate,
  AIUsageSummary,
  TopAIUser,
  AIUsageDataPoint,
  AIAnalyticsQueryOptions,
  AIProvider,
  TokenUsage,
  EfficiencyMetrics,
  HourlyUsage,
  ModelPerformance,
  CostProjection,
  FeatureAdoption,
  QuotaMetrics,
  UserJourney,
  CostAnomaly,
  QualityMetrics,
  ComparativeMetrics,
} from '@/types/ai-analytics';
import { AIFeature } from '@/types/platform';
import {
  getAIRequestLogsCollection,
  getAIUsageAggregatesCollection,
  getUsersCollection,
  getOrganizationsCollection,
  getUsageCollection,
} from '@/lib/platform/db';
import { calculateCost } from './pricing';
import { SUBSCRIPTION_TIERS } from '@/types/platform';

/**
 * Generate a secure random ID with prefix
 */
function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}${randomPart}`;
}

/**
 * Get the current date as YYYY-MM-DD string
 */
function getCurrentDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get the current month as YYYY-MM string
 */
function getCurrentMonthString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Parameters for logging an AI request
 */
export interface LogAIRequestParams {
  organizationId: string;
  userId: string;
  isGuest: boolean;
  feature: AIFeature;
  endpoint: string;
  model: string;
  provider: AIProvider;
  tokens: TokenUsage;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Log an AI request to the database
 *
 * Creates a detailed log entry and updates daily aggregates asynchronously.
 */
export async function logAIRequest(params: LogAIRequestParams): Promise<string> {
  const requestId = generateId('aireq');
  const now = new Date();
  const estimatedCostUsd = calculateCost(
    params.model,
    params.tokens.prompt,
    params.tokens.completion
  );

  const log: AIRequestLog = {
    requestId,
    organizationId: params.organizationId,
    userId: params.userId,
    isGuest: params.isGuest,
    feature: params.feature,
    endpoint: params.endpoint,
    model: params.model,
    provider: params.provider,
    tokens: {
      prompt: params.tokens.prompt,
      completion: params.tokens.completion,
      total: params.tokens.total,
    },
    estimatedCostUsd,
    latencyMs: params.latencyMs,
    success: params.success,
    errorCode: params.errorCode,
    errorMessage: params.errorMessage,
    requestedAt: new Date(now.getTime() - params.latencyMs),
    completedAt: now,
    createdAt: now,
  };

  try {
    const collection = await getAIRequestLogsCollection();
    await collection.insertOne(log);

    // Update daily aggregate asynchronously (non-blocking)
    updateDailyAggregate(params.organizationId, now, log).catch((err) =>
      console.error('[AI Analytics] Failed to update daily aggregate:', err)
    );

    return requestId;
  } catch (error) {
    console.error('[AI Analytics] Failed to log AI request:', error);
    throw error;
  }
}

/**
 * Update daily aggregate statistics
 *
 * Uses MongoDB $inc for atomic updates to prevent race conditions.
 */
async function updateDailyAggregate(
  orgId: string,
  date: Date,
  log: AIRequestLog
): Promise<void> {
  const collection = await getAIUsageAggregatesCollection();
  const period = date.toISOString().split('T')[0]; // "2025-01-17"

  // Sanitize keys for MongoDB (replace dots with underscores)
  const featureKey = log.feature.replace(/\./g, '_');
  const modelKey = log.model.replace(/\./g, '_');
  const providerKey = log.provider.replace(/\./g, '_');

  await collection.updateOne(
    { organizationId: orgId, period, periodType: 'daily' },
    {
      $inc: {
        totalRequests: 1,
        totalTokens: log.tokens.total,
        promptTokens: log.tokens.prompt,
        completionTokens: log.tokens.completion,
        totalCostUsd: log.estimatedCostUsd,
        successCount: log.success ? 1 : 0,
        errorCount: log.success ? 0 : 1,
        [`byFeature.${featureKey}.requests`]: 1,
        [`byFeature.${featureKey}.tokens`]: log.tokens.total,
        [`byFeature.${featureKey}.costUsd`]: log.estimatedCostUsd,
        [`byModel.${modelKey}.requests`]: 1,
        [`byModel.${modelKey}.tokens`]: log.tokens.total,
        [`byModel.${modelKey}.costUsd`]: log.estimatedCostUsd,
        [`byProvider.${providerKey}.requests`]: 1,
        [`byProvider.${providerKey}.tokens`]: log.tokens.total,
        [`byProvider.${providerKey}.costUsd`]: log.estimatedCostUsd,
      },
      $set: { updatedAt: new Date() },
      $setOnInsert: {
        organizationId: orgId,
        period,
        periodType: 'daily' as const,
        createdAt: new Date(),
        avgLatencyMs: 0,
      },
    },
    { upsert: true }
  );

  // Update average latency separately (requires different logic)
  // This is a simplified approach; for precise avg, use aggregation
  await collection.updateOne(
    { organizationId: orgId, period, periodType: 'daily' },
    [
      {
        $set: {
          avgLatencyMs: {
            $divide: [
              {
                $add: [
                  { $multiply: ['$avgLatencyMs', { $subtract: ['$totalRequests', 1] }] },
                  log.latencyMs,
                ],
              },
              '$totalRequests',
            ],
          },
        },
      },
    ]
  );
}

/**
 * Get AI usage summary statistics
 *
 * Returns high-level metrics for the admin dashboard.
 */
export async function getAIUsageSummary(
  days: number = 30,
  orgId?: string
): Promise<AIUsageSummary> {
  const collection = await getAIRequestLogsCollection();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const match: Record<string, unknown> = {
    requestedAt: { $gte: startDate },
  };
  if (orgId) {
    match.organizationId = orgId;
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        totalTokens: { $sum: '$tokens.total' },
        promptTokens: { $sum: '$tokens.prompt' },
        completionTokens: { $sum: '$tokens.completion' },
        totalCostUsd: { $sum: '$estimatedCostUsd' },
        avgLatencyMs: { $avg: '$latencyMs' },
        successCount: { $sum: { $cond: ['$success', 1, 0] } },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueOrgs: { $addToSet: '$organizationId' },
      },
    },
  ];

  const results = await collection.aggregate(pipeline).toArray();

  if (results.length === 0) {
    return {
      totalRequests: 0,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalCostUsd: 0,
      avgLatencyMs: 0,
      uniqueUsers: 0,
      uniqueOrgs: 0,
      successRate: 0,
    };
  }

  const result = results[0];
  const successRate =
    result.totalRequests > 0
      ? (result.successCount / result.totalRequests) * 100
      : 0;

  return {
    totalRequests: result.totalRequests,
    totalTokens: result.totalTokens,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    totalCostUsd: Math.round(result.totalCostUsd * 100) / 100,
    avgLatencyMs: Math.round(result.avgLatencyMs || 0),
    uniqueUsers: result.uniqueUsers?.length || 0,
    uniqueOrgs: result.uniqueOrgs?.length || 0,
    successRate: Math.round(successRate * 10) / 10,
  };
}

/**
 * Get AI usage data grouped by day
 *
 * Returns time series data for charts.
 */
export async function getAIUsageByDay(
  days: number = 30,
  orgId?: string
): Promise<AIUsageDataPoint[]> {
  const collection = await getAIRequestLogsCollection();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const match: Record<string, unknown> = {
    requestedAt: { $gte: startDate },
  };
  if (orgId) {
    match.organizationId = orgId;
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$requestedAt' } },
        requests: { $sum: 1 },
        tokens: { $sum: '$tokens.total' },
        promptTokens: { $sum: '$tokens.prompt' },
        completionTokens: { $sum: '$tokens.completion' },
        costUsd: { $sum: '$estimatedCostUsd' },
        avgLatencyMs: { $avg: '$latencyMs' },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const results = await collection.aggregate(pipeline).toArray();

  return results.map((r) => ({
    date: r._id,
    requests: r.requests,
    tokens: r.tokens,
    promptTokens: r.promptTokens,
    completionTokens: r.completionTokens,
    costUsd: Math.round(r.costUsd * 10000) / 10000,
    avgLatencyMs: Math.round(r.avgLatencyMs || 0),
  }));
}

/**
 * Get AI usage grouped by feature
 */
export async function getAIUsageByFeature(
  days: number = 30,
  orgId?: string
): Promise<Array<{ feature: string; requests: number; tokens: number; costUsd: number }>> {
  const collection = await getAIRequestLogsCollection();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const match: Record<string, unknown> = {
    requestedAt: { $gte: startDate },
  };
  if (orgId) {
    match.organizationId = orgId;
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: '$feature',
        requests: { $sum: 1 },
        tokens: { $sum: '$tokens.total' },
        costUsd: { $sum: '$estimatedCostUsd' },
      },
    },
    { $sort: { tokens: -1 } },
  ];

  const results = await collection.aggregate(pipeline).toArray();

  return results.map((r) => ({
    feature: r._id,
    requests: r.requests,
    tokens: r.tokens,
    costUsd: Math.round(r.costUsd * 10000) / 10000,
  }));
}

/**
 * Get AI usage grouped by model
 */
export async function getAIUsageByModel(
  days: number = 30,
  orgId?: string
): Promise<Array<{ model: string; requests: number; tokens: number; costUsd: number }>> {
  const collection = await getAIRequestLogsCollection();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const match: Record<string, unknown> = {
    requestedAt: { $gte: startDate },
  };
  if (orgId) {
    match.organizationId = orgId;
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: '$model',
        requests: { $sum: 1 },
        tokens: { $sum: '$tokens.total' },
        costUsd: { $sum: '$estimatedCostUsd' },
      },
    },
    { $sort: { tokens: -1 } },
  ];

  const results = await collection.aggregate(pipeline).toArray();

  return results.map((r) => ({
    model: r._id,
    requests: r.requests,
    tokens: r.tokens,
    costUsd: Math.round(r.costUsd * 10000) / 10000,
  }));
}

/**
 * Get top users by AI usage
 */
export async function getTopUsersByUsage(
  days: number = 30,
  limit: number = 10
): Promise<TopAIUser[]> {
  const logsCollection = await getAIRequestLogsCollection();
  const usersCollection = await getUsersCollection();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const pipeline = [
    {
      $match: {
        requestedAt: { $gte: startDate },
        isGuest: false,
      },
    },
    {
      $group: {
        _id: '$userId',
        requests: { $sum: 1 },
        tokens: { $sum: '$tokens.total' },
        costUsd: { $sum: '$estimatedCostUsd' },
        avgLatencyMs: { $avg: '$latencyMs' },
      },
    },
    { $sort: { tokens: -1 } },
    { $limit: limit },
  ];

  const results = await logsCollection.aggregate(pipeline).toArray();

  // Fetch user details
  const userIds = results.map((r) => r._id);
  const users = await usersCollection
    .find({ userId: { $in: userIds } })
    .project({ userId: 1, email: 1, name: 1 })
    .toArray();

  const userMap = new Map(users.map((u) => [u.userId, u]));

  return results.map((r) => {
    const user = userMap.get(r._id);
    return {
      userId: r._id,
      email: user?.email,
      name: user?.name,
      requests: r.requests,
      tokens: r.tokens,
      costUsd: Math.round(r.costUsd * 10000) / 10000,
      avgLatencyMs: Math.round(r.avgLatencyMs || 0),
    };
  });
}

/**
 * Get top organizations by AI usage
 */
export async function getTopOrgsByUsage(
  days: number = 30,
  limit: number = 10
): Promise<
  Array<{
    organizationId: string;
    requests: number;
    tokens: number;
    costUsd: number;
  }>
> {
  const collection = await getAIRequestLogsCollection();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const pipeline = [
    { $match: { requestedAt: { $gte: startDate } } },
    {
      $group: {
        _id: '$organizationId',
        requests: { $sum: 1 },
        tokens: { $sum: '$tokens.total' },
        costUsd: { $sum: '$estimatedCostUsd' },
      },
    },
    { $sort: { tokens: -1 } },
    { $limit: limit },
  ];

  const results = await collection.aggregate(pipeline).toArray();

  return results.map((r) => ({
    organizationId: r._id,
    requests: r.requests,
    tokens: r.tokens,
    costUsd: Math.round(r.costUsd * 10000) / 10000,
  }));
}

/**
 * Get recent AI request logs
 *
 * For debugging and detailed analysis.
 */
export async function getRecentAIRequests(
  options: AIAnalyticsQueryOptions & { limit?: number; offset?: number }
): Promise<{ logs: AIRequestLog[]; total: number }> {
  const collection = await getAIRequestLogsCollection();

  const match: Record<string, unknown> = {};

  if (options.startDate || options.endDate) {
    match.requestedAt = {};
    if (options.startDate) {
      (match.requestedAt as Record<string, Date>).$gte = options.startDate;
    }
    if (options.endDate) {
      (match.requestedAt as Record<string, Date>).$lte = options.endDate;
    }
  }

  if (options.orgId) match.organizationId = options.orgId;
  if (options.userId) match.userId = options.userId;
  if (options.feature) match.feature = options.feature;
  if (options.model) match.model = options.model;
  if (options.provider) match.provider = options.provider;

  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const [logs, total] = await Promise.all([
    collection
      .find(match)
      .sort({ requestedAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    collection.countDocuments(match),
  ]);

  return { logs, total };
}

/**
 * Get error rate statistics
 */
export async function getErrorStats(
  days: number = 30,
  orgId?: string
): Promise<{
  totalErrors: number;
  errorRate: number;
  byErrorCode: Array<{ code: string; count: number }>;
}> {
  const collection = await getAIRequestLogsCollection();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const match: Record<string, unknown> = {
    requestedAt: { $gte: startDate },
  };
  if (orgId) {
    match.organizationId = orgId;
  }

  const [totalResult, errorResult, byCodeResult] = await Promise.all([
    collection.countDocuments(match),
    collection.countDocuments({ ...match, success: false }),
    collection
      .aggregate([
        { $match: { ...match, success: false } },
        {
          $group: {
            _id: '$errorCode',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray(),
  ]);

  const errorRate = totalResult > 0 ? (errorResult / totalResult) * 100 : 0;

  return {
    totalErrors: errorResult,
    errorRate: Math.round(errorRate * 10) / 10,
    byErrorCode: byCodeResult.map((r) => ({
      code: r._id || 'unknown',
      count: r.count,
    })),
  };
}

/**
 * Get efficiency metrics
 *
 * Returns average tokens and cost per request, plus token efficiency ratio.
 */
export async function getEfficiencyMetrics(
  days: number = 30,
  orgId?: string
): Promise<EfficiencyMetrics> {
  const collection = await getAIRequestLogsCollection();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const match: Record<string, unknown> = {
    requestedAt: { $gte: startDate },
  };
  if (orgId) {
    match.organizationId = orgId;
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        totalTokens: { $sum: '$tokens.total' },
        totalPromptTokens: { $sum: '$tokens.prompt' },
        totalCompletionTokens: { $sum: '$tokens.completion' },
        totalCostUsd: { $sum: '$estimatedCostUsd' },
      },
    },
  ];

  const results = await collection.aggregate(pipeline).toArray();

  if (results.length === 0 || results[0].totalRequests === 0) {
    return {
      avgTokensPerRequest: 0,
      avgCostPerRequest: 0,
      avgPromptTokensPerRequest: 0,
      avgCompletionTokensPerRequest: 0,
      tokenEfficiency: 0,
    };
  }

  const result = results[0];
  const totalRequests = result.totalRequests;
  const avgTokensPerRequest = result.totalTokens / totalRequests;
  const avgCostPerRequest = result.totalCostUsd / totalRequests;
  const avgPromptTokensPerRequest = result.totalPromptTokens / totalRequests;
  const avgCompletionTokensPerRequest = result.totalCompletionTokens / totalRequests;

  // Token efficiency: completion / prompt ratio (higher = more efficient)
  // A ratio > 1 means we're generating more than we're sending (good for creative tasks)
  // A ratio < 1 means we're sending more than generating (good for analysis tasks)
  const tokenEfficiency =
    result.totalPromptTokens > 0
      ? result.totalCompletionTokens / result.totalPromptTokens
      : 0;

  return {
    avgTokensPerRequest: Math.round(avgTokensPerRequest * 10) / 10,
    avgCostPerRequest: Math.round(avgCostPerRequest * 1000000) / 1000000,
    avgPromptTokensPerRequest: Math.round(avgPromptTokensPerRequest * 10) / 10,
    avgCompletionTokensPerRequest: Math.round(avgCompletionTokensPerRequest * 10) / 10,
    tokenEfficiency: Math.round(tokenEfficiency * 100) / 100,
  };
}

/**
 * Get hourly usage breakdown
 *
 * Returns usage statistics grouped by hour of day (0-23).
 */
export async function getHourlyUsage(
  days: number = 30,
  orgId?: string
): Promise<HourlyUsage[]> {
  const collection = await getAIRequestLogsCollection();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const match: Record<string, unknown> = {
    requestedAt: { $gte: startDate },
  };
  if (orgId) {
    match.organizationId = orgId;
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: { $hour: '$requestedAt' },
        requests: { $sum: 1 },
        tokens: { $sum: '$tokens.total' },
        costUsd: { $sum: '$estimatedCostUsd' },
        avgLatencyMs: { $avg: '$latencyMs' },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const results = await collection.aggregate(pipeline).toArray();

  // Ensure all hours 0-23 are represented (fill missing hours with zeros)
  const hourlyMap = new Map<number, HourlyUsage>();
  for (let hour = 0; hour < 24; hour++) {
    hourlyMap.set(hour, {
      hour,
      requests: 0,
      tokens: 0,
      costUsd: 0,
      avgLatencyMs: 0,
    });
  }

  results.forEach((r) => {
    hourlyMap.set(r._id, {
      hour: r._id,
      requests: r.requests,
      tokens: r.tokens,
      costUsd: Math.round(r.costUsd * 10000) / 10000,
      avgLatencyMs: Math.round(r.avgLatencyMs || 0),
    });
  });

  return Array.from(hourlyMap.values());
}

/**
 * Get model performance comparison with latency percentiles
 *
 * Returns performance metrics for each model including p50, p95, p99 latencies.
 */
export async function getModelPerformance(
  days: number = 30,
  orgId?: string
): Promise<ModelPerformance[]> {
  const collection = await getAIRequestLogsCollection();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const match: Record<string, unknown> = {
    requestedAt: { $gte: startDate },
  };
  if (orgId) {
    match.organizationId = orgId;
  }

  // First, get summary stats per model
  const summaryPipeline = [
    { $match: match },
    {
      $group: {
        _id: '$model',
        requests: { $sum: 1 },
        totalTokens: { $sum: '$tokens.total' },
        totalCostUsd: { $sum: '$estimatedCostUsd' },
        avgLatencyMs: { $avg: '$latencyMs' },
        successCount: { $sum: { $cond: ['$success', 1, 0] } },
        errorCount: { $sum: { $cond: ['$success', 0, 1] } },
      },
    },
  ];

  const summaries = await collection.aggregate(summaryPipeline).toArray();

  // For each model, calculate percentiles
  const performancePromises = summaries.map(async (summary) => {
    const model = summary._id;
    const modelMatch = { ...match, model };

    // Get all latencies for this model to calculate percentiles
    const latencies = await collection
      .find(modelMatch, { projection: { latencyMs: 1 } })
      .sort({ latencyMs: 1 })
      .toArray();

    const latencyValues = latencies.map((l) => l.latencyMs).filter((l) => l > 0);

    // Calculate percentiles
    const calculatePercentile = (values: number[], percentile: number): number => {
      if (values.length === 0) return 0;
      const index = Math.ceil((percentile / 100) * values.length) - 1;
      return values[Math.max(0, Math.min(index, values.length - 1))];
    };

    const p50 = calculatePercentile(latencyValues, 50);
    const p95 = calculatePercentile(latencyValues, 95);
    const p99 = calculatePercentile(latencyValues, 99);

    const totalRequests = summary.requests;
    const successRate = totalRequests > 0 ? (summary.successCount / totalRequests) * 100 : 0;
    const errorRate = totalRequests > 0 ? (summary.errorCount / totalRequests) * 100 : 0;

    return {
      model,
      requests: totalRequests,
      totalTokens: summary.totalTokens,
      totalCostUsd: Math.round(summary.totalCostUsd * 10000) / 10000,
      avgLatencyMs: Math.round(summary.avgLatencyMs || 0),
      successRate: Math.round(successRate * 10) / 10,
      errorRate: Math.round(errorRate * 10) / 10,
      avgCostPerRequest:
        totalRequests > 0
          ? Math.round((summary.totalCostUsd / totalRequests) * 1000000) / 1000000
          : 0,
      avgTokensPerRequest:
        totalRequests > 0
          ? Math.round((summary.totalTokens / totalRequests) * 10) / 10
          : 0,
      p50Latency: Math.round(p50),
      p95Latency: Math.round(p95),
      p99Latency: Math.round(p99),
    };
  });

  const performance = await Promise.all(performancePromises);

  // Sort by total tokens (most used first)
  return performance.sort((a, b) => b.totalTokens - a.totalTokens);
}

/**
 * Get cost projections based on historical trends
 *
 * Analyzes daily cost trends and projects future costs.
 */
export async function getCostProjection(
  days: number = 30,
  orgId?: string
): Promise<CostProjection> {
  const collection = await getAIRequestLogsCollection();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const match: Record<string, unknown> = {
    requestedAt: { $gte: startDate },
  };
  if (orgId) {
    match.organizationId = orgId;
  }

  // Get daily cost breakdown
  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$requestedAt' } },
        costUsd: { $sum: '$estimatedCostUsd' },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const dailyCosts = await collection.aggregate(pipeline).toArray();

  if (dailyCosts.length === 0) {
    return {
      currentPeriodCost: 0,
      projectedMonthlyCost: 0,
      projectedYearlyCost: 0,
      trend: 'stable',
      growthRate: 0,
      daysAnalyzed: 0,
      avgDailyCost: 0,
    };
  }

  // Calculate current period cost
  const currentPeriodCost = dailyCosts.reduce((sum, day) => sum + day.costUsd, 0);
  const avgDailyCost = currentPeriodCost / dailyCosts.length;

  // Calculate trend (simple linear regression on last 7 days if available)
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  let growthRate = 0;

  if (dailyCosts.length >= 7) {
    const recentDays = dailyCosts.slice(-7);
    const costs = recentDays.map((d) => d.costUsd);
    const n = costs.length;

    // Simple linear regression
    const sumX = (n * (n - 1)) / 2; // 0 + 1 + 2 + ... + (n-1)
    const sumY = costs.reduce((a, b) => a + b, 0);
    const sumXY = costs.reduce((sum, cost, i) => sum + cost * i, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6; // 0² + 1² + 2² + ... + (n-1)²

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgCost = sumY / n;

    // Growth rate as percentage of average
    growthRate = avgCost > 0 ? (slope / avgCost) * 100 : 0;

    if (Math.abs(growthRate) < 5) {
      trend = 'stable';
    } else if (growthRate > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }
  }

  // Projections
  const projectedMonthlyCost = avgDailyCost * 30;
  const projectedYearlyCost = avgDailyCost * 365;

  return {
    currentPeriodCost: Math.round(currentPeriodCost * 10000) / 10000,
    projectedMonthlyCost: Math.round(projectedMonthlyCost * 10000) / 10000,
    projectedYearlyCost: Math.round(projectedYearlyCost * 10000) / 10000,
    trend,
    growthRate: Math.round(growthRate * 10) / 10,
    daysAnalyzed: dailyCosts.length,
    avgDailyCost: Math.round(avgDailyCost * 10000) / 10000,
  };
}

/**
 * Get feature adoption metrics
 *
 * Tracks which features are used by how many users and adoption rates.
 */
export async function getFeatureAdoption(
  days: number = 30,
  orgId?: string
): Promise<FeatureAdoption[]> {
  const logsCollection = await getAIRequestLogsCollection();
  const usersCollection = await getUsersCollection();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const match: Record<string, unknown> = {
    requestedAt: { $gte: startDate },
    isGuest: false,
  };
  if (orgId) {
    match.organizationId = orgId;
  }

  // Get total unique users (for adoption rate calculation)
  const totalUsersResult = await logsCollection
    .aggregate([
      { $match: { ...match, isGuest: false } },
      { $group: { _id: '$userId' } },
      { $count: 'total' },
    ])
    .toArray();
  const totalUsers = totalUsersResult[0]?.total || 0;

  // Get feature usage stats
  const featurePipeline = [
    { $match: match },
    {
      $group: {
        _id: '$feature',
        totalRequests: { $sum: 1 },
        totalTokens: { $sum: '$tokens.total' },
        uniqueUsers: { $addToSet: '$userId' },
      },
    },
  ];

  const featureStats = await logsCollection.aggregate(featurePipeline).toArray();

  // Get active users (used in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const activeUsersPipeline = [
    {
      $match: {
        ...match,
        requestedAt: { $gte: sevenDaysAgo },
      },
    },
    {
      $group: {
        _id: '$feature',
        activeUsers: { $addToSet: '$userId' },
      },
    },
  ];

  const activeUsersByFeature = await logsCollection.aggregate(activeUsersPipeline).toArray();
  const activeUsersMap = new Map(
    activeUsersByFeature.map((r) => [r._id, r.activeUsers?.length || 0])
  );

  // Get retention (users who used feature again within 30 days of first use)
  const retentionPromises = featureStats.map(async (stat) => {
    const feature = stat._id;
    const userIds = stat.uniqueUsers || [];

    if (userIds.length === 0) {
      return { feature, retentionRate: 0 };
    }

    // For each user, check if they used the feature again within 30 days
    let retainedUsers = 0;

    for (const userId of userIds.slice(0, 100)) {
      // Limit to first 100 users for performance
      const userLogs = await logsCollection
        .find({
          userId,
          feature,
          isGuest: false,
          requestedAt: { $gte: startDate },
        })
        .sort({ requestedAt: 1 })
        .limit(2)
        .toArray();

      if (userLogs.length >= 2) {
        const firstUse = userLogs[0].requestedAt;
        const secondUse = userLogs[1].requestedAt;
        const daysBetween = (secondUse.getTime() - firstUse.getTime()) / (1000 * 60 * 60 * 24);

        if (daysBetween <= 30) {
          retainedUsers++;
        }
      }
    }

    const retentionRate =
      userIds.length > 0 ? (retainedUsers / Math.min(userIds.length, 100)) * 100 : 0;

    return { feature, retentionRate };
  });

  const retentionData = await Promise.all(retentionPromises);
  const retentionMap = new Map(retentionData.map((r) => [r.feature, r.retentionRate]));

  // Build adoption metrics
  const adoption: FeatureAdoption[] = featureStats.map((stat) => {
    const feature = stat._id;
    const uniqueUsers = stat.uniqueUsers?.length || 0;
    const activeUsers = activeUsersMap.get(feature) || 0;
    const adoptionRate = totalUsers > 0 ? (uniqueUsers / totalUsers) * 100 : 0;
    const avgRequestsPerUser =
      uniqueUsers > 0 ? stat.totalRequests / uniqueUsers : 0;
    const retentionRate = retentionMap.get(feature) || 0;

    return {
      feature,
      totalUsers: uniqueUsers,
      activeUsers,
      adoptionRate: Math.round(adoptionRate * 10) / 10,
      avgRequestsPerUser: Math.round(avgRequestsPerUser * 10) / 10,
      retentionRate: Math.round(retentionRate * 10) / 10,
      totalRequests: stat.totalRequests,
      totalTokens: stat.totalTokens,
    };
  });

  // Sort by adoption rate (highest first)
  return adoption.sort((a, b) => b.adoptionRate - a.adoptionRate);
}

/**
 * Get quota metrics and rate limit tracking
 *
 * Analyzes organizations that are close to or hitting their limits.
 */
export async function getQuotaMetrics(
  days: number = 30,
  orgId?: string
): Promise<QuotaMetrics[]> {
  const orgsCollection = await getOrganizationsCollection();
  const usageCollection = await getUsageCollection();
  const logsCollection = await getAIRequestLogsCollection();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get all organizations (or specific one)
  const orgMatch: Record<string, unknown> = {};
  if (orgId) {
    orgMatch.orgId = orgId;
  }

  const orgs = await orgsCollection.find(orgMatch).toArray();
  const period = getCurrentPeriod();

  const quotaMetrics: QuotaMetrics[] = [];

  for (const org of orgs) {
    const tier = org.subscription?.tier || 'free';
    const limits = SUBSCRIPTION_TIERS[tier].limits;

    // Get current usage
    const usage = await usageCollection.findOne({
      organizationId: org.orgId,
      period,
    });

    const currentUsage = {
      generations: usage?.ai?.generations || 0,
      agentSessions: usage?.ai?.agentSessions || 0,
      processingRuns: usage?.ai?.processingRuns || 0,
    };

    const orgLimits = {
      generations: limits.aiGenerationsPerMonth,
      agentSessions: limits.agentSessionsPerMonth,
      processingRuns: limits.responseProcessingPerMonth,
    };

    // Count limit hits (when usage >= limit)
    let limitHits = 0;
    const limitHitsByFeature: Record<string, number> = {};

    // Check each metric for limit hits
    if (orgLimits.generations !== -1 && currentUsage.generations >= orgLimits.generations) {
      limitHits++;
      limitHitsByFeature['generations'] = 1;
    }
    if (orgLimits.agentSessions !== -1 && currentUsage.agentSessions >= orgLimits.agentSessions) {
      limitHits++;
      limitHitsByFeature['agentSessions'] = 1;
    }
    if (
      orgLimits.processingRuns !== -1 &&
      currentUsage.processingRuns >= orgLimits.processingRuns
    ) {
      limitHits++;
      limitHitsByFeature['processingRuns'] = 1;
    }

    // Calculate average usage before hitting limit (for orgs that hit limits)
    let avgUsageBeforeLimit = 0;
    if (limitHits > 0) {
      // Get usage from logs to see when limits were hit
      const usageLogs = await logsCollection
        .find({
          organizationId: org.orgId,
          requestedAt: { $gte: startDate },
        })
        .sort({ requestedAt: 1 })
        .toArray();

      // This is a simplified calculation - in practice, you'd track limit hits separately
      avgUsageBeforeLimit = usageLogs.length;
    }

    // Generate upgrade suggestions
    const upgradeSuggestions: string[] = [];
    if (limitHits > 0) {
      upgradeSuggestions.push(
        `Organization has hit ${limitHits} limit(s). Consider upgrading to a higher tier.`
      );
    }

    // Check if close to limits (>= 80% of limit)
    if (orgLimits.generations !== -1) {
      const percentUsed = (currentUsage.generations / orgLimits.generations) * 100;
      if (percentUsed >= 80 && percentUsed < 100) {
        upgradeSuggestions.push(
          `AI generations at ${Math.round(percentUsed)}% of limit. Consider upgrading.`
        );
      }
    }

    if (orgLimits.agentSessions !== -1) {
      const percentUsed = (currentUsage.agentSessions / orgLimits.agentSessions) * 100;
      if (percentUsed >= 80 && percentUsed < 100) {
        upgradeSuggestions.push(
          `Agent sessions at ${Math.round(percentUsed)}% of limit. Consider upgrading.`
        );
      }
    }

    quotaMetrics.push({
      orgId: org.orgId,
      limitHits,
      limitHitsByFeature,
      avgUsageBeforeLimit,
      upgradeSuggestions,
      currentUsage,
      limits: orgLimits,
    });
  }

  // Sort by limit hits (most hits first), then by usage percentage
  return quotaMetrics.sort((a, b) => {
    if (b.limitHits !== a.limitHits) {
      return b.limitHits - a.limitHits;
    }
    // Calculate total usage percentage
    const aPercent =
      a.limits.generations !== -1
        ? (a.currentUsage.generations / a.limits.generations) * 100
        : 0;
    const bPercent =
      b.limits.generations !== -1
        ? (b.currentUsage.generations / b.limits.generations) * 100
        : 0;
    return bPercent - aPercent;
  });
}

/**
 * Helper to get current period string (YYYY-MM)
 */
function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get user journey analytics
 *
 * Tracks how users combine AI features in sessions.
 * A session is defined as requests from the same user within 30 minutes.
 */
export async function getUserJourneys(
  days: number = 30,
  orgId?: string,
  userId?: string
): Promise<UserJourney[]> {
  const collection = await getAIRequestLogsCollection();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const match: Record<string, unknown> = {
    requestedAt: { $gte: startDate },
    isGuest: false,
  };
  if (orgId) {
    match.organizationId = orgId;
  }
  if (userId) {
    match.userId = userId;
  }

  // Get all requests sorted by user and time
  const requests = await collection
    .find(match)
    .sort({ userId: 1, requestedAt: 1 })
    .toArray();

  // Group into sessions (30-minute gap = new session)
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  const journeys: UserJourney[] = [];
  const sessionsByUser = new Map<string, AIRequestLog[]>();

  for (const request of requests) {
    const userKey = request.userId;
    let sessions = sessionsByUser.get(userKey) || [];

    if (sessions.length === 0) {
      // First request for this user
      sessions = [request];
    } else {
      const lastRequest = sessions[sessions.length - 1];
      const timeDiff = request.requestedAt.getTime() - lastRequest.requestedAt.getTime();

      if (timeDiff <= SESSION_TIMEOUT_MS) {
        // Same session
        sessions.push(request);
      } else {
        // New session - save previous and start new
        if (sessions.length > 0) {
          const journey = buildJourneyFromSession(sessions);
          journeys.push(journey);
        }
        sessions = [request];
      }
    }

    sessionsByUser.set(userKey, sessions);
  }

  // Process remaining sessions
  for (const sessions of sessionsByUser.values()) {
    if (sessions.length > 0) {
      const journey = buildJourneyFromSession(sessions);
      journeys.push(journey);
    }
  }

  // Sort by total cost (highest first)
  return journeys.sort((a, b) => b.totalCost - a.totalCost);
}

/**
 * Helper to build a journey from a session of requests
 */
function buildJourneyFromSession(requests: AIRequestLog[]): UserJourney {
  const features = requests.map((r) => r.feature);
  const uniqueFeatures = Array.from(new Set(features));
  const startTime = requests[0].requestedAt;
  const endTime = requests[requests.length - 1].requestedAt;
  const sessionDuration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes

  const totalCost = requests.reduce((sum, r) => sum + r.estimatedCostUsd, 0);
  const totalTokens = requests.reduce((sum, r) => sum + r.tokens.total, 0);

  // Determine outcome
  let outcome: 'completed' | 'abandoned' | 'error' = 'completed';
  if (requests.some((r) => !r.success)) {
    outcome = 'error';
  } else if (sessionDuration < 1 && requests.length === 1) {
    // Single quick request might be abandoned
    outcome = 'abandoned';
  }

  return {
    userId: requests[0].userId,
    featureSequence: features,
    sessionDuration: Math.round(sessionDuration * 10) / 10,
    featuresUsed: uniqueFeatures,
    totalCost: Math.round(totalCost * 10000) / 10000,
    totalTokens,
    outcome,
    startTime,
    endTime,
  };
}

/**
 * Detect cost anomalies
 *
 * Uses statistical analysis to identify unusual spending patterns.
 */
export async function detectCostAnomalies(
  days: number = 30,
  orgId?: string,
  threshold: number = 2.0 // 2 standard deviations
): Promise<CostAnomaly[]> {
  const collection = await getAIRequestLogsCollection();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const match: Record<string, unknown> = {
    requestedAt: { $gte: startDate },
  };
  if (orgId) {
    match.organizationId = orgId;
  }

  // Get daily costs
  const dailyCosts = await collection
    .aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$requestedAt' } },
          costUsd: { $sum: '$estimatedCostUsd' },
          orgId: { $first: '$organizationId' },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  if (dailyCosts.length < 7) {
    // Need at least 7 days for meaningful anomaly detection
    return [];
  }

  const costs = dailyCosts.map((d) => d.costUsd);
  const avg = costs.reduce((a, b) => a + b, 0) / costs.length;
  const variance =
    costs.reduce((sum, cost) => sum + Math.pow(cost - avg, 2), 0) / costs.length;
  const stdDev = Math.sqrt(variance);

  const anomalies: CostAnomaly[] = [];

  for (const day of dailyCosts) {
    const cost = day.costUsd;
    const zScore = stdDev > 0 ? (cost - avg) / stdDev : 0;

    if (Math.abs(zScore) >= threshold) {
      const deviation = ((cost - avg) / avg) * 100;
      const anomalyType: 'spike' | 'drop' | 'unusual_pattern' =
        deviation > 50 ? 'spike' : deviation < -50 ? 'drop' : 'unusual_pattern';

      const possibleCauses: string[] = [];
      if (anomalyType === 'spike') {
        possibleCauses.push('Unusual high usage');
        possibleCauses.push('Potential bug or infinite loop');
        possibleCauses.push('Bulk operation or migration');
      } else if (anomalyType === 'drop') {
        possibleCauses.push('Service outage or downtime');
        possibleCauses.push('Holiday or low activity period');
        possibleCauses.push('Rate limiting or quota reached');
      }

      anomalies.push({
        orgId: day.orgId,
        anomalyType,
        detectedAt: new Date(),
        expectedCost: Math.round(avg * 10000) / 10000,
        actualCost: Math.round(cost * 10000) / 10000,
        deviation: Math.round(deviation * 10) / 10,
        possibleCauses,
        date: day._id,
      });
    }
  }

  // Sort by deviation (most extreme first)
  return anomalies.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
}

/**
 * Get response quality metrics
 *
 * Tracks quality indicators like retry rates and acceptance.
 * Note: Some metrics require additional data collection.
 */
export async function getQualityMetrics(
  days: number = 30,
  orgId?: string
): Promise<QualityMetrics[]> {
  const collection = await getAIRequestLogsCollection();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const match: Record<string, unknown> = {
    requestedAt: { $gte: startDate },
  };
  if (orgId) {
    match.organizationId = orgId;
  }

  // Get feature-level stats
  const featureStats = await collection
    .aggregate([
      { $match: match },
      {
        $group: {
          _id: '$feature',
          totalRequests: { $sum: 1 },
          successCount: { $sum: { $cond: ['$success', 1, 0] } },
          avgLatencyMs: { $avg: '$latencyMs' },
        },
      },
    ])
    .toArray();

  // Calculate retry rate (users making multiple requests with same feature in short time)
  const retryPromises = featureStats.map(async (stat) => {
    const feature = stat._id;
    const featureMatch = { ...match, feature };

    // Get requests grouped by user
    const userRequests = await collection
      .aggregate([
        { $match: featureMatch },
        {
          $group: {
            _id: '$userId',
            requests: { $push: { time: '$requestedAt', requestId: '$requestId' } },
          },
        },
      ])
      .toArray();

    let retryCount = 0;
    let totalUsers = userRequests.length;

    for (const user of userRequests) {
      const requests = user.requests.sort(
        (a: { time: Date; requestId: string }, b: { time: Date; requestId: string }) =>
          a.time.getTime() - b.time.getTime()
      );

      // Check for retries (same feature within 5 minutes)
      for (let i = 1; i < requests.length; i++) {
        const timeDiff = requests[i].time.getTime() - requests[i - 1].time.getTime();
        if (timeDiff < 5 * 60 * 1000) {
          // Within 5 minutes = likely a retry
          retryCount++;
          break; // Count once per user
        }
      }
    }

    const retryRate = totalUsers > 0 ? (retryCount / totalUsers) * 100 : 0;
    const successRate =
      stat.totalRequests > 0
        ? (stat.successCount / stat.totalRequests) * 100
        : 0;

    return {
      feature: stat._id,
      avgConfidence: 0, // Not available in current data
      retryRate: Math.round(retryRate * 10) / 10,
      acceptanceRate: 0, // Would require tracking if generated content was used
      avgLatencyMs: Math.round(stat.avgLatencyMs || 0),
      successRate: Math.round(successRate * 10) / 10,
      totalRequests: stat.totalRequests,
    };
  });

  const quality = await Promise.all(retryPromises);

  // Sort by total requests (most used first)
  return quality.sort((a, b) => b.totalRequests - a.totalRequests);
}

/**
 * Get comparative analytics
 *
 * Compares two time periods side-by-side.
 */
export async function getComparativeMetrics(
  period1Days: number,
  period2Days: number,
  orgId?: string
): Promise<ComparativeMetrics> {
  const now = new Date();

  // Period 2: Most recent period
  const period2End = now;
  const period2Start = new Date(now.getTime() - period2Days * 24 * 60 * 60 * 1000);

  // Period 1: Previous period (same length, before period 2)
  const period1End = period2Start;
  const period1Start = new Date(period1End.getTime() - period1Days * 24 * 60 * 60 * 1000);

  // Get summaries for both periods
  const [summary1, summary2] = await Promise.all([
    getAIUsageSummaryForPeriod(period1Start, period1End, orgId),
    getAIUsageSummaryForPeriod(period2Start, period2End, orgId),
  ]);

  // Calculate changes
  const change = {
    requests:
      summary1.totalRequests > 0
        ? ((summary2.totalRequests - summary1.totalRequests) / summary1.totalRequests) * 100
        : 0,
    tokens:
      summary1.totalTokens > 0
        ? ((summary2.totalTokens - summary1.totalTokens) / summary1.totalTokens) * 100
        : 0,
    cost:
      summary1.totalCostUsd > 0
        ? ((summary2.totalCostUsd - summary1.totalCostUsd) / summary1.totalCostUsd) * 100
        : 0,
    latency:
      summary1.avgLatencyMs > 0
        ? ((summary2.avgLatencyMs - summary1.avgLatencyMs) / summary1.avgLatencyMs) * 100
        : 0,
    users:
      summary1.uniqueUsers > 0
        ? ((summary2.uniqueUsers - summary1.uniqueUsers) / summary1.uniqueUsers) * 100
        : 0,
  };

  // Generate insights
  const insights: string[] = [];
  if (Math.abs(change.cost) > 20) {
    insights.push(
      `Cost ${change.cost > 0 ? 'increased' : 'decreased'} by ${Math.abs(change.cost).toFixed(1)}%`
    );
  }
  if (Math.abs(change.requests) > 20) {
    insights.push(
      `Requests ${change.requests > 0 ? 'increased' : 'decreased'} by ${Math.abs(change.requests).toFixed(1)}%`
    );
  }
  if (Math.abs(change.latency) > 20) {
    insights.push(
      `Average latency ${change.latency > 0 ? 'increased' : 'decreased'} by ${Math.abs(change.latency).toFixed(1)}%`
    );
  }
  if (change.users > 10) {
    insights.push(`User base grew by ${change.users.toFixed(1)}%`);
  }

  return {
    period1: {
      label: `Previous ${period1Days} days`,
      startDate: period1Start,
      endDate: period1End,
      summary: summary1,
    },
    period2: {
      label: `Recent ${period2Days} days`,
      startDate: period2Start,
      endDate: period2End,
      summary: summary2,
    },
    change: {
      requests: Math.round(change.requests * 10) / 10,
      tokens: Math.round(change.tokens * 10) / 10,
      cost: Math.round(change.cost * 10) / 10,
      latency: Math.round(change.latency * 10) / 10,
      users: Math.round(change.users * 10) / 10,
    },
    insights,
  };
}

/**
 * Helper to get usage summary for a specific period
 */
async function getAIUsageSummaryForPeriod(
  startDate: Date,
  endDate: Date,
  orgId?: string
): Promise<AIUsageSummary> {
  const collection = await getAIRequestLogsCollection();

  const match: Record<string, unknown> = {
    requestedAt: { $gte: startDate, $lte: endDate },
  };
  if (orgId) {
    match.organizationId = orgId;
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        totalTokens: { $sum: '$tokens.total' },
        promptTokens: { $sum: '$tokens.prompt' },
        completionTokens: { $sum: '$tokens.completion' },
        totalCostUsd: { $sum: '$estimatedCostUsd' },
        avgLatencyMs: { $avg: '$latencyMs' },
        successCount: { $sum: { $cond: ['$success', 1, 0] } },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueOrgs: { $addToSet: '$organizationId' },
      },
    },
  ];

  const results = await collection.aggregate(pipeline).toArray();

  if (results.length === 0) {
    return {
      totalRequests: 0,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalCostUsd: 0,
      avgLatencyMs: 0,
      uniqueUsers: 0,
      uniqueOrgs: 0,
      successRate: 0,
    };
  }

  const result = results[0];
  const successRate =
    result.totalRequests > 0 ? (result.successCount / result.totalRequests) * 100 : 0;

  return {
    totalRequests: result.totalRequests,
    totalTokens: result.totalTokens,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    totalCostUsd: Math.round(result.totalCostUsd * 100) / 100,
    avgLatencyMs: Math.round(result.avgLatencyMs || 0),
    uniqueUsers: result.uniqueUsers?.length || 0,
    uniqueOrgs: result.uniqueOrgs?.length || 0,
    successRate: Math.round(successRate * 10) / 10,
  };
}
