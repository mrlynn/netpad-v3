/**
 * Public Workflow Viewer API Route
 *
 * GET /api/workflows/public/[workflowSlug] - Get workflow data for public viewing
 * 
 * This endpoint allows public read-only access to workflow data for embedding/viewing.
 * Used for documentation, tutorials, or sharing workflow designs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationsCollection } from '@/lib/platform/db';
import { getOrgDb } from '@/lib/platform/db';
import { WorkflowDocument } from '@/types/workflow';

interface RouteParams {
  params: Promise<{ workflowSlug: string }>;
}

/**
 * Find workflow by slug across all organizations (for public access)
 */
async function findWorkflowBySlugPublic(slug: string): Promise<WorkflowDocument | null> {
  const { getOrganizationsCollection } = await import('@/lib/platform/db');
  const { getOrgDb } = await import('@/lib/platform/db');
  
  // Get all organizations from platform DB
  const orgsCollection = await getOrganizationsCollection();
  const orgs = await orgsCollection.find({}).toArray();
  
  // Search each org's workflow collection
  for (const org of orgs) {
    try {
      const orgDb = await getOrgDb(org.orgId);
      const workflowsCollection = orgDb.collection<WorkflowDocument>('workflows');
      const workflow = await workflowsCollection.findOne({ 
        slug,
        status: { $in: ['active', 'draft'] }, // Allow viewing active or draft workflows
      });
      
      // Check if public viewing is enabled
      if (workflow && workflow.settings?.embedSettings?.allowPublicViewing) {
        return workflow;
      }
    } catch (error) {
      // Skip orgs that don't have a database yet
      console.warn(`[Public Workflow] Could not search org ${org.orgId}:`, error);
      continue;
    }
  }
  
  return null;
}

/**
 * GET /api/workflows/public/[workflowSlug]
 * Get workflow data for public viewing (read-only)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workflowSlug } = await params;
    const includeMetadata = request.nextUrl.searchParams.get('metadata') === 'true';

    // Find workflow by slug (search across all orgs)
    const workflow = await findWorkflowBySlugPublic(workflowSlug);
    
    if (!workflow) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Workflow not found or not available for public viewing',
          code: 'WORKFLOW_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Return sanitized workflow data (read-only, no sensitive info)
    const publicWorkflow = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      slug: workflow.slug,
      canvas: workflow.canvas,
      status: workflow.status,
      version: workflow.version,
      tags: workflow.tags,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      ...(includeMetadata && {
        stats: workflow.stats,
        variables: workflow.variables,
        inputSchema: workflow.inputSchema,
        outputSchema: workflow.outputSchema,
      }),
    };

    return NextResponse.json({
      success: true,
      workflow: publicWorkflow,
    });
  } catch (error) {
    console.error('Error getting public workflow:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get workflow',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}
