/**
 * Single Workflow API Routes
 *
 * GET    /api/workflows/[workflowId] - Get workflow by ID
 * PATCH  /api/workflows/[workflowId] - Update workflow
 * DELETE /api/workflows/[workflowId] - Delete workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow,
} from '@/lib/workflow/db';
import { WorkflowCanvas, WorkflowSettings, WorkflowVariable } from '@/types/workflow';

interface RouteParams {
  params: Promise<{ workflowId: string }>;
}

/**
 * GET /api/workflows/[workflowId]
 * Get workflow by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workflowId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // TODO: Verify user has access to this organization

    const workflow = await getWorkflowById(orgId, workflowId);

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/workflows/[workflowId]
 * Update workflow
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workflowId } = await params;
    const body = await request.json();
    const { orgId, ...updates } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // TODO: Verify user has access to this organization

    // Validate updates
    const validUpdates: Partial<{
      name: string;
      description: string;
      canvas: WorkflowCanvas;
      settings: WorkflowSettings;
      variables: WorkflowVariable[];
      tags: string[];
    }> = {};

    if (updates.name !== undefined) {
      if (typeof updates.name !== 'string' || updates.name.trim().length === 0) {
        return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
      }
      if (updates.name.length > 100) {
        return NextResponse.json(
          { error: 'name must be 100 characters or less' },
          { status: 400 }
        );
      }
      validUpdates.name = updates.name.trim();
    }

    if (updates.description !== undefined) {
      validUpdates.description = updates.description?.trim() || '';
    }

    if (updates.canvas !== undefined) {
      // Validate canvas structure
      if (!updates.canvas.nodes || !Array.isArray(updates.canvas.nodes)) {
        return NextResponse.json({ error: 'Invalid canvas: nodes required' }, { status: 400 });
      }
      if (!updates.canvas.edges || !Array.isArray(updates.canvas.edges)) {
        return NextResponse.json({ error: 'Invalid canvas: edges required' }, { status: 400 });
      }
      validUpdates.canvas = updates.canvas;
    }

    if (updates.settings !== undefined) {
      validUpdates.settings = updates.settings;
    }

    if (updates.variables !== undefined) {
      if (!Array.isArray(updates.variables)) {
        return NextResponse.json({ error: 'Invalid variables' }, { status: 400 });
      }
      validUpdates.variables = updates.variables;
    }

    if (updates.tags !== undefined) {
      if (!Array.isArray(updates.tags)) {
        return NextResponse.json({ error: 'Invalid tags' }, { status: 400 });
      }
      validUpdates.tags = updates.tags;
    }

    // Check workflow exists
    const existing = await getWorkflowById(orgId, workflowId);
    if (!existing) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Update workflow
    const workflow = await updateWorkflow(orgId, workflowId, session.userId!, validUpdates);

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workflows/[workflowId]
 * Delete workflow
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workflowId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // TODO: Verify user has access to this organization

    // Check workflow exists
    const existing = await getWorkflowById(orgId, workflowId);
    if (!existing) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Don't allow deleting active workflows
    if (existing.status === 'active') {
      return NextResponse.json(
        { error: 'Cannot delete an active workflow. Pause or archive it first.' },
        { status: 400 }
      );
    }

    // Delete workflow
    const deleted = await deleteWorkflow(orgId, workflowId);

    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}
