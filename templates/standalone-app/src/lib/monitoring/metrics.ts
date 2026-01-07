/**
 * Metrics Collection Module
 *
 * Collects and exposes application metrics for monitoring.
 * Supports in-memory metrics and optional external integrations.
 */

import { COLLECTIONS, getCollection } from '../database/schema';

/**
 * Application metrics
 */
interface AppMetrics {
  // Counters
  submissions: {
    total: number;
    last24h: number;
    byStatus: Record<string, number>;
  };
  workflows: {
    executions: {
      total: number;
      last24h: number;
      byStatus: Record<string, number>;
    };
    successRate: number;
    avgDuration: number;
  };
  forms: {
    total: number;
    published: number;
  };
  // System
  system: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    nodeVersion: string;
  };
  // Timestamps
  collectedAt: string;
}

/**
 * In-memory counters for real-time tracking
 */
interface InMemoryCounters {
  requestsTotal: number;
  requestsByEndpoint: Record<string, number>;
  errorsTotal: number;
  errorsByType: Record<string, number>;
}

const counters: InMemoryCounters = {
  requestsTotal: 0,
  requestsByEndpoint: {},
  errorsTotal: 0,
  errorsByType: {},
};

const START_TIME = Date.now();

/**
 * Increment request counter
 */
export function trackRequest(endpoint: string): void {
  counters.requestsTotal++;
  counters.requestsByEndpoint[endpoint] = (counters.requestsByEndpoint[endpoint] || 0) + 1;
}

/**
 * Track an error
 */
export function trackError(errorType: string): void {
  counters.errorsTotal++;
  counters.errorsByType[errorType] = (counters.errorsByType[errorType] || 0) + 1;
}

/**
 * Get in-memory counters
 */
export function getCounters(): InMemoryCounters {
  return { ...counters };
}

/**
 * Collect all metrics
 */
export async function collectMetrics(): Promise<AppMetrics> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Collect submission metrics
  const submissionMetrics = await collectSubmissionMetrics(oneDayAgo);

  // Collect workflow metrics
  const workflowMetrics = await collectWorkflowMetrics(oneDayAgo);

  // Collect form metrics
  const formMetrics = await collectFormMetrics();

  return {
    submissions: submissionMetrics,
    workflows: workflowMetrics,
    forms: formMetrics,
    system: {
      uptime: Math.floor((Date.now() - START_TIME) / 1000),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
    },
    collectedAt: now.toISOString(),
  };
}

async function collectSubmissionMetrics(since: Date) {
  const collection = await getCollection(COLLECTIONS.FORM_SUBMISSIONS);

  const [total, last24h, statusAgg] = await Promise.all([
    collection.countDocuments(),
    collection.countDocuments({ createdAt: { $gte: since } }),
    collection
      .aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
      .toArray(),
  ]);

  const byStatus: Record<string, number> = {};
  for (const item of statusAgg) {
    byStatus[item._id || 'unknown'] = item.count;
  }

  return { total, last24h, byStatus };
}

async function collectWorkflowMetrics(since: Date) {
  const collection = await getCollection(COLLECTIONS.WORKFLOW_EXECUTIONS);

  const [total, last24h, statusAgg, durationAgg] = await Promise.all([
    collection.countDocuments(),
    collection.countDocuments({ startedAt: { $gte: since } }),
    collection
      .aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
      .toArray(),
    collection
      .aggregate([
        { $match: { status: 'completed', duration: { $exists: true } } },
        { $group: { _id: null, avgDuration: { $avg: '$duration' } } },
      ])
      .toArray(),
  ]);

  const byStatus: Record<string, number> = {};
  for (const item of statusAgg) {
    byStatus[item._id || 'unknown'] = item.count;
  }

  const completed = byStatus['completed'] || 0;
  const failed = byStatus['failed'] || 0;
  const successRate = total > 0 ? (completed / (completed + failed)) * 100 : 100;
  const avgDuration = durationAgg[0]?.avgDuration || 0;

  return {
    executions: { total, last24h, byStatus },
    successRate: Math.round(successRate * 100) / 100,
    avgDuration: Math.round(avgDuration),
  };
}

async function collectFormMetrics() {
  const collection = await getCollection(COLLECTIONS.FORMS);

  const [total, published] = await Promise.all([
    collection.countDocuments(),
    collection.countDocuments({ isPublished: true }),
  ]);

  return { total, published };
}

/**
 * Format metrics as Prometheus text format
 */
