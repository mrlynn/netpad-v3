/**
 * Contract Comparison API
 *
 * GET /api/applications/[applicationId]/contracts/compare - Compare two contract versions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { compareContracts } from '@/lib/platform/contractComparison';

export const dynamic = 'force-dynamic';

/**
 * GET /api/applications/[applicationId]/contracts/compare
 * Compare two contract versions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { applicationId } = await params;
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get('orgId');
    const fromVersion = searchParams.get('from');
    const toVersion = searchParams.get('to');

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    if (!fromVersion || !toVersion) {
      return NextResponse.json(
        { error: 'from and to version parameters are required' },
        { status: 400 }
      );
    }

    // Verify org membership
    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const comparison = await compareContracts(orgId, applicationId, fromVersion, toVersion);

    return NextResponse.json({
      success: true,
      comparison,
    });
  } catch (error: any) {
    console.error('[Contracts API] Compare error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to compare contracts' },
      { status: 500 }
    );
  }
}
