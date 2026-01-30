/**
 * Organization API
 * 
 * GET   /api/platform/orgs/[orgId] - Get organization details
 * PATCH /api/platform/orgs/[orgId] - Update organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPlatformDb } from '@/lib/platform/db';
import { Organization } from '@/types/platform';
import { hasPermission } from '@/lib/platform/rbac';

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

// GET /api/platform/orgs/[orgId]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = await params;
    const db = await getPlatformDb();

    // Check permission
    const canRead = await hasPermission(session.user.id, orgId, 'org:read');
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const organization = await db.collection<Organization>('organizations').findOne({ orgId });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Return safe org data (exclude sensitive fields)
    return NextResponse.json({
      organization: {
        orgId: organization.orgId,
        name: organization.name,
        slug: organization.slug,
        plan: organization.plan,
        subscription: organization.subscription,
        settings: organization.settings,
        createdAt: organization.createdAt,
        createdBy: organization.createdBy,
        updatedAt: organization.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/platform/orgs/[orgId]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = await params;
    const body = await request.json();
    const { name, slug } = body;

    const db = await getPlatformDb();

    // Check permission
    const canUpdate = await hasPermission(session.user.id, orgId, 'org:update');
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const organization = await db.collection<Organization>('organizations').findOne({ orgId });
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Build update
    const update: Partial<Organization> = {
      updatedAt: new Date(),
    };

    if (name !== undefined && typeof name === 'string') {
      update.name = name.trim();
    }

    if (slug !== undefined && typeof slug === 'string') {
      const newSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
      
      // Check if slug is taken by another org
      if (newSlug !== organization.slug) {
        const existing = await db.collection<Organization>('organizations').findOne({
          slug: newSlug,
          orgId: { $ne: orgId },
        });
        
        if (existing) {
          return NextResponse.json({ error: 'This URL slug is already taken' }, { status: 409 });
        }
        
        update.slug = newSlug;
        update.slugChangedAt = new Date();
      }
    }

    await db.collection<Organization>('organizations').updateOne(
      { orgId },
      { $set: update }
    );

    const updated = await db.collection<Organization>('organizations').findOne({ orgId });

    return NextResponse.json({
      organization: {
        orgId: updated?.orgId,
        name: updated?.name,
        slug: updated?.slug,
        updatedAt: updated?.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
