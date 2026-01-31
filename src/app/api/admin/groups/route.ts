/**
 * Platform Admin Groups API
 * 
 * GET /api/admin/groups - List all groups across all organizations
 * 
 * Platform admins can view and manage groups across the entire platform.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getPlatformDb } from '@/lib/platform/db';
import { OrgGroup, Organization } from '@/types/platform';
import { Filter } from 'mongodb';

// GET /api/admin/groups - List all groups (platform admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getPlatformDb();

    // Check if user is platform admin
    const user = await db.collection('users').findOne({ userId: session.userId });
    if (!user?.platformRole || !['platform_admin', 'super_admin'].includes(user.platformRole)) {
      return NextResponse.json({ error: 'Forbidden - Platform admin access required' }, { status: 403 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    const query: Filter<OrgGroup> = {};
    if (orgId) {
      query.organizationId = orgId;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Fetch groups with pagination
    const [groups, total] = await Promise.all([
      db.collection<OrgGroup>('groups')
        .find(query)
        .sort({ name: 1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      db.collection<OrgGroup>('groups').countDocuments(query),
    ]);

    // Get unique org IDs and fetch org names
    const orgIds = [...new Set(groups.map((g) => g.organizationId))];
    const orgs = await db.collection<Organization>('organizations')
      .find({ orgId: { $in: orgIds } })
      .project({ orgId: 1, name: 1 })
      .toArray();
    const orgMap = new Map(orgs.map((o) => [o.orgId, o.name]));

    // Enrich groups with org names
    const enrichedGroups = groups.map((g) => ({
      ...g,
      organizationName: orgMap.get(g.organizationId) || 'Unknown',
    }));

    return NextResponse.json({
      groups: enrichedGroups,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error listing platform groups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
