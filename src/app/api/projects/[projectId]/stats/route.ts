/**
 * Project Stats API
 *
 * GET /api/projects/[projectId]/stats - Get project statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  getProject,
  calculateProjectStats,
  getProjectStats,
} from '@/lib/platform/projects';
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

    // Check if we should recalculate stats
    const { searchParams } = new URL(request.url);
    const recalculate = searchParams.get('recalculate') === 'true';

    let stats;
    if (recalculate) {
      stats = await calculateProjectStats(projectId);
    } else {
      stats = await getProjectStats(projectId);
    }

    return NextResponse.json({
      stats,
    });
  } catch (error) {
    console.error('[Projects API] Stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get project stats' },
      { status: 500 }
    );
  }
}
