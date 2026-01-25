/**
 * MCP Analytics Database Operations
 *
 * Handles storage and retrieval of MCP usage metrics.
 * Works for both cloud and self-hosted deployments.
 */

import { getUsageCollection, getOrganizationsCollection } from './db';

// ============================================
// Types
// ============================================

interface MCPRequestMetric {
  timestamp: number;
  organizationId?: string;
  userId?: string;
  method: 'GET' | 'POST';
  tool?: string;
  authMethod: 'oauth' | 'api_key' | 'none';
  authSuccess: boolean;
  durationMs: number;
  statusCode: number;
  errorCode?: string;
  sessionId?: string;
}

interface MCPMetricsBatch {
  serverVersion: string;
  environment: string;
  collectedAt: number;
  metrics: MCPRequestMetric[];
}

export interface MCPUsageSummary {
  requests: {
    total: number;
    byMethod: { get: number; post: number };
    successRate: number;
  };
  tools: {
    total: number;
    topTools: Array<{ name: string; count: number }>;
  };
  auth: {
    oauthCount: number;
    apiKeyCount: number;
    failureCount: number;
    failureRate: number;
  };
  performance: {
    avgDurationMs: number;
    totalDurationMs: number;
  };
}

// ============================================
// Helpers
// ============================================

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getPeriodFromTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// ============================================
// Ingestion (Local Implementation)
// ============================================

/**
 * Ingest MCP metrics batch - local implementation
 * This is used for self-hosted deployments and can be called by the cloud service
 */
