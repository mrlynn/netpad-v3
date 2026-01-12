/**
 * GET /api/billing/features
 *
 * Returns the feature access and usage for an organization.
 * Used by the useFeatureGate hook to check access client-side.
 * Includes cluster tier for RAG feature gating.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFeatureAccess } from '@/lib/platform/billing';
import { getClusterTier } from '@/lib/platform/clusterChecks';
import { getSession } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    // Get session
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get orgId from query params
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId parameter' }, { status: 400 });
    }

    // TODO: Verify user has access to this org
    // For now, we'll trust the session

    // Fetch subscription features and cluster tier in parallel
    const [access, clusterTier] = await Promise.all([
      getFeatureAccess(orgId),
      getClusterTier(orgId),
    ]);

    return NextResponse.json({
      ...access,
      clusterTier,
    });
  } catch (error) {
    console.error('[API] /api/billing/features error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
