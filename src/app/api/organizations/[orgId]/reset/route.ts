/**
 * Organization Reset API
 *
 * POST /api/organizations/[orgId]/reset
 *
 * Resets an organization to a fresh state by deleting all associated resources.
 * Only organization owners can reset an organization.
 *
 * WARNING: This is destructive and cannot be undone!
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUserOrgRole, resetOrganization, ResetOrganizationOptions } from '@/lib/platform/organizations';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    // Get authenticated user
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = await params;

    // Verify user is an owner of this organization
    const userRole = await getUserOrgRole(session.userId, orgId);
    if (userRole !== 'owner') {
      return NextResponse.json(
        { error: 'Only organization owners can reset an organization' },
        { status: 403 }
      );
    }

    // Parse options from request body (all optional)
    let options: ResetOrganizationOptions = {};
    try {
      const body = await request.json();
      options = {
        deleteClusters: body.deleteClusters ?? true,
        deleteConnections: body.deleteConnections ?? true,
        deleteForms: body.deleteForms ?? true,
        deleteWorkflows: body.deleteWorkflows ?? true,
        deleteApplications: body.deleteApplications ?? true,
        deleteProjects: body.deleteProjects ?? true,
      };
    } catch {
      // Use defaults if no body provided
    }

    console.log(`[API] Resetting organization ${orgId} by user ${session.userId}`);
    console.log(`[API] Reset options:`, options);

    // Perform the reset
    const result = await resetOrganization(orgId, session.userId, options);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Organization reset successfully',
        deleted: result.deleted,
        recreated: result.recreated,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Organization reset completed with errors',
          deleted: result.deleted,
          recreated: result.recreated,
          errors: result.errors,
        },
        { status: 207 } // Multi-Status: partial success
      );
    }
  } catch (error) {
    console.error('[API] Organization reset error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to reset organization', details: message },
      { status: 500 }
    );
  }
}
