/**
 * Admin MCP Analytics API
 *
 * GET: Get MCP server usage statistics for the admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { getPlatformMCPStats } from '@/lib/platform/mcpAnalyticsDbOps';

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

    // Fetch platform-wide MCP stats
    const platformStats = await getPlatformMCPStats();

    return NextResponse.json({
      success: true,
      stats: platformStats,
    });
  } catch (error) {
    console.error('[Admin MCP Analytics] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch MCP analytics' }, { status: 500 });
  }
}
