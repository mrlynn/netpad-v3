/**
 * Workflow Move API
 *
 * POST /api/workflows/[workflowId]/move - Move a workflow to a different application
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getWorkflowById, updateWorkflow } from '@/lib/workflow/db';
import { getUserOrgPermissions } from '@/lib/platform/permissions';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const session = await getSession();
    const { workflowId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orgId, targetApplicationId } = body;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    if (!targetApplicationId) {
      return NextResponse.json(
        { error: 'Target application ID is required' },
        { status: 400 }
      );
    }

    // Check user has permission in this org
    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    // Find the workflow
    const workflow = await getWorkflowById(orgId, workflowId);

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Don't allow moving to the same application
    if (workflow.applicationId === targetApplicationId) {
      return NextResponse.json(
        { error: 'Workflow is already in this application' },
        { status: 400 }
      );
    }

    const previousApplicationId = workflow.applicationId;

    // Update the workflow's applicationId
    const updated = await updateWorkflow(orgId, workflowId, session.userId, {
      applicationId: targetApplicationId,
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to move workflow' },
        { status: 500 }
      );
    }

    console.log('[Workflow Move API] Workflow moved:', {
      workflowId,
      from: previousApplicationId,
      to: targetApplicationId,
      movedBy: session.userId,
    });

    return NextResponse.json({
      success: true,
      workflowId,
      previousApplicationId,
      newApplicationId: targetApplicationId,
    });
  } catch (error) {
    console.error('[Workflow Move API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to move workflow' },
      { status: 500 }
    );
  }
}
