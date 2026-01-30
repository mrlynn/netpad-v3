/**
 * Organization Groups API
 * 
 * GET  /api/platform/orgs/[orgId]/groups - List all groups
 * POST /api/platform/orgs/[orgId]/groups - Create a group
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPlatformDb } from '@/lib/platform/db';
import { generateId } from '@/lib/utils/ids';
import { OrgGroup, Permission } from '@/types/platform';
import { hasPermission } from '@/lib/platform/rbac';

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

// GET /api/platform/orgs/[orgId]/groups
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = await params;
    const db = await getPlatformDb();

    // Check permission
    const canRead = await hasPermission(session.user.id, orgId, 'groups:read');
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const groups = await db.collection<OrgGroup>('groups')
      .find({ organizationId: orgId })
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Error listing groups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/platform/orgs/[orgId]/groups
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = await params;
    const body = await request.json();
    const { name, description, defaultRole, memberIds } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const db = await getPlatformDb();

    // Check permission
    const canCreate = await hasPermission(session.user.id, orgId, 'groups:create');
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Check for duplicate slug
    const existing = await db.collection<OrgGroup>('groups').findOne({
      organizationId: orgId,
      slug,
    });
    if (existing) {
      return NextResponse.json({ error: 'A group with this name already exists' }, { status: 409 });
    }

    const now = new Date();
    const group: OrgGroup = {
      groupId: generateId('grp'),
      organizationId: orgId,
      name: name.trim(),
      slug,
      description: description?.trim() || undefined,
      defaultRole: defaultRole || undefined,
      memberIds: Array.isArray(memberIds) ? memberIds : [],
      createdBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection<OrgGroup>('groups').insertOne(group);

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
