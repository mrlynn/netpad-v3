/**
 * GET /api/billing/features
 *
 * Returns the feature access and usage for an organization.
 * Used by the useFeatureGate hook to check access client-side.
 * Includes cluster tier for RAG feature gating.
 *
 * Deployment Mode Support:
 * - 'cloud': Standard tier-based gating (RAG requires Team+ and M10+)
 * - 'self-hosted': RAG features available to all tiers (with Atlas Local)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFeatureAccess } from '@/lib/platform/billing';
import {
  getClusterTier,
  getDeploymentMode,
  isSelfHosted,
  getMinVectorSearchTier,
} from '@/lib/platform/clusterChecks';
import { getSession } from '@/lib/auth/session';
import { getTierFeaturesForDeployment } from '@/types/platform';

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

    const deploymentMode = getDeploymentMode();

    // Fetch subscription features and cluster tier in parallel
    const [access, clusterTier] = await Promise.all([
      getFeatureAccess(orgId),
      getClusterTier(orgId),
    ]);

    // In self-hosted mode, adjust available features
    // RAG features become available to all tiers (user manages Atlas Local)
    let adjustedAccess = access;
    if (isSelfHosted() && access.tier) {
      const adjustedFeatures = getTierFeaturesForDeployment(access.tier, deploymentMode);
      adjustedAccess = {
        ...access,
        aiFeatures: adjustedFeatures.aiFeatures,
      };
    }

    // Determine effective cluster tier for RAG
    // In self-hosted mode with no provisioned cluster, assume LOCAL
    const effectiveClusterTier = isSelfHosted() && !clusterTier ? 'LOCAL' : clusterTier;

    return NextResponse.json({
      ...adjustedAccess,
      clusterTier: effectiveClusterTier,
      deploymentMode,
      minVectorSearchTier: getMinVectorSearchTier(),
      selfHostedRagEnabled: isSelfHosted(),
    });
  } catch (error) {
    console.error('[API] /api/billing/features error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
