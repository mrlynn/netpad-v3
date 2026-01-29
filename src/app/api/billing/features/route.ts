/**
 * GET /api/billing/features
 *
 * Returns the feature access and usage for an organization.
 * Used by the useFeatureGate hook to check access client-side.
 * Includes cluster tier for informational purposes.
 *
 * IMPORTANT: As of the Knowledge-Guided Conversational Forms update,
 * RAG features no longer require M10+ clusters. The only gate is the
 * subscription tier (PRO, TEAMS, or ENTERPRISE).
 *
 * Deployment Mode Support:
 * - 'cloud': RAG requires PRO/TEAMS/ENTERPRISE subscription (any cluster tier)
 * - 'self-hosted': RAG available to all subscription tiers (user manages MongoDB)
 *
 * This endpoint supports both:
 * - Cloud mode: Uses the cloud extension's usage service
 * - Self-hosted mode: Uses the built-in usage service
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getClusterTier,
  getDeploymentMode,
  isSelfHosted,
  getMinVectorSearchTier,
} from '@/lib/platform/clusterChecks';
import { getSession } from '@/lib/auth/session';
import { getTierFeaturesForDeployment } from '@/types/platform';
import { getUsageService, loadExtensions, extensionsLoaded } from '@/lib/extensions';
import * as localUsageService from '@/lib/platform/usageService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get('orgId');

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

    // Get orgId from query params
    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId parameter' }, { status: 400 });
    }

    const deploymentMode = getDeploymentMode();

    // Try to use cloud extension usage service if available, but only if configured
    const cloudUsage = getUsageService();

    // Always use local usage service - cloud extension service requires configuration
    // that may not be set up in all environments
    const useLocalService = true; // Force local service for now

    // Fetch subscription features and cluster tier in parallel
    console.log('[API] /api/billing/features - Fetching data for orgId:', orgId);
    const [access, clusterTier] = await Promise.all([
      localUsageService.getFeatureAccess(orgId),
      getClusterTier(orgId),
    ]);

    console.log('[API] /api/billing/features - Access data:', {
      tier: access.tier,
      aiFeatures: access.aiFeatures?.length || 0,
      platformFeatures: access.platformFeatures?.length || 0,
      clusterTier,
      deploymentMode,
    });

    // In self-hosted mode, adjust available features
    // RAG features become available to all tiers (user manages Atlas Local)
    let adjustedAccess = access;
    if (isSelfHosted() && access.tier) {
      const adjustedFeatures = getTierFeaturesForDeployment(
        access.tier as 'free' | 'pro' | 'team' | 'enterprise',
        deploymentMode
      );
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
    console.error('[API] /api/billing/features error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[API] /api/billing/features orgId:', orgId);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
