/**
 * Project Default Vault API
 *
 * GET /api/projects/[projectId]/default-vault - Get project's default vault connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getProject, getProjectDefaultVault } from '@/lib/platform/projects';
import { getUserOrgPermissions } from '@/lib/platform/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getSession();
    const { projectId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check permission to view org
    const permissions = await getUserOrgPermissions(session.userId, project.organizationId);
    if (!permissions.orgRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    // Get project's default vault
    const defaultVault = await getProjectDefaultVault(projectId);

    if (!defaultVault) {
      return NextResponse.json({
        hasDefaultVault: false,
        message: 'Project does not have a default database configured',
      });
    }

    return NextResponse.json({
      hasDefaultVault: true,
      vault: defaultVault,
    });
  } catch (error) {
    console.error('[Projects API] Default vault error:', error);
    return NextResponse.json(
      { error: 'Failed to get project default vault' },
      { status: 500 }
    );
  }
}
