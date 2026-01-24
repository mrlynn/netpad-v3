/**
 * Admin Platform Statistics API
 *
 * GET: Aggregated platform statistics for the admin dashboard overview
 * Combines user, cluster, AI, and system metrics in a single call
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { getUsersCollection, getOrganizationsCollection, getPlatformDb } from '@/lib/platform/db';
import {
  getAIUsageSummary,
  getAIUsageByDay,
  getAIUsageByFeature,
  getCostProjection,
} from '@/lib/ai/aiAnalytics';

interface PlatformStats {
  users: {
    total: number;
    verified: number;
    active7Days: number;
    active30Days: number;
    newThisWeek: number;
    newThisMonth: number;
    byRole: { admin: number; support: number; regular: number };
    byAuth: { passkey: number; oauth: number; password: number };
    trend: number; // % change from previous period
  };
  organizations: {
    total: number;
    active7Days: number;
    active30Days: number;
    avgUsersPerOrg: number;
  };
  clusters: {
    total: number;
    ready: number;
    provisioning: number;
    failed: number;
    inactive30Days: number;
  };
  ai: {
    totalRequests30Days: number;
    totalTokens30Days: number;
    totalCostUsd30Days: number;
    avgLatencyMs: number;
    successRate: number;
    uniqueUsers: number;
    projectedMonthlyCost: number;
    topFeatures: Array<{ feature: string; requests: number; tokens: number }>;
    dailyTrend: Array<{ date: string; requests: number; tokens: number; costUsd: number }>;
  };
  system: {
    uptime: string;
    uptimeMs: number;
    memoryUsedMB: number;
    memoryTotalMB: number;
    nodeVersion: string;
    environment: string;
    extensionsLoaded: number;
  };
  content: {
    totalForms: number;
    totalWorkflows: number;
    totalApps: number;
    totalSubmissions: number;
  };
}

// Server start time for uptime calculation
const serverStartTime = Date.now();

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m ${seconds % 60}s`;
}

export async function GET() {
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

    const usersCollection = await getUsersCollection();
    const orgsCollection = await getOrganizationsCollection();
    const platformDb = await getPlatformDb();

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    // Fetch all data in parallel
    const [
      // User stats
      totalUsers,
      verifiedUsers,
      activeUsers7Days,
      activeUsers30Days,
      newUsersThisWeek,
      newUsersThisMonth,
      newUsersPreviousMonth,
      adminUsers,
      supportUsers,
      usersWithPasskeys,
      usersWithOAuth,

      // Organization stats
      totalOrgs,
      activeOrgs7Days,
      activeOrgs30Days,

      // Cluster stats
      clusterStats,

      // AI stats
      aiSummary,
      aiByDay,
      aiByFeature,
      aiProjection,

      // Content stats (from apps database if available)
      contentStats,
    ] = await Promise.all([
      // Users
      usersCollection.countDocuments({}),
      usersCollection.countDocuments({ emailVerified: true }),
      usersCollection.countDocuments({ lastLoginAt: { $gte: weekAgo } }),
      usersCollection.countDocuments({ lastLoginAt: { $gte: monthAgo } }),
      usersCollection.countDocuments({ createdAt: { $gte: weekAgo } }),
      usersCollection.countDocuments({ createdAt: { $gte: monthAgo } }),
      usersCollection.countDocuments({ createdAt: { $gte: twoMonthsAgo, $lt: monthAgo } }),
      usersCollection.countDocuments({ platformRole: 'admin' }),
      usersCollection.countDocuments({ platformRole: 'support' }),
      usersCollection.countDocuments({ 'passkeys.0': { $exists: true } }),
      usersCollection.countDocuments({ 'oauthConnections.0': { $exists: true } }),

      // Organizations
      orgsCollection.countDocuments({}),
      orgsCollection.countDocuments({ lastActivityAt: { $gte: weekAgo } }),
      orgsCollection.countDocuments({ lastActivityAt: { $gte: monthAgo } }),

      // Clusters
      platformDb
        .collection('provisioned_clusters')
        .aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              ready: { $sum: { $cond: [{ $eq: ['$status', 'ready'] }, 1, 0] } },
              provisioning: { $sum: { $cond: [{ $eq: ['$status', 'provisioning'] }, 1, 0] } },
              failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
              inactive30Days: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$status', 'ready'] },
                        { $lt: ['$lastActivityAt', monthAgo] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ])
        .toArray(),

      // AI Analytics
      getAIUsageSummary(30),
      getAIUsageByDay(14), // Last 14 days for trend chart
      getAIUsageByFeature(30),
      getCostProjection(30),

      // Content stats - aggregate across all org databases
      getContentStats(platformDb),
    ]);

    // Calculate user growth trend
    const userTrend =
      newUsersPreviousMonth > 0
        ? Math.round(((newUsersThisMonth - newUsersPreviousMonth) / newUsersPreviousMonth) * 100)
        : newUsersThisMonth > 0
          ? 100
          : 0;

    // Calculate users with password only (no passkey, no oauth)
    const passwordOnlyUsers = totalUsers - usersWithPasskeys - usersWithOAuth;

    // Process cluster stats
    const clusterData = clusterStats[0] || {
      total: 0,
      ready: 0,
      provisioning: 0,
      failed: 0,
      inactive30Days: 0,
    };

    // Memory usage
    const memUsage = process.memoryUsage();
    const uptime = Date.now() - serverStartTime;

    const stats: PlatformStats = {
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        active7Days: activeUsers7Days,
        active30Days: activeUsers30Days,
        newThisWeek: newUsersThisWeek,
        newThisMonth: newUsersThisMonth,
        byRole: {
          admin: adminUsers,
          support: supportUsers,
          regular: totalUsers - adminUsers - supportUsers,
        },
        byAuth: {
          passkey: usersWithPasskeys,
          oauth: usersWithOAuth,
          password: Math.max(0, passwordOnlyUsers),
        },
        trend: userTrend,
      },
      organizations: {
        total: totalOrgs,
        active7Days: activeOrgs7Days,
        active30Days: activeOrgs30Days,
        avgUsersPerOrg: totalOrgs > 0 ? Math.round((totalUsers / totalOrgs) * 10) / 10 : 0,
      },
      clusters: {
        total: clusterData.total,
        ready: clusterData.ready,
        provisioning: clusterData.provisioning,
        failed: clusterData.failed,
        inactive30Days: clusterData.inactive30Days,
      },
      ai: {
        totalRequests30Days: aiSummary.totalRequests,
        totalTokens30Days: aiSummary.totalTokens,
        totalCostUsd30Days: aiSummary.totalCostUsd,
        avgLatencyMs: aiSummary.avgLatencyMs,
        successRate: aiSummary.successRate,
        uniqueUsers: aiSummary.uniqueUsers,
        projectedMonthlyCost: aiProjection.projectedMonthlyCost,
        topFeatures: aiByFeature.slice(0, 5).map((f) => ({
          feature: f.feature,
          requests: f.requests,
          tokens: f.tokens,
        })),
        dailyTrend: aiByDay.map((d) => ({
          date: d.date,
          requests: d.requests,
          tokens: d.tokens,
          costUsd: d.costUsd,
        })),
      },
      system: {
        uptime: formatUptime(uptime),
        uptimeMs: uptime,
        memoryUsedMB: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
        memoryTotalMB: Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100,
        nodeVersion: process.version,
        environment: process.env.VERCEL ? 'vercel' : process.env.NODE_ENV || 'development',
        extensionsLoaded: 0, // Will be populated if extension registry is available
      },
      content: contentStats,
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
    });
  } catch (error) {
    console.error('[Admin Platform Stats] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch platform stats' }, { status: 500 });
  }
}

/**
 * Get content statistics from organization databases
 * This queries the platform db for aggregate content counts
 */
