/**
 * Protected Components API
 *
 * GET /api/applications/[applicationId]/components/protected - List protected components
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { listProtectedComponents } from '@/lib/platform/componentProtection';

export const dynamic = 'force-dynamic';

/**
 * GET /api/applications/[applicationId]/components/protected
 * List all protected (locked) components for an application
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

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // Verify org membership
    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const protectedComponents = await listProtectedComponents(orgId, applicationId);

    return NextResponse.json({
      success: true,
      components: protectedComponents,
    });
  } catch (error: any) {
    console.error('[Component Protection API] List protected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list protected components' },
      { status: 500 }
    );
  }
}
