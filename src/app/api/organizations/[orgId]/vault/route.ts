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
  setVaultPermission,
} from '@/lib/platform/connectionVault';
import { assertOrgPermission, checkConnectionPermission } from '@/lib/platform/permissions';
import { repairOrgCreatorMembership } from '@/lib/platform/organizations';
import { checkConnectionLimit } from '@/lib/platform/usageService';
import { getProvisionedClusterForOrg } from '@/lib/atlas/provisioning';

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

    // Get optional projectId filter from query params
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || undefined;

    // List vaults accessible by this user
    let vaults = await listUserVaults(orgId, session.userId);

    // Check for auto-provisioned cluster vault that user might not have explicit permission for
    // This handles the case where vault was created with createdBy: 'system' before the fix
    try {
      const provisionedCluster = await getProvisionedClusterForOrg(orgId);
      if (provisionedCluster?.vaultId && provisionedCluster.status === 'ready') {
        // Check if user already has access to this vault
        const hasAccess = vaults.some(v => v.vaultId === provisionedCluster.vaultId);

        if (!hasAccess) {
          // Auto-repair: Add user permission to the auto-provisioned vault
          console.log(`[Vault API] User ${session.userId} missing access to auto-provisioned vault ${provisionedCluster.vaultId}. Adding permission...`);

          await setVaultPermission(orgId, provisionedCluster.vaultId, {
            userId: session.userId,
            role: 'owner',
            grantedAt: new Date(),
            grantedBy: 'system',
          });

          // Re-fetch vaults to include the newly accessible one
          vaults = await listUserVaults(orgId, session.userId);
          console.log(`[Vault API] Successfully added permission for user ${session.userId} to vault ${provisionedCluster.vaultId}`);
        }
      }
    } catch (provisioningErr) {
      // Don't fail the request if provisioning check fails - just log it
      console.warn('[Vault API] Error checking provisioned cluster:', provisioningErr);
    }

    // Filter by projectId if provided
    if (projectId) {
      vaults = vaults.filter(v => v.projectId === projectId);
    }

    return NextResponse.json({
      connections: vaults.map(v => ({
        vaultId: v.vaultId,
        name: v.name,
        description: v.description,
        database: v.database,
        allowedCollections: v.allowedCollections,
        status: v.status,
        projectId: v.projectId,
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
    const { projectId, name, description, connectionString, database, allowedCollections, testFirst } = body;

    // Validate required fields
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    if (!name || !connectionString || !database) {
      return NextResponse.json(
        { error: 'Name, connectionString, and database are required' },
        { status: 400 }
      );
    }

    // Verify project exists and belongs to organization
    const { getProject } = await import('@/lib/platform/projects');
    const project = await getProject(projectId);
    if (!project || project.organizationId !== orgId) {
      return NextResponse.json(
        { error: 'Invalid project or project does not belong to this organization' },
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
      projectId,
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
