/**
 * Single Workflow Version API
 *
 * GET /api/workflows/[workflowId]/versions/[version] - Get specific version
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  getWorkflowById,
  getWorkflowVersion,
} from '@/lib/workflow/db';

interface RouteParams {
  params: Promise<{ workflowId: string; version: string }>;
}

/**
 * GET /api/workflows/[workflowId]/versions/[version]
 * Get a specific workflow version with full snapshot
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workflowId, version: versionStr } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    const version = parseInt(versionStr, 10);
    if (isNaN(version) || version < 1) {
      return NextResponse.json({ error: 'Invalid version number' }, { status: 400 });
    }

    // Check workflow exists
    const workflow = await getWorkflowById(orgId, workflowId);
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Get the specific version
    const workflowVersion = await getWorkflowVersion(orgId, workflowId, version);
    if (!workflowVersion) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    return NextResponse.json({
      version: {
        version: workflowVersion.version,
        publishedAt: workflowVersion.publishedAt,
        publishedBy: workflowVersion.publishedBy,
        publishNote: workflowVersion.publishNote,
        changesSummary: workflowVersion.changesSummary,
        stats: workflowVersion.stats,
        isActive: workflowVersion.isActive,
        deprecatedAt: workflowVersion.deprecatedAt,
        snapshot: workflowVersion.snapshot,
      },
    });
  } catch (error) {
    console.error('Error fetching workflow version:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow version' },
      { status: 500 }
    );
  }
}
