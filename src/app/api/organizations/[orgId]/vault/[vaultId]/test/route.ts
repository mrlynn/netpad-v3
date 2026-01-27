/**
 * Connection Vault Test API
 *
 * POST /api/organizations/[orgId]/vault/[vaultId]/test - Test connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { testVaultConnection } from '@/lib/platform/connectionVault';
import { assertConnectionPermission } from '@/lib/platform/permissions';

export const dynamic = 'force-dynamic';

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

    // Check permission to use this connection
    try {
      await assertConnectionPermission(session.userId, orgId, vaultId, 'use');
    } catch {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    const result = await testVaultConnection(orgId, vaultId, session.userId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      collections: result.collections,
    });
  } catch (error) {
    console.error('[Vault Test API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to test connection' },
      { status: 500 }
    );
  }
}