export async function ingestMCPMetricsLocal(batch: MCPMetricsBatch): Promise<void> {
  const collection = await getUsageCollection();

  console.log('[MCPAnalytics] Ingesting batch locally:', {
    serverVersion: batch.serverVersion,
    environment: batch.environment,
    metricsCount: batch.metrics.length,
  });

  // Group metrics by organization and period
  const groupedMetrics = new Map<string, MCPRequestMetric[]>();

  for (const metric of batch.metrics) {
    if (!metric.organizationId) {
      // Skip metrics without organization (e.g., failed auth before org identified)
      continue;
    }

    const period = getPeriodFromTimestamp(metric.timestamp);
    const key = `${metric.organizationId}:${period}`;

    if (!groupedMetrics.has(key)) {
      groupedMetrics.set(key, []);
    }
    groupedMetrics.get(key)!.push(metric);
  }

  // Process each organization's metrics
  for (const [key, metrics] of groupedMetrics) {
    const [orgId, period] = key.split(':');

    // Aggregate metrics for this org/period
    const aggregated = {
      requests: metrics.length,
      get: metrics.filter((m) => m.method === 'GET').length,
      post: metrics.filter((m) => m.method === 'POST').length,
      oauth: metrics.filter((m) => m.authMethod === 'oauth').length,
      apiKey: metrics.filter((m) => m.authMethod === 'api_key').length,
      authFailures: metrics.filter((m) => !m.authSuccess).length,
      errors: metrics.filter((m) => m.statusCode >= 400).length,
      totalDurationMs: metrics.reduce((sum, m) => sum + m.durationMs, 0),
      byTool: {} as Record<string, number>,
    };

    // Count by tool
    for (const metric of metrics) {
      if (metric.tool) {
        // Sanitize tool name for MongoDB field path (replace dots with underscores)
        const safeTool = metric.tool.replace(/\./g, '_').replace(/\//g, '_');
        aggregated.byTool[safeTool] = (aggregated.byTool[safeTool] || 0) + 1;
      }
    }

    // Build MongoDB update
    const update: Record<string, number> = {
      'mcp.requests': aggregated.requests,
      'mcp.byMethod.get': aggregated.get,
      'mcp.byMethod.post': aggregated.post,
      'mcp.authMethods.oauth': aggregated.oauth,
      'mcp.authMethods.apiKey': aggregated.apiKey,
      'mcp.authFailures': aggregated.authFailures,
      'mcp.errors': aggregated.errors,
      'mcp.totalDurationMs': aggregated.totalDurationMs,
    };

    // Add tool counts
    for (const [tool, count] of Object.entries(aggregated.byTool)) {
      update[`mcp.byTool.${tool}`] = count;
    }

    // Upsert the usage record
    await collection.updateOne(
      { organizationId: orgId, period },
      {
        $inc: update,
        $set: { updatedAt: new Date() },
        $setOnInsert: {
          createdAt: new Date(),
          'forms.created': 0,
          'forms.active': 0,
          'submissions.total': 0,
          'submissions.byForm': {},
          'storage.filesBytes': 0,
          'storage.responsesBytes': 0,
          'ai.generations': 0,
          'ai.agentSessions': 0,
          'ai.processingRuns': 0,
          'ai.tokensUsed': 0,
          'workflows.executions': 0,
          'workflows.byWorkflow': {},
          'workflows.successfulExecutions': 0,
          'workflows.failedExecutions': 0,
        },
      },
      { upsert: true }
    );
  }

  // Track auth failures without organization
  const noOrgFailures = batch.metrics.filter((m) => !m.organizationId && !m.authSuccess);
  if (noOrgFailures.length > 0) {
    console.log('[MCPAnalytics] Auth failures without org:', noOrgFailures.length);
  }

  console.log('[MCPAnalytics] Batch processed:', {
    organizations: groupedMetrics.size,
    totalMetrics: batch.metrics.length,
  });
}

// ============================================
// Retrieval Functions
// ============================================

/**
 * Get MCP usage summary for an organization
 */
export async function getMCPUsageSummary(orgId: string, period?: string): Promise<MCPUsageSummary> {
  const collection = await getUsageCollection();
  const targetPeriod = period || getCurrentPeriod();

  const usage = await collection.findOne({ organizationId: orgId, period: targetPeriod });

  if (!usage || !usage.mcp) {
    return {
      requests: { total: 0, byMethod: { get: 0, post: 0 }, successRate: 100 },
      tools: { total: 0, topTools: [] },
      auth: { oauthCount: 0, apiKeyCount: 0, failureCount: 0, failureRate: 0 },
      performance: { avgDurationMs: 0, totalDurationMs: 0 },
    };
  }

  const mcp = usage.mcp as {
    requests?: number;
    byMethod?: { get: number; post: number };
    byTool?: Record<string, number>;
    authMethods?: { oauth: number; apiKey: number };
    authFailures?: number;
    errors?: number;
    totalDurationMs?: number;
  };

  const totalRequests = mcp.requests || 0;
  const totalTools = Object.keys(mcp.byTool || {}).length;
  const totalAuth = (mcp.authMethods?.oauth || 0) + (mcp.authMethods?.apiKey || 0);

  // Get top 10 tools
  const topTools = Object.entries(mcp.byTool || {})
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    requests: {
      total: totalRequests,
      byMethod: mcp.byMethod || { get: 0, post: 0 },
      successRate: totalRequests > 0
        ? Math.round(((totalRequests - (mcp.errors || 0)) / totalRequests) * 100)
        : 100,
    },
    tools: {
      total: totalTools,
      topTools,
    },
    auth: {
      oauthCount: mcp.authMethods?.oauth || 0,
      apiKeyCount: mcp.authMethods?.apiKey || 0,
      failureCount: mcp.authFailures || 0,
      failureRate: totalAuth > 0
        ? Math.round((mcp.authFailures || 0) / (totalAuth + (mcp.authFailures || 0)) * 100)
        : 0,
    },
    performance: {
      avgDurationMs: totalRequests > 0
        ? Math.round((mcp.totalDurationMs || 0) / totalRequests)
        : 0,
      totalDurationMs: mcp.totalDurationMs || 0,
    },
  };
}

/**
 * Get tool popularity rankings for an organization
 */
