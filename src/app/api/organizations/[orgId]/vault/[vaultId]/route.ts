/**
 * Connection Vault Entry API
 *
 * GET    /api/organizations/[orgId]/vault/[vaultId] - Get connection details
 * PATCH  /api/organizations/[orgId]/vault/[vaultId] - Update connection
 * DELETE /api/organizations/[orgId]/vault/[vaultId] - Delete connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  getVault,
  updateVault,
  updateConnectionString,
  deleteVault,
  testVaultConnection,
} from '@/lib/platform/connectionVault';
import { assertConnectionPermission, checkConnectionPermission } from '@/lib/platform/permissions';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; vaultId: string }> }
) {
  try {
    const session = await getSession();
    const { orgId, vaultId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check read permission
    const permission = await checkConnectionPermission(session.userId, orgId, vaultId, 'read');
    if (!permission.allowed) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    const vault = await getVault(orgId, vaultId);
    if (!vault) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      connection: {
        vaultId: vault.vaultId,
        name: vault.name,
        description: vault.description,
        database: vault.database,
        allowedCollections: vault.allowedCollections,
        permissions: vault.permissions,
        status: vault.status,
        lastTestedAt: vault.lastTestedAt,
        lastUsedAt: vault.lastUsedAt,
        usageCount: vault.usageCount,
        createdAt: vault.createdAt,
        updatedAt: vault.updatedAt,
      },
      userRole: permission.role,
    });
  } catch (error) {
    console.error('[Vault API] Get error:', error);
    return NextResponse.json(
      { error: 'Failed to get connection' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; vaultId: string }> }
) {
  try {
    const session = await getSession();
    const { orgId, vaultId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check write permission
    try {
      await assertConnectionPermission(session.userId, orgId, vaultId, 'write');
    } catch {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, allowedCollections, status, connectionString } = body;

    // Handle connection string update separately (requires owner permission)
    if (connectionString) {
      const canUpdate = await checkConnectionPermission(
        session.userId,
        orgId,
        vaultId,
        'view_connection_string'
      );

      if (!canUpdate.allowed) {
        return NextResponse.json(
          { error: 'Only connection owners can update the connection string' },
          { status: 403 }
        );
      }

      await updateConnectionString(orgId, vaultId, connectionString, session.userId);
    }

    // Update other fields
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (allowedCollections !== undefined) updates.allowedCollections = allowedCollections;
    if (status !== undefined) updates.status = status;

    if (Object.keys(updates).length > 0) {
      await updateVault(orgId, vaultId, updates, session.userId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Vault API] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update connection' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; vaultId: string }> }
) {
  try {
    const session = await getSession();
    const { orgId, vaultId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check delete permission
    try {
      await assertConnectionPermission(session.userId, orgId, vaultId, 'delete');
    } catch {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    const success = await deleteVault(orgId, vaultId, session.userId);

    if (!success) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Vault API] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    );
  }
}
