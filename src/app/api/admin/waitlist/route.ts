import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { findUserById, isPlatformAdmin } from '@/lib/platform/users';
import { getWaitlistEntries, WaitlistQueryOptions } from '@/lib/platform/waitlist';

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

    // Parse query params
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || undefined;
    const sortBy = (searchParams.get('sortBy') as 'appliedAt' | 'email') || 'appliedAt';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    const options: WaitlistQueryOptions = {
      status: status === 'all' ? 'all' : (status as 'pending' | 'approved' | 'rejected'),
      limit,
      offset,
      search,
      sortBy,
      sortOrder,
    };

    const { entries, total } = await getWaitlistEntries(options);

    return NextResponse.json({
      entries,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Admin Waitlist] Error fetching entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waitlist entries' },
      { status: 500 }
    );
  }
}
