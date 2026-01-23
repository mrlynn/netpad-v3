/**
 * POST /api/billing/usage
 *
 * Increment usage counters for AI features.
 * Returns whether the operation was allowed based on limits.
 *
 * This endpoint supports both:
 * - Cloud mode: Uses the cloud extension's usage service
 * - Self-hosted mode: Uses the built-in usage service
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUsageService, loadExtensions, extensionsLoaded } from '@/lib/extensions';
import * as localUsageService from '@/lib/platform/usageService';

export async function POST(req: NextRequest) {
  try {
    // Ensure extensions are loaded
    if (!extensionsLoaded()) {
      await loadExtensions();
    }

    // Get session
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orgId, metric, amount = 1, tokensUsed } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    if (!metric || !['generations', 'agentSessions', 'processingRuns'].includes(metric)) {
      return NextResponse.json({ error: 'Invalid metric' }, { status: 400 });
    }

    // Try to use cloud extension usage service if available
    const cloudUsage = getUsageService();
    if (cloudUsage) {
      const result = await cloudUsage.incrementAIUsage(orgId, metric, amount, tokensUsed);
      return NextResponse.json(result);
    }

    // Fall back to local usage service
    const result = await localUsageService.incrementAIUsage(orgId, metric, amount, tokensUsed);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] /api/billing/usage POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/billing/usage
 *
 * Check current usage without incrementing.
 */
export async function GET(req: NextRequest) {
  try {
    // Ensure extensions are loaded
    if (!extensionsLoaded()) {
      await loadExtensions();
    }

    // Get session
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    const metric = searchParams.get('metric') as 'generations' | 'agentSessions' | 'processingRuns';

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    if (!metric || !['generations', 'agentSessions', 'processingRuns'].includes(metric)) {
      return NextResponse.json({ error: 'Invalid metric' }, { status: 400 });
    }

    // Try to use cloud extension usage service if available
    const cloudUsage = getUsageService();
    if (cloudUsage) {
      const result = await cloudUsage.checkAILimit(orgId, metric);
      return NextResponse.json(result);
    }

    // Fall back to local usage service
    const result = await localUsageService.checkAILimit(orgId, metric);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] /api/billing/usage GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
