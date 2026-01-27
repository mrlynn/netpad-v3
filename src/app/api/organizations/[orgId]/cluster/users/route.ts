import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { assertOrgPermission } from '@/lib/platform/permissions';
import { getProvisionedClusterForOrg } from '@/lib/atlas/provisioning';
import { getAtlasClient } from '@/lib/atlas/client';

export const dynamic = 'force-dynamic';

// GET - List database users
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getSession();
    const { orgId } = await params;

    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    try {
      await assertOrgPermission(session.userId, orgId, 'manage_connections');
    } catch {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Get provisioned cluster
    const cluster = await getProvisionedClusterForOrg(orgId);
    if (!cluster || !cluster.atlasProjectId) {
      return NextResponse.json({ error: 'No provisioned cluster found' }, { status: 404 });
    }

    const client = getAtlasClient();
    if (!client.isConfigured()) {
      return NextResponse.json({ error: 'Atlas API not configured' }, { status: 500 });
    }

    // Note: Atlas API for listing users requires project-level access
    // For M0 clusters, we may have limited access
    // Return the user we created during provisioning
    const users = [];
    if (cluster.databaseUsername) {
      users.push({
        username: cluster.databaseUsername,
        roles: [{ roleName: 'readWrite', databaseName: 'forms' }],
        createdAt: cluster.createdAt,
        isSystemUser: true,
      });
    }

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('[Cluster Users API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST - Create a new database user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getSession();
    const { orgId } = await params;

    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    try {
      await assertOrgPermission(session.userId, orgId, 'manage_connections');
    } catch {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, role = 'readWrite', database = 'forms' } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return NextResponse.json(
        { error: 'Username can only contain alphanumeric characters, underscores, and hyphens' },
        { status: 400 }
      );
    }

    // Get provisioned cluster
    const cluster = await getProvisionedClusterForOrg(orgId);
    if (!cluster || !cluster.atlasProjectId) {
      return NextResponse.json({ error: 'No provisioned cluster found' }, { status: 404 });
    }

    const client = getAtlasClient();
    if (!client.isConfigured()) {
      return NextResponse.json({ error: 'Atlas API not configured' }, { status: 500 });
    }

    // Map role to Atlas role format
    const atlasRole = role === 'dbAdmin' ? 'dbAdmin' : role;

    // Create database user via Atlas API
    const result = await client.createDatabaseUser(cluster.atlasProjectId, {
      username,
      password,
      roles: [
        {
          roleName: atlasRole,
          databaseName: database,
        },
      ],
      scopes: cluster.atlasClusterName ? [
        {
          name: cluster.atlasClusterName,
          type: 'CLUSTER',
        },
      ] : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.detail || 'Failed to create user' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        username,
        roles: [{ roleName: atlasRole, databaseName: database }],
      },
    });
  } catch (error: any) {
    console.error('[Cluster Users API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a database user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getSession();
    const { orgId } = await params;
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Check permission
    try {
      await assertOrgPermission(session.userId, orgId, 'manage_connections');
    } catch {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Get provisioned cluster
    const cluster = await getProvisionedClusterForOrg(orgId);
    if (!cluster || !cluster.atlasProjectId) {
      return NextResponse.json({ error: 'No provisioned cluster found' }, { status: 404 });
    }

    // Prevent deletion of system user
    if (username === cluster.databaseUsername) {
      return NextResponse.json(
        { error: 'Cannot delete the system user' },
        { status: 400 }
      );
    }

    const client = getAtlasClient();
    if (!client.isConfigured()) {
      return NextResponse.json({ error: 'Atlas API not configured' }, { status: 500 });
    }

    // Delete database user via Atlas API
    const result = await client.deleteDatabaseUser(cluster.atlasProjectId, 'admin', username);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.detail || 'Failed to delete user' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Cluster Users API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}
