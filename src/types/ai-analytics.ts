/**
 * AI Analytics Types
 *
 * Data models for tracking LLM usage, costs, and performance metrics
 */

import { ObjectId } from 'mongodb';
import { AIFeature } from './platform';

/**
 * Supported LLM providers
 */
export type AIProvider = 'openai' | 'ollama' | 'openrouter';

/**
 * Token usage breakdown
 */
export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

/**
 * Detailed log entry for each AI request
 * Stored in ai_request_logs collection with 90-day TTL
 */
export interface AIRequestLog {
  _id?: ObjectId;
  requestId: string; // "aireq_abc123"

  // Context
  organizationId: string;
  userId: string;
  isGuest: boolean;

  // Request details
  feature: AIFeature; // Which AI feature was used
  endpoint: string; // "/api/ai/generate-form"
  model: string; // "gpt-4o-mini", "llama3.2"
  provider: AIProvider;

  // Token usage (actual from response or estimated)
  tokens: TokenUsage;

  // Cost estimation
  estimatedCostUsd: number;

  // Performance
  latencyMs: number;

  // Status
  success: boolean;
  errorCode?: string;
  errorMessage?: string;

  // Timestamps
  requestedAt: Date;
  completedAt: Date;
  createdAt: Date;
}

/**
 * Feature usage breakdown for aggregates
 */
export interface FeatureUsage {
  requests: number;
  tokens: number;
  costUsd: number;
  avgLatencyMs: number;
}

/**
 * Model usage breakdown for aggregates
 */
export interface ModelUsage {
  requests: number;
  tokens: number;
  costUsd: number;
}

/**
 * Aggregated AI usage statistics
 * Daily rollups stored in ai_usage_aggregates collection
 */
export interface AIUsageAggregate {
  _id?: ObjectId;
  organizationId: string;
  period: string; // "2025-01-17" for daily, "2025-01" for monthly
  periodType: 'daily' | 'monthly';

  // Totals
  totalRequests: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCostUsd: number;

  // Breakdown by feature
  byFeature: Record<string, FeatureUsage>;

  // Breakdown by model
  byModel: Record<string, ModelUsage>;

  // Breakdown by provider
  byProvider: Record<string, ModelUsage>;

  // Success metrics
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Summary statistics for admin dashboard
 */
export interface AIUsageSummary {
  totalRequests: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  uniqueUsers: number;
  uniqueOrgs: number;
  successRate: number;
}

/**
 * Top user by AI usage
 */
export interface TopAIUser {
  userId: string;
  email?: string;
  name?: string;
  requests: number;
  tokens: number;
  costUsd: number;
  avgLatencyMs: number;
}

/**
 * Time series data point for charts
 */
export interface AIUsageDataPoint {
  date: string; // "2025-01-17"
  requests: number;
  tokens: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  avgLatencyMs: number;
}

/**
 * Context for AI service calls
 */
export interface AIServiceContext {
  userId: string;
  orgId: string;
  isGuest: boolean;
  feature: AIFeature;
  endpoint: string;
}

/**
 * Result from AI service calls
 */
export interface AIServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  };
  latencyMs: number;
}

/**
 * Streaming result with deferred usage retrieval
 */
export interface AIStreamingResult {
  stream: AsyncIterable<string>;
  getUsage: () => Promise<TokenUsage | null>;
}

/**
 * Query options for analytics
 */
export interface AIAnalyticsQueryOptions {
  startDate?: Date;
  endDate?: Date;
  orgId?: string;
  userId?: string;
  feature?: AIFeature;
  model?: string;
  provider?: AIProvider;
  groupBy?: 'day' | 'feature' | 'model' | 'user' | 'provider';
  limit?: number;
  offset?: number;
}

/**
 * Efficiency metrics - token and cost efficiency per request
 */
export interface EfficiencyMetrics {
  avgTokensPerRequest: number;
  avgCostPerRequest: number;
  avgPromptTokensPerRequest: number;
  avgCompletionTokensPerRequest: number;
  tokenEfficiency: number; // completion / prompt ratio (higher = more efficient)
}

/**
 * Hourly usage breakdown
 */
export interface HourlyUsage {
  hour: number; // 0-23
  requests: number;
  tokens: number;
  costUsd: number;
  avgLatencyMs: number;
}

/**
 * Model performance metrics with latency percentiles
 */
export interface ModelPerformance {
  model: string;
  requests: number;
  totalTokens: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  successRate: number;
  errorRate: number;
  avgCostPerRequest: number;
  avgTokensPerRequest: number;
  p50Latency: number; // 50th percentile
  p95Latency: number; // 95th percentile
  p99Latency: number; // 99th percentile
}

/**
 * Cost projection based on trends
 */
export interface CostProjection {
  currentPeriodCost: number;
  projectedMonthlyCost: number;
  projectedYearlyCost: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  growthRate: number; // % per period
  daysAnalyzed: number;
  avgDailyCost: number;
}

/**
 * Feature adoption metrics
 */
export interface FeatureAdoption {
  feature: string;
  totalUsers: number;
  activeUsers: number; // users who used it in last 7 days
  adoptionRate: number; // % of total users
  avgRequestsPerUser: number;
  retentionRate: number; // % who used it again within 30 days
  totalRequests: number;
  totalTokens: number;
}

/**
 * Rate limit hit tracking
 */
export interface QuotaMetrics {
  orgId: string;
  limitHits: number;
  limitHitsByFeature: Record<string, number>;
  avgUsageBeforeLimit: number;
  upgradeSuggestions: string[];
  currentUsage: {
    generations: number;
    agentSessions: number;
    processingRuns: number;
  };
  limits: {
    generations: number;
    agentSessions: number;
    processingRuns: number;
  };
}

/**
 * User journey analytics
 */
export interface UserJourney {
  userId: string;
  featureSequence: string[]; // ordered list of features used
  sessionDuration: number; // minutes
  featuresUsed: string[];
  totalCost: number;
  totalTokens: number;
  outcome: 'completed' | 'abandoned' | 'error';
  startTime: Date;
  endTime: Date;
}

/**
 * Cost anomaly detection
 */
export interface CostAnomaly {
  orgId: string;
  anomalyType: 'spike' | 'drop' | 'unusual_pattern';
  detectedAt: Date;
  expectedCost: number;
  actualCost: number;
  deviation: number; // %
  possibleCauses: string[];
  date: string; // YYYY-MM-DD
}

/**
 * Response quality metrics
 */
export interface QualityMetrics {
  feature: string;
  avgConfidence: number; // if generators return confidence
  retryRate: number; // how often users regenerate
  acceptanceRate: number; // how often generated content is used
  avgLatencyMs: number;
  successRate: number;
  totalRequests: number;
}

/**
 * Comparative analytics
 */
export interface ComparativeMetrics {
  period1: {
    label: string;
    startDate: Date;
    endDate: Date;
    summary: AIUsageSummary;
  };
  period2: {
    label: string;
    startDate: Date;
    endDate: Date;
    summary: AIUsageSummary;
  };
  change: {
    requests: number; // %
    tokens: number; // %
    cost: number; // %
    latency: number; // %
    users: number; // %
  };
  insights: string[];
}
