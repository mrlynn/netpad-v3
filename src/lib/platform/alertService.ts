/**
 * Alert Service
 *
 * Manages alert rules, evaluates conditions, and triggers notifications
 */

import { ObjectId } from 'mongodb';
import {
  AlertRule,
  AlertHistoryEntry,
  AlertMetric,
  AlertOperator,
  AlertChannel,
  AlertHistoryStatus,
  AlertDeliveryStatus,
  AlertCondition,
  EmailAlertConfig,
  WebhookAlertConfig,
} from '@/types/observability';
import {
  getAlertRulesCollection,
  getAlertHistoryCollection,
  getPlatformErrorsCollection,
  getAPIMetricsCollection,
  getSystemHealthCollection,
} from './db';
import { sendAlertEmail } from './alertDelivery';

/**
 * Generate a unique rule ID
 */
function generateRuleId(): string {
  return `rule_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Generate a unique alert ID
 */
function generateAlertId(): string {
  return `alert_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Create a new alert rule
 */
export async function createAlertRule(
  rule: Omit<AlertRule, '_id' | 'ruleId' | 'createdAt'>
): Promise<AlertRule> {
  const collection = await getAlertRulesCollection();
  const now = new Date();

  const newRule: AlertRule = {
    ...rule,
    ruleId: generateRuleId(),
    createdAt: now,
  };

  await collection.insertOne(newRule);
  return newRule;
}

/**
 * Update an existing alert rule
 */
export async function updateAlertRule(
  ruleId: string,
  updates: Partial<Omit<AlertRule, '_id' | 'ruleId' | 'createdAt' | 'createdBy'>>
): Promise<boolean> {
  const collection = await getAlertRulesCollection();
  const result = await collection.updateOne(
    { ruleId },
    { $set: updates }
  );
  return result.modifiedCount > 0;
}

/**
 * Delete an alert rule
 */
export async function deleteAlertRule(ruleId: string): Promise<boolean> {
  const collection = await getAlertRulesCollection();
  const result = await collection.deleteOne({ ruleId });
  return result.deletedCount > 0;
}

/**
 * Get all alert rules
 */
export async function getAllAlertRules(): Promise<AlertRule[]> {
  const collection = await getAlertRulesCollection();
  return collection.find({}).sort({ createdAt: -1 }).toArray();
}

/**
 * Get a single alert rule by ID
 */
export async function getAlertRule(ruleId: string): Promise<AlertRule | null> {
  const collection = await getAlertRulesCollection();
  return collection.findOne({ ruleId });
}

/**
 * Get enabled alert rules
 */
export async function getEnabledAlertRules(): Promise<AlertRule[]> {
  const collection = await getAlertRulesCollection();
  return collection.find({ enabled: true }).toArray();
}

/**
 * Get metric value for evaluation
 */
export async function getMetricValue(metric: AlertMetric): Promise<number> {
  const now = Date.now();
  const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);
  const oneHourAgo = new Date(now - 60 * 60 * 1000);
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

  switch (metric) {
    case 'error_count_5m': {
      const errorsCollection = await getPlatformErrorsCollection();
      const count = await errorsCollection.countDocuments({
        lastSeenAt: { $gte: fiveMinutesAgo },
        status: { $ne: 'resolved' },
      });
      return count;
    }

    case 'error_rate': {
      // Error rate as percentage of total requests in last 5 minutes
      const errorsCollection = await getPlatformErrorsCollection();
      const metricsCollection = await getAPIMetricsCollection();

      const [errorCount, metrics] = await Promise.all([
        errorsCollection.countDocuments({
          lastSeenAt: { $gte: fiveMinutesAgo },
        }),
        metricsCollection.findOne(
          { periodType: 'hourly' },
          { sort: { period: -1 } }
        ),
      ]);

      if (!metrics || !metrics.endpoints) return 0;

      const totalRequests = Object.values(metrics.endpoints).reduce(
        (sum, ep) => sum + (ep.totalRequests || 0),
        0
      );

      if (totalRequests === 0) return 0;
      return (errorCount / totalRequests) * 100;
    }

    case 'api_latency_p95': {
      const metricsCollection = await getAPIMetricsCollection();
      const metrics = await metricsCollection.findOne(
        { periodType: 'hourly' },
        { sort: { period: -1 } }
      );

      if (!metrics || !metrics.endpoints) return 0;

      const p95Values = Object.values(metrics.endpoints)
        .map((ep) => ep.p95LatencyMs || 0)
        .filter((v) => v > 0);

      if (p95Values.length === 0) return 0;
      return Math.max(...p95Values);
    }

    case 'database_latency': {
      const healthCollection = await getSystemHealthCollection();
      const dbHealth = await healthCollection.findOne({ serviceName: 'database' });
      return dbHealth?.latencyMs || 0;
    }

    case 'ai_latency_avg': {
      const healthCollection = await getSystemHealthCollection();
      const aiHealth = await healthCollection.findOne({ serviceName: 'ai' });
      return aiHealth?.latencyMs || 0;
    }

    case 'ai_error_rate': {
      const errorsCollection = await getPlatformErrorsCollection();
      const aiErrors = await errorsCollection.countDocuments({
        source: 'ai',
        lastSeenAt: { $gte: oneHourAgo },
        status: { $ne: 'resolved' },
      });
      // Return as count for now (could be percentage if we track total AI requests)
      return aiErrors;
    }

    case 'failed_logins_5m': {
      // This would require audit log data
      // For now, return 0 as placeholder
      return 0;
    }

    case 'submission_failure_rate': {
      // Would need to track form submission success/failure
      return 0;
    }

    case 'ai_cost_daily': {
      // Would need AI cost tracking
      return 0;
    }

    default:
      return 0;
  }
}

