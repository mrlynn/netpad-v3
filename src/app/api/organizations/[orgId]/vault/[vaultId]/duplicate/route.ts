/**
 * Connection Vault Duplicate API
 *
 * POST /api/organizations/[orgId]/vault/[vaultId]/duplicate - Duplicate a connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { duplicateConnectionVault, DuplicateVaultInput } from '@/lib/platform/connectionVault';
import { assertConnectionPermission } from '@/lib/platform/permissions';

export async function POST(
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

    // Check permission to read/use this connection
    try {
      await assertConnectionPermission(session.userId, orgId, vaultId, 'read');
    } catch {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, database, allowedCollections, projectId } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Connection name is required' },
        { status: 400 }
      );
    }

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const input: DuplicateVaultInput = {
      name: name.trim(),
      projectId,
      description: description?.trim(),
      database: database?.trim(),
      allowedCollections,
    };

    const newVault = await duplicateConnectionVault(
      orgId,
      vaultId,
      input,
      session.userId
    );

    return NextResponse.json({
      success: true,
      vault: newVault,
    });
  } catch (error: any) {
    console.error('[Vault Duplicate API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to duplicate connection' },
      { status: 500 }
    );
  }
}
