/**
 * Application Access API
 *
 * POST /api/applications/:applicationId/access
 * Records that the user accessed an application (for recent apps tracking)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { recordApplicationAccess } from '@/lib/platform/userPreferences';
import { getApplication } from '@/lib/platform/applications';
import { getUserOrgPermissions } from '@/lib/platform/permissions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { applicationId } = await params;
    const body = await request.json();
    const { orgId } = body;

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId is required in request body' },
        { status: 400 }
      );
    }

    // Check if user has access to the organization
    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    // Get the application to verify it exists and get projectId
    const application = await getApplication(orgId, applicationId);
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Record the access
    await recordApplicationAccess(
      session.userId,
      applicationId,
      orgId,
      application.projectId
    );

    return NextResponse.json({
      success: true,
      message: 'Access recorded',
    });
  } catch (error) {
    console.error('[Application Access API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to record application access' },
      { status: 500 }
    );
  }
}
