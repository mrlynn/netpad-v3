/**
 * Component Unlock API
 *
 * POST /api/applications/[applicationId]/components/unlock - Unlock a form or workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { unlockComponent } from '@/lib/platform/componentProtection';

export const dynamic = 'force-dynamic';

/**
 * POST /api/applications/[applicationId]/components/unlock
 * Unlock a form or workflow
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { applicationId } = await params;
    const body = await request.json();
    const { orgId, componentId, componentType } = body || {};

    if (!orgId || !componentId || !componentType) {
      return NextResponse.json(
        { error: 'orgId, componentId, and componentType are required' },
        { status: 400 }
      );
    }

    if (!['form', 'workflow'].includes(componentType)) {
      return NextResponse.json(
        { error: 'componentType must be "form" or "workflow"' },
        { status: 400 }
      );
    }

    // Verify org membership and permissions
    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole || !['owner', 'admin'].includes(permissions.orgRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Only owners and admins can unlock components' },
        { status: 403 }
      );
    }

    await unlockComponent({
      organizationId: orgId,
      componentId,
      componentType,
      unlockedBy: session.userId,
    });

    return NextResponse.json({
      success: true,
      message: 'Component unlocked successfully',
    });
  } catch (error: any) {
    console.error('[Component Protection API] Unlock error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to unlock component' },
      { status: 500 }
    );
  }
}
