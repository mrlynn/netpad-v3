/**
 * Platform Admin Organizations API
 * 
 * GET /api/admin/organizations - List all organizations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getPlatformDb } from '@/lib/platform/db';
import { Organization } from '@/types/platform';

export const dynamic = 'force-dynamic';

// GET /api/admin/organizations - List all organizations (platform admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getPlatformDb();

    // Check if user is platform admin
    const user = await db.collection('users').findOne({ id: session.userId });
    if (!user?.platformRole || !['platform_admin', 'super_admin'].includes(user.platformRole)) {
      return NextResponse.json({ error: 'Forbidden - Platform admin access required' }, { status: 403 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500);

    // Fetch organizations
    const orgs = await db.collection<Organization>('organizations')
      .find({})
      .project({ orgId: 1, name: 1, slug: 1, createdAt: 1 })
      .sort({ name: 1 })
      .limit(limit)
      .toArray();

    // Map to expected format with `id` for client compatibility
    const organizations = orgs.map((o) => ({
      id: o.orgId,
      name: o.name,
      slug: o.slug,
      createdAt: o.createdAt,
    }));

    return NextResponse.json({
      organizations,
      total: organizations.length,
    });
  } catch (error) {
    console.error('Error listing organizations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
