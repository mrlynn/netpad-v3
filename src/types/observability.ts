/**
 * Observability Types
 *
 * Data models for system health monitoring, error tracking, alerting,
 * API metrics, and admin broadcasts
 */

import { ObjectId } from 'mongodb';

// ============================================
// System Health Monitoring
// ============================================

export type ServiceName = 'api' | 'database' | 'ai' | 'email' | 'storage';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Current health status for a service
 */
export interface SystemHealthCheck {
  _id?: ObjectId;
  serviceName: ServiceName;
  status: HealthStatus;
  latencyMs: number;
  lastCheckedAt: Date;
  nextCheckAt: Date;
  errorMessage?: string;
  consecutiveFailures: number;
  uptimePercent24h: number;
  metadata?: Record<string, unknown>;
}

/**
 * Historical health record for uptime tracking
 * TTL: 30 days
 */
export interface SystemHealthHistory {
  _id?: ObjectId;
  serviceName: ServiceName;
  status: HealthStatus;
  latencyMs: number;
  recordedAt: Date;
  errorMessage?: string;
}

/**
 * Incident record for outages
 */
export interface SystemIncident {
  _id?: ObjectId;
  incidentId: string;
  serviceName: ServiceName;
  title: string;
  description?: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'minor' | 'major' | 'critical';
  startedAt: Date;
  resolvedAt?: Date;
  updates: Array<{
    message: string;
    status: string;
    timestamp: Date;
    updatedBy: string;
  }>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Platform Error Tracking
// ============================================

export type ErrorSource = 'api' | 'workflow' | 'ai' | 'auth' | 'billing' | 'integration' | 'system';
export type ErrorSeverity = 'error' | 'warning' | 'critical';
export type ErrorStatus = 'open' | 'acknowledged' | 'resolved' | 'ignored';

/**
 * Tracked platform error
 * TTL: 90 days
 */
export interface PlatformError {
  _id?: ObjectId;
  errorId: string; // "err_abc123"

  // Error details
  message: string;
  stack?: string;
  code?: string;

  // Context
  source: ErrorSource;
  endpoint?: string;
  method?: string;

  // Request context
  requestId?: string;
  userId?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;

  // Classification
  severity: ErrorSeverity;
  fingerprint: string; // Hash for grouping similar errors

  // Occurrence tracking
  count: number;
  firstSeenAt: Date;
  lastSeenAt: Date;

  // Resolution
  status: ErrorStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;

  // Metadata
  metadata?: Record<string, unknown>;
  tags?: string[];

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Summary of errors for dashboard
 */
export interface ErrorSummary {
  total: number;
  open: number;
  acknowledged: number;
  resolved: number;
  critical: number;
  bySource: Record<ErrorSource, number>;
  bySeverity: Record<ErrorSeverity, number>;
  trend: Array<{ date: string; count: number }>;
  topErrors: Array<{
    fingerprint: string;
    message: string;
    count: number;
    severity: ErrorSeverity;
    lastSeenAt: Date;
  }>;
}

// ============================================
// Alerting System
// ============================================

export type AlertMetric =
  | 'error_rate'
  | 'error_count_5m'
  | 'error_count_1h'
  | 'api_latency_avg'
  | 'api_latency_p95'
  | 'api_latency_p99'
  | 'ai_cost_daily'
  | 'ai_cost_hourly'
  | 'ai_error_rate'
  | 'ai_latency_avg'
  | 'database_latency'
  | 'failed_logins_5m'
  | 'failed_logins_1h'
  | 'submission_failure_rate'
  | 'workflow_failure_rate'
  | 'cluster_inactive_count'
  | 'memory_usage_percent';

export type AlertOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
export type AlertChannelType = 'email' | 'webhook';
export type AlertRuleStatus = 'active' | 'paused' | 'disabled';

export interface AlertCondition {
  operator: AlertOperator;
  value: number;
  unit?: 'percent' | 'ms' | 'count' | 'usd';
}

export interface EmailAlertConfig {
  recipients: string[];
  includeDetails?: boolean;
}

export interface WebhookAlertConfig {
  url: string;
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;
  includePayload?: boolean;
}

export interface AlertChannel {
  type: AlertChannelType;
  config: EmailAlertConfig | WebhookAlertConfig;
}

/**
 * Alert rule configuration
 */
export interface AlertRule {
  _id?: ObjectId;
  ruleId: string; // "rule_abc123"
  name: string;
  description?: string;

  // Rule definition
  metric: AlertMetric;
  condition: AlertCondition;

  // Scope
  scope: 'platform' | 'organization';
  organizationId?: string; // null for platform-wide rules

  // Timing
  evaluationIntervalMinutes: number; // How often to check (default: 5)
  cooldownMinutes: number; // Minimum time between alerts (default: 60)

  // Actions
  channels: AlertChannel[];

  // State
  status: AlertRuleStatus;
  enabled: boolean;
  lastEvaluatedAt?: Date;
  lastAlertedAt?: Date;
  lastMetricValue?: number;

  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AlertHistoryStatus = 'active' | 'acknowledged' | 'resolved' | 'auto_resolved';

export interface AlertDeliveryStatus {
  channelType: AlertChannelType;
  status: 'sent' | 'failed' | 'pending';
  deliveredAt?: Date;
  error?: string;
  recipient?: string;
}

/**
 * Historical alert record
 * TTL: 90 days
 */
export interface AlertHistoryEntry {
  _id?: ObjectId;
  alertId: string; // "alert_abc123"
  ruleId: string;
  ruleName: string;

  // Trigger info
  triggeredAt: Date;
  metric: AlertMetric;
  metricValue: number;
  threshold: number;
  condition: AlertCondition;

