/**
 * Health Check Endpoint
 *
 * GET /api/health
 * Returns the health status of the application
 */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { COLLECTIONS } from '@/lib/database/schema';
import { getRuntimeConfig } from '@/lib/runtime/mode';

const START_TIME = Date.now();

export const dynamic = 'force-dynamic';

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: 'ok' | 'error';
    forms: number;
    workflows: number;
    lastSubmission?: string;
  };
  version: string;
  uptime: number;
  timestamp: string;
  runtime: {
    mode: 'standalone' | 'connected';
  };
}

/**
 * GET /api/health
 * Perform health check
 */
export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  const checks: HealthCheckResponse['checks'] = {
    database: 'error',
    forms: 0,
    workflows: 0,
  };

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy';

  try {
    // Check database connection
    const db = await getDatabase();
    await db.admin().ping();
    checks.database = 'ok';
    overallStatus = 'healthy';

    // Count forms
    try {
      const formsCollection = db.collection(COLLECTIONS.FORMS);
      checks.forms = await formsCollection.countDocuments({ isPublished: true });
    } catch (error) {
      console.error('[Health] Error counting forms:', error);
      overallStatus = 'degraded';
    }

    // Count workflows
    try {
      const workflowsCollection = db.collection(COLLECTIONS.WORKFLOWS);
      checks.workflows = await workflowsCollection.countDocuments({ status: 'active' });
    } catch (error) {
      console.error('[Health] Error counting workflows:', error);
      overallStatus = 'degraded';
    }

    // Get last submission timestamp
    try {
      const submissionsCollection = db.collection(COLLECTIONS.FORM_SUBMISSIONS);
      const lastSubmission = await submissionsCollection
        .findOne(
          {},
          { sort: { submittedAt: -1 }, projection: { submittedAt: 1 } }
        );
      
      if (lastSubmission?.submittedAt) {
        checks.lastSubmission = new Date(lastSubmission.submittedAt).toISOString();
      }
    } catch (error) {
      // Non-critical, don't degrade status
      console.warn('[Health] Error getting last submission:', error);
    }
  } catch (error) {
    console.error('[Health] Database check failed:', error);
    overallStatus = 'unhealthy';
  }

  const runtime = getRuntimeConfig();
  const uptime = Math.floor((Date.now() - START_TIME) / 1000);

  const response: HealthCheckResponse = {
    status: overallStatus,
    checks,
    version: runtime.version || '1.0.0',
    uptime,
    timestamp: new Date().toISOString(),
    runtime: {
      mode: runtime.mode,
    },
  };

  // Return appropriate HTTP status
  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return NextResponse.json(response, { status: statusCode });
}
