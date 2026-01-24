/**
 * Observability Cron Job
 *
 * Runs every 5 minutes to:
 * 1. Check health of all services
 * 2. Evaluate all enabled alert rules
 * 3. Aggregate API metrics (hourly)
 *
 * Protected by CRON_SECRET to prevent unauthorized access
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkAllServices } from '@/lib/platform/healthService';
import { evaluateAllRules } from '@/lib/platform/alertService';
import { aggregateHourlyMetrics } from '@/lib/api/metricsMiddleware';

// Vercel Cron jobs send this header
const CRON_SECRET = process.env.CRON_SECRET;

function verifyCronRequest(request: NextRequest): boolean {
  // In development, allow all requests
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Vercel sends this header for cron jobs
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${CRON_SECRET}`) {
    return true;
  }

  // Also check for Vercel's cron signature
  const vercelCron = request.headers.get('x-vercel-cron');
  if (vercelCron) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron request
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const results: {
    healthChecks?: { servicesChecked: number; statuses: Record<string, string> };
    alertEvaluation?: { evaluated: number; triggered: number };
    metricsAggregation?: { period: string; endpointsProcessed: number; samplesProcessed: number };
    errors: string[];
  } = {
    errors: [],
  };

  // 1. Run health checks
  try {
    const healthResults = await checkAllServices();
    results.healthChecks = {
      servicesChecked: healthResults.length,
      statuses: Object.fromEntries(
        healthResults.map((h) => [h.serviceName, h.status])
      ),
    };
    console.log('[Cron] Health checks completed:', results.healthChecks);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    results.errors.push(`Health checks failed: ${message}`);
    console.error('[Cron] Health checks failed:', error);
  }

  // 2. Evaluate alert rules
  try {
    const alertResults = await evaluateAllRules();
    results.alertEvaluation = {
      evaluated: alertResults.evaluated,
      triggered: alertResults.triggered,
    };
    console.log('[Cron] Alert evaluation completed:', results.alertEvaluation);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    results.errors.push(`Alert evaluation failed: ${message}`);
    console.error('[Cron] Alert evaluation failed:', error);
  }

  // 3. Aggregate API metrics
  try {
    const metricsResults = await aggregateHourlyMetrics();
    results.metricsAggregation = metricsResults;
    console.log('[Cron] Metrics aggregation completed:', results.metricsAggregation);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    results.errors.push(`Metrics aggregation failed: ${message}`);
    console.error('[Cron] Metrics aggregation failed:', error);
  }

  const duration = Date.now() - startTime;

  return NextResponse.json({
    success: results.errors.length === 0,
    timestamp: new Date().toISOString(),
    durationMs: duration,
    ...results,
  });
}