/**
 * Evaluate a condition
 */
function evaluateCondition(
  value: number,
  operator: AlertOperator,
  threshold: number
): boolean {
  switch (operator) {
    case 'gt':
      return value > threshold;
    case 'gte':
      return value >= threshold;
    case 'lt':
      return value < threshold;
    case 'lte':
      return value <= threshold;
    case 'eq':
      return value === threshold;
    case 'ne':
      return value !== threshold;
    default:
      return false;
  }
}

/**
 * Check if an alert is in cooldown period
 */
function isInCooldown(rule: AlertRule): boolean {
  if (!rule.lastAlertedAt) return false;

  const cooldownMs = rule.cooldownMinutes * 60 * 1000;
  const timeSinceLastAlert = Date.now() - rule.lastAlertedAt.getTime();

  return timeSinceLastAlert < cooldownMs;
}

/**
 * Evaluate a single alert rule
 */
export async function evaluateRule(rule: AlertRule): Promise<{
  triggered: boolean;
  metricValue: number;
  skipped?: boolean;
  reason?: string;
}> {
  // Check if in cooldown
  if (isInCooldown(rule)) {
    return {
      triggered: false,
      metricValue: 0,
      skipped: true,
      reason: 'In cooldown period',
    };
  }

  // Get current metric value
  const metricValue = await getMetricValue(rule.metric);

  // Evaluate condition
  const triggered = evaluateCondition(
    metricValue,
    rule.condition.operator,
    rule.condition.value
  );

  return { triggered, metricValue };
}

/**
 * Send alert through configured channels
 */
