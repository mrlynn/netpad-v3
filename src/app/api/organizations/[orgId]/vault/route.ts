/**
 * Connection Vault API
 *
 * GET  /api/organizations/[orgId]/vault - List connections
 * POST /api/organizations/[orgId]/vault - Create connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  createConnectionVault,
  listUserVaults,
  listVaults,
  testConnectionString,
} from '@/lib/platform/connectionVault';
import { assertOrgPermission, checkConnectionPermission } from '@/lib/platform/permissions';
import { repairOrgCreatorMembership } from '@/lib/platform/organizations';
import { checkConnectionLimit } from '@/lib/platform/billing';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getSession();
    const { orgId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // List vaults accessible by this user
    const vaults = await listUserVaults(orgId, session.userId);

    return NextResponse.json({
      connections: vaults.map(v => ({
        vaultId: v.vaultId,
        name: v.name,
        description: v.description,
        database: v.database,
        allowedCollections: v.allowedCollections,
        status: v.status,
        lastTestedAt: v.lastTestedAt,
        lastUsedAt: v.lastUsedAt,
        usageCount: v.usageCount,
        createdAt: v.createdAt,
        // Note: encryptedConnectionString is already redacted
      })),
    });
  } catch (error) {
    console.error('[Vault API] List error:', error);
    return NextResponse.json(
      { error: 'Failed to list connections' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getSession();
    const { orgId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check permission to create connections
    // Owners/admins have 'manage_all_connections', members have 'use_connections'
    let hasPermission = false;
    try {
      // Try manage_all_connections first (for owners/admins)
      await assertOrgPermission(session.userId, orgId, 'manage_all_connections');
      hasPermission = true;
    } catch {
      // Fall back to use_connections (for members)
      try {
        await assertOrgPermission(session.userId, orgId, 'use_connections');
        hasPermission = true;
      } catch {
        // Permission denied - try to auto-repair if user is the org creator
        console.log(`[Vault API] Permission denied for user ${session.userId} on org ${orgId}. Attempting repair...`);
        const repaired = await repairOrgCreatorMembership(session.userId, orgId);

        if (repaired) {
          // Retry permission check after repair
          try {
            await assertOrgPermission(session.userId, orgId, 'manage_all_connections');
            hasPermission = true;
            console.log(`[Vault API] Repair successful, user ${session.userId} now has access to org ${orgId}`);
          } catch {
            // Still no permission after repair
          }
        }
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Check connection limit before creating
    const allVaults = await listVaults(orgId);
    const activeVaults = allVaults.filter(v => v.status === 'active');
    const limitCheck = await checkConnectionLimit(orgId, activeVaults.length);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: limitCheck.reason || 'Maximum connections limit reached',
          code: 'LIMIT_EXCEEDED',
          usage: {
            current: limitCheck.current,
            limit: limitCheck.limit,
            remaining: limitCheck.remaining,
          },
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, description, connectionString, database, allowedCollections, testFirst } = body;

    // Validate required fields
    if (!name || !connectionString || !database) {
      return NextResponse.json(
        { error: 'Name, connectionString, and database are required' },
        { status: 400 }
      );
    }

    // Optionally test connection first
    if (testFirst) {
      const testResult = await testConnectionString(connectionString, database);
      if (!testResult.success) {
        return NextResponse.json(
          { error: `Connection test failed: ${testResult.error}` },
          { status: 400 }
        );
      }
    }

    // Create vault entry
    const vault = await createConnectionVault({
      organizationId: orgId,
      createdBy: session.userId,
      name,
      description,
      connectionString,
      database,
      allowedCollections: allowedCollections || [],
    });

    return NextResponse.json({
      success: true,
      connection: {
        vaultId: vault.vaultId,
        name: vault.name,
        database: vault.database,
        allowedCollections: vault.allowedCollections,
      },
    });
  } catch (error) {
    console.error('[Vault API] Create error:', error);

    if (error instanceof Error && error.message.includes('VAULT_ENCRYPTION_KEY')) {
      return NextResponse.json(
        { error: 'Server encryption not configured' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create connection' },
      { status: 500 }
    );
  }
}
