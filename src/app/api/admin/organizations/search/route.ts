/**
 * Admin Organization Search API
 *
 * GET /api/admin/organizations/search?q=query - Search organizations by name, slug, or owner email
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isPlatformAdmin } from '@/lib/platform/users';
import { getOrganizationsCollection, getUsersCollection } from '@/lib/platform/db';

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
    const query = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const orgsCollection = await getOrganizationsCollection();
    const usersCollection = await getUsersCollection();

    // Search organizations by name or slug
    const orgResults = await orgsCollection
      .find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { slug: { $regex: query, $options: 'i' } },
        ],
      })
      .limit(limit)
      .toArray();

    // Also search by owner email
    const userResults = await usersCollection
      .find({
        email: { $regex: query, $options: 'i' },
      })
      .limit(limit)
      .toArray();

    // Get orgs for users found by email
    const userOrgIds = new Set<string>();
    for (const user of userResults) {
      if (user.organizations) {
        for (const orgMembership of user.organizations as Array<{ orgId: string }>) {
          userOrgIds.add(orgMembership.orgId);
        }
      }
    }

    // Fetch those orgs
    const additionalOrgs = userOrgIds.size > 0
      ? await orgsCollection
          .find({ orgId: { $in: Array.from(userOrgIds) } })
          .toArray()
      : [];

    // Combine and dedupe results
    const allOrgs = [...orgResults];
    const seenOrgIds = new Set(orgResults.map(o => o.orgId));

    for (const org of additionalOrgs) {
      if (!seenOrgIds.has(org.orgId)) {
        allOrgs.push(org);
        seenOrgIds.add(org.orgId);
      }
    }

    // Get owner info for each org
    const results = await Promise.all(
      allOrgs.slice(0, limit).map(async (org) => {
        // Find owner
        const owner = await usersCollection.findOne({
          organizations: {
            $elemMatch: {
              orgId: org.orgId,
              role: 'owner',
            },
          },
        });

        return {
          orgId: org.orgId,
          name: org.name,
          slug: org.slug,
          ownerEmail: owner?.email || null,
          ownerName: owner?.displayName || null,
          plan: org.plan || 'free',
          createdAt: org.createdAt,
        };
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[Admin] Error searching organizations:', error);
    return NextResponse.json(
      { error: 'Failed to search organizations' },
      { status: 500 }
    );
  }
}
