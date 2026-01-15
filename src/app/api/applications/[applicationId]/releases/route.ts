import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { listApplicationReleases, createApplicationRelease } from '@/lib/platform/applicationReleases';
import { checkApplicationPermission } from '@/lib/platform/applicationPermissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const projectId = searchParams.get('projectId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    if (!orgId || !projectId) {
      return NextResponse.json(
        { success: false, error: 'orgId and projectId are required' },
        { status: 400 }
      );
    }

    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to read application (Phase 10)
    const permissionCheck = await checkApplicationPermission(
      session.userId,
      orgId,
      applicationId,
      'read'
    );

    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions', reason: permissionCheck.reason },
        { status: 403 }
      );
    }

    const result = await listApplicationReleases(orgId, applicationId, { page, pageSize });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[API] Failed to list application releases:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list application releases' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;
    const body = await request.json();
    const {
      orgId,
      projectId,
      version,
      changelog,
      validateContract = false,
      requireContract = false,
      allowBreakingChanges = false,
    } = body || {};

    if (!orgId || !projectId || !version) {
      return NextResponse.json(
        { success: false, error: 'orgId, projectId, and version are required' },
        { status: 400 }
      );
    }

    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to create release (Phase 10)
    const permissionCheck = await checkApplicationPermission(
      session.userId,
      orgId,
      applicationId,
      'create_release'
    );

    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions', reason: permissionCheck.reason },
        { status: 403 }
      );
    }

    const result = await createApplicationRelease(
      {
        organizationId: orgId,
        projectId,
        applicationId,
        version,
        changelog,
      },
      {
        validateContract,
        requireContract,
        allowBreakingChanges,
      }
    );

    return NextResponse.json({
      success: true,
      release: result.release,
      validation: result.validation,
    });
  } catch (error: any) {
    console.error('[API] Failed to create application release:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Failed to create release';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