async function sendAlert(
  rule: AlertRule,
  metricValue: number
): Promise<AlertDeliveryStatus[]> {
  const results: AlertDeliveryStatus[] = [];

  for (const channel of rule.channels) {
    const now = new Date();
    try {
      if (channel.type === 'email') {
        const emailConfig = channel.config as EmailAlertConfig;
        if (emailConfig.recipients && emailConfig.recipients.length > 0) {
          await sendAlertEmail({
            recipients: emailConfig.recipients,
            rule,
            metricValue,
          });
          results.push({
            channelType: 'email',
            status: 'sent',
            deliveredAt: now,
            recipient: emailConfig.recipients.join(', ')
          });
        }
      } else if (channel.type === 'webhook') {
        const webhookConfig = channel.config as WebhookAlertConfig;
        if (webhookConfig.url) {
          const response = await fetch(webhookConfig.url, {
            method: webhookConfig.method || 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(webhookConfig.headers || {}),
            },
            body: JSON.stringify({
              alert: {
                ruleId: rule.ruleId,
                ruleName: rule.name,
                metric: rule.metric,
                threshold: rule.condition.value,
                currentValue: metricValue,
                triggeredAt: now.toISOString(),
              },
            }),
          });

          if (!response.ok) {
            throw new Error(`Webhook returned ${response.status}`);
          }
          results.push({
            channelType: 'webhook',
            status: 'sent',
            deliveredAt: now,
            recipient: webhookConfig.url
          });
        }
      }
    } catch (error) {
      results.push({
        channelType: channel.type,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Record alert in history
 */
async function recordAlert(
  rule: AlertRule,
  metricValue: number,
  channelResults: AlertDeliveryStatus[]
): Promise<AlertHistoryEntry> {
  const historyCollection = await getAlertHistoryCollection();
  const rulesCollection = await getAlertRulesCollection();
  const now = new Date();

  const alertEntry: AlertHistoryEntry = {
    alertId: generateAlertId(),
    ruleId: rule.ruleId,
    ruleName: rule.name,
    triggeredAt: now,
    metric: rule.metric,
    metricValue,
    threshold: rule.condition.value,
    condition: rule.condition,
    channels: channelResults,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await historyCollection.insertOne(alertEntry);

  // Update rule's lastAlertedAt
  await rulesCollection.updateOne(
    { ruleId: rule.ruleId },
    {
      $set: {
        lastAlertedAt: now,
        lastEvaluatedAt: now,
      },
    }
  );

  return alertEntry;
}

/**
 * Evaluate all enabled alert rules
 */
export async function evaluateAllRules(): Promise<{
  evaluated: number;
  triggered: number;
  alerts: AlertHistoryEntry[];
}> {
  const rules = await getEnabledAlertRules();
  const alerts: AlertHistoryEntry[] = [];
  let triggered = 0;

  for (const rule of rules) {
    const result = await evaluateRule(rule);

    if (result.triggered) {
      triggered++;
      const channelResults = await sendAlert(rule, result.metricValue);
      const alertEntry = await recordAlert(rule, result.metricValue, channelResults);
      alerts.push(alertEntry);
    }

    // Update lastEvaluatedAt regardless of trigger
    const rulesCollection = await getAlertRulesCollection();
    await rulesCollection.updateOne(
      { ruleId: rule.ruleId },
      { $set: { lastEvaluatedAt: new Date() } }
    );
  }

  return {
    evaluated: rules.length,
    triggered,
    alerts,
  };
}

/**
 * Test an alert rule without saving to history
 */
export async function testAlertRule(ruleId: string): Promise<{
  triggered: boolean;
  metricValue: number;
  threshold: number;
  wouldNotify: AlertChannel[];
}> {
  const rule = await getAlertRule(ruleId);
  if (!rule) {
    throw new Error('Rule not found');
  }

  const metricValue = await getMetricValue(rule.metric);
  const triggered = evaluateCondition(
    metricValue,
    rule.condition.operator,
    rule.condition.value
  );

  return {
    triggered,
    metricValue,
    threshold: rule.condition.value,
    wouldNotify: rule.channels,
  };
}

/**
 * Get alert history
 */
export interface AlertHistoryQuery {
  ruleId?: string;
  status?: AlertHistoryStatus | AlertHistoryStatus[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export async function getAlertHistory(
  query: AlertHistoryQuery = {}
): Promise<{ alerts: AlertHistoryEntry[]; total: number; hasMore: boolean }> {
  const collection = await getAlertHistoryCollection();
  const { limit = 50, offset = 0 } = query;

  const filter: Record<string, unknown> = {};

  if (query.ruleId) {
    filter.ruleId = query.ruleId;
  }

  if (query.status) {
    filter.status = Array.isArray(query.status) ? { $in: query.status } : query.status;
  }

  if (query.startDate || query.endDate) {
    filter.triggeredAt = {};
    if (query.startDate) (filter.triggeredAt as Record<string, Date>).$gte = query.startDate;
    if (query.endDate) (filter.triggeredAt as Record<string, Date>).$lte = query.endDate;
  }

  const [alerts, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ triggeredAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    collection.countDocuments(filter),
  ]);

  return {
    alerts,
    total,
    hasMore: offset + alerts.length < total,
  };
}

/**
 * Update alert status (acknowledge/resolve)
 */
export async function updateAlertStatus(
  alertId: string,
  status: AlertHistoryStatus,
  userId: string
): Promise<boolean> {
  const collection = await getAlertHistoryCollection();
  const now = new Date();

  const updateData: Record<string, unknown> = { status, updatedAt: now };

  if (status === 'acknowledged') {
    updateData.acknowledgedBy = userId;
    updateData.acknowledgedAt = now;
  }

  if (status === 'resolved') {
    updateData.resolvedBy = userId;
    updateData.resolvedAt = now;
  }

  if (status === 'auto_resolved') {
    updateData.autoResolvedAt = now;
  }

  const result = await collection.updateOne(
    { alertId },
    { $set: updateData }
  );

  return result.modifiedCount > 0;
}

/**
 * Get alert summary stats
 */
export async function getAlertStats(days: number = 7): Promise<{
  totalAlerts: number;
  activeAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  alertsByRule: Array<{ ruleId: string; ruleName: string; count: number }>;
  alertsByDay: Array<{ date: string; count: number }>;
}> {
  const collection = await getAlertHistoryCollection();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [statusCounts, byRule, byDay] = await Promise.all([
    collection
      .aggregate([
        { $match: { triggeredAt: { $gte: cutoff } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .toArray(),

    collection
      .aggregate([
        { $match: { triggeredAt: { $gte: cutoff } } },
        {
          $group: {
            _id: { ruleId: '$ruleId', ruleName: '$ruleName' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray(),

    collection
      .aggregate([
        { $match: { triggeredAt: { $gte: cutoff } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$triggeredAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
  ]);

  const statusMap = statusCounts.reduce(
    (acc, item) => {
      acc[item._id as string] = item.count;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    totalAlerts: (statusMap.active || 0) + (statusMap.acknowledged || 0) + (statusMap.resolved || 0),
    activeAlerts: statusMap.active || 0,
    acknowledgedAlerts: statusMap.acknowledged || 0,
    resolvedAlerts: statusMap.resolved || 0,
    alertsByRule: byRule.map((r) => ({
      ruleId: r._id.ruleId,
      ruleName: r._id.ruleName,
      count: r.count,
    })),
    alertsByDay: byDay.map((d) => ({
      date: d._id as string,
      count: d.count,
    })),
  };
}
