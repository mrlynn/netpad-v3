/**
 * Metrics API Endpoint
 *
 * GET /api/metrics
 * Returns application metrics in JSON or Prometheus format
 *
 * Query params:
 * - format: 'json' (default) or 'prometheus'
 */

import { NextRequest, NextResponse } from 'next/server';
import { collectMetrics, formatPrometheusMetrics, getCounters } from '@/lib/monitoring/metrics';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get('format') || 'json';

    // Collect metrics
    const metrics = await collectMetrics();

    if (format === 'prometheus') {
      // Return Prometheus text format
      const prometheusText = formatPrometheusMetrics(metrics);
      return new NextResponse(prometheusText, {
        headers: {
          'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        },
      });
    }

    // Return JSON format with additional counters
    const counters = getCounters();

    return NextResponse.json({
      metrics,
      counters,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Metrics API] Error collecting metrics:', error);
    return NextResponse.json(
      {
        error: 'Failed to collect metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