async function getContentStats(platformDb: ReturnType<typeof getPlatformDb> extends Promise<infer T> ? T : never): Promise<{
  totalForms: number;
  totalWorkflows: number;
  totalApps: number;
  totalSubmissions: number;
}> {
  try {
    // Try to get aggregate stats from a dedicated collection or calculate from metadata
    // For now, return estimates based on available data
    const orgsCollection = platformDb.collection('organizations');

    const aggregateResult = await orgsCollection
      .aggregate([
        {
          $group: {
            _id: null,
            totalForms: { $sum: { $ifNull: ['$stats.formCount', 0] } },
            totalWorkflows: { $sum: { $ifNull: ['$stats.workflowCount', 0] } },
            totalApps: { $sum: { $ifNull: ['$stats.appCount', 0] } },
            totalSubmissions: { $sum: { $ifNull: ['$stats.submissionCount', 0] } },
          },
        },
      ])
      .toArray();

    if (aggregateResult.length > 0) {
      return {
        totalForms: aggregateResult[0].totalForms || 0,
        totalWorkflows: aggregateResult[0].totalWorkflows || 0,
        totalApps: aggregateResult[0].totalApps || 0,
        totalSubmissions: aggregateResult[0].totalSubmissions || 0,
      };
    }

    return {
      totalForms: 0,
      totalWorkflows: 0,
      totalApps: 0,
      totalSubmissions: 0,
    };
  } catch (error) {
    console.error('[getContentStats] Error:', error);
    return {
      totalForms: 0,
      totalWorkflows: 0,
      totalApps: 0,
      totalSubmissions: 0,
    };
  }
}