export function formatPrometheusMetrics(metrics: AppMetrics): string {
  const lines: string[] = [];

  // Helper to add a metric
  const addMetric = (name: string, help: string, type: string, value: number, labels?: string) => {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} ${type}`);
    const labelStr = labels ? `{${labels}}` : '';
    lines.push(`${name}${labelStr} ${value}`);
  };

  // Submissions
  addMetric('netpad_submissions_total', 'Total form submissions', 'counter', metrics.submissions.total);
  addMetric('netpad_submissions_24h', 'Form submissions in last 24 hours', 'gauge', metrics.submissions.last24h);

  for (const [status, count] of Object.entries(metrics.submissions.byStatus)) {
    lines.push(`netpad_submissions_by_status{status="${status}"} ${count}`);
  }

  // Workflows
  addMetric('netpad_workflow_executions_total', 'Total workflow executions', 'counter', metrics.workflows.executions.total);
  addMetric('netpad_workflow_executions_24h', 'Workflow executions in last 24 hours', 'gauge', metrics.workflows.executions.last24h);
  addMetric('netpad_workflow_success_rate', 'Workflow success rate percentage', 'gauge', metrics.workflows.successRate);
  addMetric('netpad_workflow_avg_duration_ms', 'Average workflow duration in milliseconds', 'gauge', metrics.workflows.avgDuration);

  for (const [status, count] of Object.entries(metrics.workflows.executions.byStatus)) {
    lines.push(`netpad_workflow_executions_by_status{status="${status}"} ${count}`);
  }

  // Forms
  addMetric('netpad_forms_total', 'Total forms', 'gauge', metrics.forms.total);
  addMetric('netpad_forms_published', 'Published forms', 'gauge', metrics.forms.published);

  // System
  addMetric('netpad_uptime_seconds', 'Application uptime in seconds', 'gauge', metrics.system.uptime);
  addMetric('netpad_memory_heap_used_bytes', 'Heap memory used', 'gauge', metrics.system.memoryUsage.heapUsed);
  addMetric('netpad_memory_heap_total_bytes', 'Heap memory total', 'gauge', metrics.system.memoryUsage.heapTotal);
  addMetric('netpad_memory_rss_bytes', 'Resident set size', 'gauge', metrics.system.memoryUsage.rss);

  // In-memory counters
  addMetric('netpad_requests_total', 'Total HTTP requests', 'counter', counters.requestsTotal);
  addMetric('netpad_errors_total', 'Total errors', 'counter', counters.errorsTotal);

  return lines.join('\n');
}

/**
 * External monitoring service configuration
 */
interface ExternalMonitoringConfig {
  enabled: boolean;
  service?: 'datadog' | 'newrelic' | 'custom';
  apiKey?: string;
  endpoint?: string;
}

/**
 * Get external monitoring configuration from environment
 */
export function getMonitoringConfig(): ExternalMonitoringConfig {
  const enabled = process.env.MONITORING_ENABLED === 'true';
  const service = process.env.MONITORING_SERVICE as ExternalMonitoringConfig['service'];
  const apiKey = process.env.MONITORING_API_KEY;
  const endpoint = process.env.MONITORING_ENDPOINT;

  return { enabled, service, apiKey, endpoint };
}

/**
 * Send metrics to external monitoring service (if configured)
 */
export async function pushMetrics(metrics: AppMetrics): Promise<void> {
  const config = getMonitoringConfig();

  if (!config.enabled) {
    return;
  }

  try {
    switch (config.service) {
      case 'datadog':
        await pushToDatadog(metrics, config);
        break;
      case 'newrelic':
        await pushToNewRelic(metrics, config);
        break;
      case 'custom':
        await pushToCustomEndpoint(metrics, config);
        break;
      default:
        console.warn('[Monitoring] Unknown monitoring service:', config.service);
    }
  } catch (error) {
    console.error('[Monitoring] Failed to push metrics:', error);
  }
}

async function pushToDatadog(metrics: AppMetrics, config: ExternalMonitoringConfig) {
  if (!config.apiKey) {
    console.warn('[Monitoring] Datadog API key not configured');
    return;
  }

  const series = [
    {
      metric: 'netpad.submissions.total',
      type: 'count',
      points: [[Math.floor(Date.now() / 1000), metrics.submissions.total]],
    },
    {
      metric: 'netpad.workflows.success_rate',
      type: 'gauge',
      points: [[Math.floor(Date.now() / 1000), metrics.workflows.successRate]],
    },
  ];

  await fetch('https://api.datadoghq.com/api/v1/series', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'DD-API-KEY': config.apiKey,
    },
    body: JSON.stringify({ series }),
  });
}

async function pushToNewRelic(metrics: AppMetrics, config: ExternalMonitoringConfig) {
  if (!config.apiKey) {
    console.warn('[Monitoring] New Relic API key not configured');
    return;
  }

  const events = [
    {
      eventType: 'NetpadMetrics',
      submissionsTotal: metrics.submissions.total,
      submissionsLast24h: metrics.submissions.last24h,
      workflowExecutionsTotal: metrics.workflows.executions.total,
      workflowSuccessRate: metrics.workflows.successRate,
      formsTotal: metrics.forms.total,
      uptimeSeconds: metrics.system.uptime,
    },
  ];

  await fetch('https://insights-collector.newrelic.com/v1/accounts/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Insert-Key': config.apiKey,
    },
    body: JSON.stringify(events),
  });
}

async function pushToCustomEndpoint(metrics: AppMetrics, config: ExternalMonitoringConfig) {
  if (!config.endpoint) {
    console.warn('[Monitoring] Custom endpoint not configured');
    return;
  }

  await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
    },
    body: JSON.stringify(metrics),
  });
}
