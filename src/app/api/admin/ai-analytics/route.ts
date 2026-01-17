/**
 * Admin AI Analytics API
 *
 * GET: Get AI usage statistics for the admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import {
  getAIUsageSummary,
  getAIUsageByDay,
  getAIUsageByFeature,
  getAIUsageByModel,
  getTopOrgsByUsage,
  getErrorStats,
  getEfficiencyMetrics,
  getHourlyUsage,
  getModelPerformance,
  getCostProjection,
  getFeatureAdoption,
  getQuotaMetrics,
  getUserJourneys,
  detectCostAnomalies,
  getQualityMetrics,
  getComparativeMetrics,
} from '@/lib/ai/aiAnalytics';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin access
    const isAdmin = await isPlatformAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30', 10);
    const orgId = searchParams.get('orgId') || undefined;

    // Validate days parameter
    const validDays = Math.min(Math.max(days, 1), 365);

    // Parse optional Phase 3 parameters
    const comparePeriod = searchParams.get('comparePeriod'); // e.g., "30" for 30-day comparison
    const includeJourneys = searchParams.get('includeJourneys') === 'true';
    const includeAnomalies = searchParams.get('includeAnomalies') === 'true';
    const includeQuality = searchParams.get('includeQuality') === 'true';

    // Fetch all analytics in parallel
    const [
      summary,
      byDay,
      byFeature,
      byModel,
      topOrgs,
      errorStats,
      efficiency,
      hourly,
      modelPerformance,
      costProjection,
      featureAdoption,
      quotaMetrics,
      userJourneys,
      costAnomalies,
      qualityMetrics,
      comparative,
    ] = await Promise.all([
      getAIUsageSummary(validDays, orgId),
      getAIUsageByDay(validDays, orgId),
      getAIUsageByFeature(validDays, orgId),
      getAIUsageByModel(validDays, orgId),
      orgId ? Promise.resolve([]) : getTopOrgsByUsage(validDays, 10),
      getErrorStats(validDays, orgId),
      getEfficiencyMetrics(validDays, orgId),
      getHourlyUsage(validDays, orgId),
      getModelPerformance(validDays, orgId),
      getCostProjection(validDays, orgId),
      getFeatureAdoption(validDays, orgId),
      orgId ? getQuotaMetrics(validDays, orgId) : Promise.resolve([]), // Only for specific orgs
      includeJourneys ? getUserJourneys(validDays, orgId) : Promise.resolve([]),
      includeAnomalies ? detectCostAnomalies(validDays, orgId) : Promise.resolve([]),
      includeQuality ? getQualityMetrics(validDays, orgId) : Promise.resolve([]),
      comparePeriod
        ? getComparativeMetrics(parseInt(comparePeriod, 10), validDays, orgId)
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      success: true,
      period: {
        days: validDays,
        startDate: new Date(Date.now() - validDays * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      },
      summary,
      trends: byDay,
      byFeature,
      byModel,
      topOrganizations: topOrgs,
      errors: errorStats,
      efficiency,
      hourly,
      modelPerformance,
      costProjection,
      featureAdoption,
      quotaMetrics,
      userJourneys: includeJourneys ? userJourneys : undefined,
      costAnomalies: includeAnomalies ? costAnomalies : undefined,
      qualityMetrics: includeQuality ? qualityMetrics : undefined,
      comparative: comparative || undefined,
    });
  } catch (error) {
    console.error('[Admin AI Analytics] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch AI analytics' }, { status: 500 });
  }
}
