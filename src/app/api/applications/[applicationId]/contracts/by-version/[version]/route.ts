/**
 * Application Contract by Version API
 *
 * GET /api/applications/[applicationId]/contracts/by-version/[version] - Get contract by version
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { getApplicationContractByVersion } from '@/lib/platform/applicationContracts';

export const dynamic = 'force-dynamic';

/**
 * GET /api/applications/[applicationId]/contracts/by-version/[version]
 * Get contract by application ID and version
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string; version: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { applicationId, version } = await params;
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // Verify org membership
    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const contract = await getApplicationContractByVersion(orgId, applicationId, version);

    if (!contract) {
      return NextResponse.json(
        { error: `Contract not found for version ${version}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      contract,
    });
  } catch (error: any) {
    console.error('[Contracts API] Get by version error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get contract by version' },
      { status: 500 }
    );
  }
}
