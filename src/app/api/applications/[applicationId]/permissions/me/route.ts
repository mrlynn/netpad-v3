/**
 * My Application Permission API (Phase 10)
 *
 * GET /api/applications/[applicationId]/permissions/me - Get current user's permission
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  getApplicationRole,
  checkApplicationPermission,
} from '@/lib/platform/applicationPermissions';
import { APPLICATION_ROLE_CAPABILITIES } from '@/types/platform';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const session = await getSession();
    const { applicationId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId query parameter is required' },
        { status: 400 }
      );
    }

    // Get user's role
    const role = await getApplicationRole(session.userId, orgId, applicationId);

    if (!role) {
      // Check if user has at least read access
      const readCheck = await checkApplicationPermission(
        session.userId,
        orgId,
        applicationId,
        'read'
      );

      if (!readCheck.allowed) {
        return NextResponse.json(
          { error: 'No access to this application', reason: readCheck.reason },
          { status: 403 }
        );
      }

      // User has access but no explicit role (org member/viewer)
      return NextResponse.json({
        success: true,
        role: readCheck.role,
        capabilities: ['read'],
      });
    }

    // Map role to capabilities
    let capabilities: string[] = [];
    if (role === 'platform_admin' || role === 'org_owner' || role === 'org_admin') {
      // Platform/admin roles have all capabilities
      capabilities = APPLICATION_ROLE_CAPABILITIES.owner;
    } else if (role in APPLICATION_ROLE_CAPABILITIES) {
      capabilities = APPLICATION_ROLE_CAPABILITIES[role as keyof typeof APPLICATION_ROLE_CAPABILITIES];
    }

    return NextResponse.json({
      success: true,
      role,
      capabilities,
    });
  } catch (error: any) {
    console.error('[My Application Permission API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get permission', message: error.message },
      { status: 500 }
    );
  }
}
