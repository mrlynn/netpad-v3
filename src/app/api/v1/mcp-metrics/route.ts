/**
 * MCP Metrics Ingestion Endpoint
 *
 * POST /api/v1/mcp-metrics
 *
 * Receives batched metrics from the MCP server remote and stores them
 * for analytics and reporting.
 *
 * This endpoint does NOT require authentication - the MCP server sends
 * metrics on behalf of multiple organizations. The organizationId is
 * included in each metric entry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ingestMCPMetricsLocal } from '@/lib/platform/mcpAnalyticsDbOps';

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

export async function POST(request: NextRequest) {
  try {
    // Parse the metrics batch
    const batch: MCPMetricsBatch = await request.json();

    // Validate basic structure
    if (!batch || !Array.isArray(batch.metrics)) {
      return NextResponse.json(
        { error: 'Invalid batch format', code: 'INVALID_BATCH' },
        { status: 400 }
      );
    }

    console.log('[MCP Metrics] Received batch:', {
      serverVersion: batch.serverVersion,
      environment: batch.environment,
      metricsCount: batch.metrics.length,
    });

    // Use local implementation - works for both cloud and self-hosted
    // The cloud-features service wraps this same implementation
    await ingestMCPMetricsLocal(batch);

    return NextResponse.json({
      success: true,
      processed: batch.metrics.length,
    });
  } catch (error) {
    console.error('[MCP Metrics] Error processing batch:', error);
    return NextResponse.json(
      {
        error: 'Failed to process metrics',
        code: 'PROCESSING_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Health check for the metrics endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/v1/mcp-metrics',
    description: 'MCP server metrics ingestion endpoint',
  });
}
