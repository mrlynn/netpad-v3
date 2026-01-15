/**
 * Workflow API Routes
 *
 * GET  /api/workflows - List workflows for an organization
 * POST /api/workflows - Create a new workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  createWorkflow,
  listWorkflows,
  createOrgWorkflowIndexes,
} from '@/lib/workflow/db';

/**
 * GET /api/workflows
 * List workflows for an organization
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const status = searchParams.get('status') || undefined;
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || undefined;
    const projectId = searchParams.get('projectId') || undefined;
    const applicationId = searchParams.get('applicationId') || undefined; // Phase 2: Filter by application
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // TODO: Verify user has access to this organization
    // For now, we'll assume the user has access

    // Ensure indexes exist
    await createOrgWorkflowIndexes(orgId);

    // Fetch workflows
    const { workflows, total } = await listWorkflows(orgId, {
      status,
      tags,
      projectId,
      applicationId, // Phase 2: Pass applicationId filter
      page,
      pageSize,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({
      success: true,
      workflows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Error listing workflows:', error);
    return NextResponse.json(
      { error: 'Failed to list workflows' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflows
 * Create a new workflow
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { orgId, projectId, applicationId, name, description, tags, templateId, templateVersion } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'name must be 100 characters or less' },
        { status: 400 }
      );
    }

    // Validate project exists and belongs to organization
    const { getProject } = await import('@/lib/platform/projects');
    const project = await getProject(projectId);
    if (!project || project.organizationId !== orgId) {
      return NextResponse.json(
        { error: 'Project not found or does not belong to this organization' },
        { status: 400 }
      );
    }

    // Phase 2: Validate applicationId if provided (should belong to the project)
    if (applicationId && projectId) {
      const { getApplication } = await import('@/lib/platform/applications');
      const app = await getApplication(orgId, applicationId);
      if (!app || app.projectId !== projectId) {
        return NextResponse.json(
          { error: 'Application not found or does not belong to this project' },
          { status: 400 }
        );
      }
    }

    // TODO: Verify user has access to this organization
    // TODO: Check organization workflow limits

    // Ensure indexes exist
    await createOrgWorkflowIndexes(orgId);

    // Create workflow
    const workflow = await createWorkflow(orgId, session.userId!, {
      name: name.trim(),
      description: description?.trim(),
      tags: tags || [],
      projectId,
      applicationId, // Phase 2: Pass applicationId if provided
      templateId, // Phase 4: Pass templateId if provided
      templateVersion, // Phase 4: Pass templateVersion if provided
    });

    // Update application stats if applicationId is set
    if (applicationId) {
      try {
        const { calculateApplicationStats } = await import('@/lib/platform/applications');
        await calculateApplicationStats(orgId, applicationId);
        console.log('[API workflows] Application stats updated');
      } catch (statsError) {
        console.error('[API workflows] Failed to update application stats:', statsError);
        // Don't fail the request if stats update fails
      }
    }

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow' },
      { status: 500 }
    );
  }
}
