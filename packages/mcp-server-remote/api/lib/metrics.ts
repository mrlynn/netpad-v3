/**
 * MCP Server Metrics Collector
 *
 * Collects usage metrics from the MCP server and batches them for reporting
 * to the NetPad API. Designed for Vercel serverless environment.
 */

// ============================================
// Types
// ============================================

export interface MCPRequestMetric {
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

export interface MCPMetricsBatch {
  serverVersion: string;
  environment: string;
  collectedAt: number;
  metrics: MCPRequestMetric[];
}

// ============================================
// Configuration
// ============================================

// In serverless environments, flush more aggressively since memory is ephemeral
const BATCH_SIZE = 10; // Reduced from 50 for serverless
const FLUSH_INTERVAL_MS = 10000; // 10 seconds (reduced from 30)

// In-memory buffer for metrics (serverless-friendly)
let metricsBuffer: MCPRequestMetric[] = [];
let lastFlushTime = Date.now();

/**
 * Get the NetPad API base URL
 */
function getNetPadApiUrl(): string {
  return process.env.NETPAD_API_URL || 'https://www.netpad.io';
}

/**
 * Get MCP server version from package or environment
 */
function getServerVersion(): string {
  return process.env.MCP_SERVER_VERSION || '1.4.2';
}

/**
 * Get environment (production, staging, development)
 */
function getEnvironment(): string {
  return process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
}

// ============================================
// Metrics Collection
// ============================================

/**
 * Record a single MCP request metric
 */
export function recordMetric(metric: Omit<MCPRequestMetric, 'timestamp'>): void {
  const fullMetric: MCPRequestMetric = {
    ...metric,
    timestamp: Date.now(),
  };

  metricsBuffer.push(fullMetric);
  console.log('[Metrics] Recorded:', {
    method: metric.method,
    tool: metric.tool,
    authMethod: metric.authMethod,
    durationMs: metric.durationMs,
    statusCode: metric.statusCode,
  });

  // Check if we should flush
  if (metricsBuffer.length >= BATCH_SIZE) {
    flushMetrics().catch((err) => {
      console.error('[Metrics] Flush error:', err);
    });
  }
}

/**
 * Create a metrics context for timing a request
 */
export function startMetricsContext(): { startTime: number } {
  return { startTime: Date.now() };
}

/**
 * Calculate duration from metrics context
 */
export function getDuration(context: { startTime: number }): number {
  return Date.now() - context.startTime;
}

// ============================================
// Metrics Flushing
// ============================================

/**
 * Flush accumulated metrics to the NetPad API
 */
export async function flushMetrics(): Promise<void> {
  if (metricsBuffer.length === 0) {
    return;
  }

  // Swap buffer to avoid race conditions
  const metricsToFlush = metricsBuffer;
  metricsBuffer = [];
  lastFlushTime = Date.now();

  const batch: MCPMetricsBatch = {
    serverVersion: getServerVersion(),
    environment: getEnvironment(),
    collectedAt: Date.now(),
    metrics: metricsToFlush,
  };

  try {
    const netpadUrl = getNetPadApiUrl();
    const response = await fetch(`${netpadUrl}/api/v1/mcp-metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MCP-Server-Version': getServerVersion(),
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      // Put metrics back on failure (at the front)
      metricsBuffer = [...metricsToFlush, ...metricsBuffer];
      console.error('[Metrics] Failed to flush:', response.status, await response.text());
    } else {
      console.log('[Metrics] Flushed', metricsToFlush.length, 'metrics');
    }
  } catch (error) {
    // Put metrics back on network error
    metricsBuffer = [...metricsToFlush, ...metricsBuffer];
    console.error('[Metrics] Network error during flush:', error);
  }
}

/**
 * Force flush all metrics (useful before process exit)
 */
export async function forceFlush(): Promise<void> {
  await flushMetrics();
}

// ============================================
// Helper Functions
// ============================================

/**
 * Extract tool name from JSON-RPC request body
 */
export function extractToolFromBody(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const request = body as Record<string, unknown>;

  // JSON-RPC format: { method: 'tools/call', params: { name: 'tool_name' } }
  if (request.method === 'tools/call' && request.params && typeof request.params === 'object') {
    const params = request.params as Record<string, unknown>;
    if (typeof params.name === 'string') {
      return params.name;
    }
  }

  // Also check for direct method calls
  if (typeof request.method === 'string' && request.method !== 'tools/call') {
    return request.method;
  }

  return undefined;
}

/**
 * Get buffered metrics count (for testing/debugging)
 */
export function getBufferedMetricsCount(): number {
  return metricsBuffer.length;
}

/**
 * Get time since last flush (for testing/debugging)
 */
export function getTimeSinceLastFlush(): number {
  return Date.now() - lastFlushTime;
}
