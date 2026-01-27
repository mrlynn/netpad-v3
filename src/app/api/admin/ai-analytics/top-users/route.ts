/**
 * Admin AI Analytics - Top Users API
 *
 * GET: Get top users by AI usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { getTopUsersByUsage } from '@/lib/ai/aiAnalytics';

export const dynamic = 'force-dynamic';

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
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Validate parameters
    const validDays = Math.min(Math.max(days, 1), 365);
    const validLimit = Math.min(Math.max(limit, 1), 100);

    const topUsers = await getTopUsersByUsage(validDays, validLimit);

    return NextResponse.json({
      success: true,
      period: {
        days: validDays,
      },
      users: topUsers,
    });
  } catch (error) {
    console.error('[Admin AI Analytics Top Users] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch top users' }, { status: 500 });
  }
}
