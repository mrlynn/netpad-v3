/**
 * Vault Connections API (Simplified)
 *
 * GET /api/vault/connections - List connections for current user's selected org
 *
 * This is a convenience endpoint for UI components that need to list connections
 * without knowing the current organization ID. It uses localStorage on the client
 * to determine the selected org, or falls back to the first org.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { listUserVaults } from '@/lib/platform/connectionVault';
import { getUserOrganizations } from '@/lib/platform/organizations';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the orgId from query param if provided, otherwise get user's first org
    const searchParams = request.nextUrl.searchParams;
    let orgId = searchParams.get('orgId');

    if (!orgId) {
      // Get user's organizations and use the first one
      const organizations = await getUserOrganizations(session.userId);

      if (organizations.length === 0) {
        return NextResponse.json({
          success: true,
          connections: [],
          message: 'No organization found',
        });
      }

      orgId = organizations[0].orgId;
    }

    // List vaults accessible by this user in this org
    const vaults = await listUserVaults(orgId, session.userId);

    return NextResponse.json({
      success: true,
      connections: vaults.map((v) => ({
        vaultId: v.vaultId,
        name: v.name,
        description: v.description,
        database: v.database,
        status: v.status,
        lastTestedAt: v.lastTestedAt,
        lastUsedAt: v.lastUsedAt,
      })),
    });
  } catch (error) {
    console.error('[Vault Connections API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list connections' },
      { status: 500 }
    );
  }
}
