import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { getWaitlistStats } from '@/lib/platform/waitlist';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check admin permission
    const isAdmin = await isPlatformAdmin(session.userId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const stats = await getWaitlistStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Admin Waitlist Stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waitlist stats' },
      { status: 500 }
    );
  }
}