export async function getMCPToolPopularity(
  orgId: string,
  limit: number = 20
): Promise<Array<{ tool: string; count: number; percentage: number }>> {
  const collection = await getUsageCollection();
  const period = getCurrentPeriod();

  const usage = await collection.findOne({ organizationId: orgId, period });

  if (!usage || !usage.mcp?.byTool) {
    return [];
  }

  const totalRequests = usage.mcp.requests || 0;

  return Object.entries(usage.mcp.byTool as Record<string, number>)
    .map(([tool, count]) => ({
      tool,
      count,
      percentage: totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get platform-wide MCP stats (admin only)
 */
export async function getPlatformMCPStats(): Promise<{
  totalRequests: number;
  uniqueOrganizations: number;
  topTools: Array<{ name: string; count: number }>;
  errorRate: number;
}> {
  const collection = await getUsageCollection();
  const period = getCurrentPeriod();

  // Aggregate across all organizations for current period
  const pipeline = [
    { $match: { period, 'mcp.requests': { $gt: 0 } } },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: '$mcp.requests' },
        totalErrors: { $sum: '$mcp.errors' },
        uniqueOrganizations: { $sum: 1 },
        allTools: { $push: '$mcp.byTool' },
      },
    },
  ];

  const results = await collection.aggregate(pipeline).toArray();

  if (results.length === 0) {
    return {
      totalRequests: 0,
      uniqueOrganizations: 0,
      topTools: [],
      errorRate: 0,
    };
  }

  const result = results[0];

  // Merge all tool counts
  const toolCounts: Record<string, number> = {};
  for (const toolMap of result.allTools || []) {
    if (toolMap && typeof toolMap === 'object') {
      for (const [tool, count] of Object.entries(toolMap)) {
        toolCounts[tool] = (toolCounts[tool] || 0) + (count as number);
      }
    }
  }

  const topTools = Object.entries(toolCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalRequests: result.totalRequests || 0,
    uniqueOrganizations: result.uniqueOrganizations || 0,
    topTools,
    errorRate: result.totalRequests > 0
      ? Math.round((result.totalErrors / result.totalRequests) * 100)
      : 0,
  };
}

// ============================================
// Cloud-Features Database Operations Implementation
// ============================================

/**
 * Creates database operations for the cloud-features MCP analytics service
 * This wires up the cloud-features service to our MongoDB collections
 */
export function createMCPAnalyticsDatabaseOperations() {
  return {
    async getOrganization(orgId: string) {
      const orgsCollection = await getOrganizationsCollection();
      const org = await orgsCollection.findOne({ orgId });
      return org ? { orgId: org.orgId, name: org.name } : null;
    },

    async getMCPUsageRecord(orgId: string, period: string) {
      const collection = await getUsageCollection();
      const usage = await collection.findOne({ organizationId: orgId, period });

      if (!usage || !usage.mcp) {
        return null;
      }

      const mcp = usage.mcp as {
        requests?: number;
        byTool?: Record<string, number>;
        byMethod?: { get: number; post: number };
        authMethods?: { oauth: number; apiKey: number };
        authFailures?: number;
        errors?: number;
        totalDurationMs?: number;
      };

      return {
        requests: mcp.requests || 0,
        byTool: mcp.byTool || {},
        byMethod: mcp.byMethod || { get: 0, post: 0 },
        authMethods: mcp.authMethods || { oauth: 0, apiKey: 0 },
        authFailures: mcp.authFailures || 0,
        errors: mcp.errors || 0,
        totalDurationMs: mcp.totalDurationMs || 0,
        errorCodes: {}, // Would need separate tracking for detailed error codes
      };
    },

    async incrementMCPUsage(
      orgId: string,
      period: string,
      updates: Record<string, number>
    ) {
      const collection = await getUsageCollection();

      await collection.updateOne(
        { organizationId: orgId, period },
        {
          $inc: updates,
          $set: { updatedAt: new Date() },
          $setOnInsert: {
            createdAt: new Date(),
            'forms.created': 0,
            'forms.active': 0,
            'submissions.total': 0,
            'submissions.byForm': {},
            'storage.filesBytes': 0,
            'storage.responsesBytes': 0,
            'ai.generations': 0,
            'ai.agentSessions': 0,
            'ai.processingRuns': 0,
            'ai.tokensUsed': 0,
            'workflows.executions': 0,
            'workflows.byWorkflow': {},
            'workflows.successfulExecutions': 0,
            'workflows.failedExecutions': 0,
          },
        },
        { upsert: true }
      );
    },

    async aggregatePlatformMCPStats() {
      return getPlatformMCPStats();
    },
  };
}