  // Delivery
  channels: AlertDeliveryStatus[];

  // Resolution
  status: AlertHistoryStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;

  // Auto-resolution (if metric returns to normal)
  autoResolvedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Alert trigger data for evaluation
 */
export interface AlertTriggerData {
  metricValue: number;
  threshold: number;
  timestamp: Date;
  context?: Record<string, unknown>;
}

// ============================================
// API Metrics
// ============================================

export interface EndpointMetrics {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  statusCodes: Record<number, number>;
  methods: Record<string, number>;
}

/**
 * Aggregated API metrics per time period
 * TTL: 30 days for hourly, 365 days for daily
 */
export interface APIMetricAggregation {
  _id?: ObjectId;
  period: string; // "2025-01-24-14" (hourly) or "2025-01-24" (daily)
  periodType: 'hourly' | 'daily';

  // Global metrics
  totalRequests: number;
  totalErrors: number;
  avgLatencyMs: number;
  p95LatencyMs: number;

  // Per-endpoint breakdown
  endpoints: Record<string, EndpointMetrics>;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Real-time metrics sample (for current hour)
 */
export interface APIMetricSample {
  _id?: ObjectId;
  endpoint: string;
  method: string;
  statusCode: number;
  latencyMs: number;
  requestId?: string;
  userId?: string;
  organizationId?: string;
  timestamp: Date;
  // TTL: 1 hour
}

/**
 * API metrics summary for dashboard
 */
export interface APIMetricsSummary {
  period: { start: Date; end: Date };
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  topEndpoints: Array<{
    endpoint: string;
    requests: number;
    errors: number;
    avgLatencyMs: number;
  }>;
  slowestEndpoints: Array<{
    endpoint: string;
    avgLatencyMs: number;
    p95LatencyMs: number;
    requests: number;
  }>;
  errorsByEndpoint: Array<{
    endpoint: string;
    errors: number;
    errorRate: number;
  }>;
  trend: Array<{
    period: string;
    requests: number;
    errors: number;
    avgLatencyMs: number;
  }>;
}

// ============================================
// Admin Broadcasts
// ============================================

export type BroadcastType = 'info' | 'warning' | 'alert' | 'maintenance' | 'success' | 'custom';

// Custom badge options for 'custom' broadcast type
export type CustomBadge =
  | 'new'
  | 'hot'
  | 'attention'
  | 'special'
  | 'urgent'
  | 'announcement'
  | 'breaking'
  | 'launch'
  | 'update'
  | 'tip'
  | 'promo'
  | 'security'
  | 'policy'
  | 'beta'
  | 'limited';
export type BroadcastAudience = 'all' | 'admins' | 'specific_orgs' | 'specific_users';
export type BroadcastPlacement = 'banner' | 'toast' | 'modal';
export type BroadcastStatus = 'draft' | 'scheduled' | 'active' | 'expired' | 'cancelled';

/**
 * Admin broadcast message
 */
export interface AdminBroadcast {
  _id?: ObjectId;
  broadcastId: string; // "broadcast_abc123"

  // Content
  title: string;
  message: string;
  type: BroadcastType;
  customBadge?: CustomBadge; // Only used when type is 'custom'
  linkUrl?: string;
  linkText?: string;

  // Targeting
  audience: BroadcastAudience;
  targetOrganizations?: string[];
  targetUsers?: string[];

  // Display
  placement: BroadcastPlacement;
  dismissible: boolean;
  priority: number; // Higher = more important

  // Scheduling
  status: BroadcastStatus;
  startsAt: Date;
  expiresAt?: Date;

  // Tracking
  viewCount: number;
  dismissCount: number;

  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Track user dismissals
 */
export interface BroadcastDismissal {
  _id?: ObjectId;
  broadcastId: string;
  userId: string;
  dismissedAt: Date;
}

// ============================================
// Deployment Tracking
// ============================================

export type DeploymentEnvironment = 'development' | 'preview' | 'production';
export type DeploymentStatus = 'building' | 'ready' | 'error' | 'cancelled';

/**
 * Deployment record
 */
export interface DeploymentInfo {
  _id?: ObjectId;
  deploymentId: string;

  // Git info
  gitCommitSha: string;
  gitCommitMessage?: string;
  gitCommitAuthor?: string;
  gitBranch?: string;
  gitRepository?: string;

  // Environment
  environment: DeploymentEnvironment;
  url?: string;

  // Status
  status: DeploymentStatus;
  buildDurationMs?: number;

  // Timestamps
  startedAt: Date;
  readyAt?: Date;
  createdAt: Date;
}

/**
 * Current deployment environment info
 */
export interface CurrentDeployment {
  commitSha: string;
  commitShort: string;
  commitMessage?: string;
  commitAuthor?: string;
  branch?: string;
  environment: DeploymentEnvironment;
  region?: string;
  nodeVersion: string;
  startedAt: Date;
  uptime: string;
  uptimeMs: number;
}

// ============================================
// Dashboard Types
// ============================================

/**
 * Combined system status for dashboard
 */
export interface SystemStatusOverview {
  overallStatus: HealthStatus;
  services: SystemHealthCheck[];
  activeIncidents: SystemIncident[];
  recentErrors: number;
  activeAlerts: number;
  uptimeLast24h: number;
  lastUpdated: Date;
}

/**
 * Observability dashboard data
 */
export interface ObservabilityDashboard {
  systemStatus: SystemStatusOverview;
  errorSummary: ErrorSummary;
  apiMetrics: APIMetricsSummary;
  activeAlerts: AlertHistoryEntry[];
  recentDeployment?: CurrentDeployment;
}
