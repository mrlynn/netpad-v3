/**
 * Project Bundle Export API
 * 
 * GET /api/projects/[projectId]/bundle?orgId={orgId}&format=json
 * Export entire project (all forms + workflows) as a complete application bundle
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getProject } from '@/lib/platform/projects';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import {
  cleanFormForExport,
  cleanWorkflowForExport,
  createManifest,
  createBundleExport,
  generateDeploymentConfig,
} from '@/lib/templates/export';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { getWorkflowsCollection } from '@/lib/workflow/db';
import { BundleExport } from '@/types/template';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/[projectId]/bundle
 * Export project bundle (all forms + workflows + project metadata)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const format = searchParams.get('format') || 'json'; // 'json' or 'zip'
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId query parameter is required' },
        { status: 400 }
      );
    }

    // Authenticate user
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check organization permissions
    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    // Get project
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Verify project belongs to organization
    if (project.organizationId !== orgId) {
      return NextResponse.json(
        { error: 'Project does not belong to this organization' },
        { status: 403 }
      );
    }

    // Get all forms in the project
    const formsCollection = await getOrgFormsCollection(orgId);
    const forms = await formsCollection
      .find({ projectId })
      .toArray();

    // Get all workflows in the project
    const workflowsCollection = await getWorkflowsCollection(orgId);
    const workflows = await workflowsCollection
      .find({ projectId })
      .toArray();

    // Clean forms for export (cast to any to handle MongoDB document structure)
    const formDefinitions = forms.map(form => {
      // Ensure form has formId field for compatibility
      const formWithId = {
        ...form,
        id: form.formId || (form as any).id,
      };
      return cleanFormForExport(formWithId as any);
    });

    // Clean workflows for export
    const workflowDefinitions = workflows.map(workflow => 
      cleanWorkflowForExport(workflow)
    );

    // Extract project-level theme/branding if available
    // (This could come from project settings or be extracted from forms)
    const projectTheme = forms.length > 0 ? forms[0]?.theme : undefined;

    // Create manifest
    const manifest = createManifest(
      project.name || 'Exported Project',
      '1.0.0',
      {
        description: project.description || `Project export containing ${forms.length} form(s) and ${workflows.length} workflow(s)`,
        forms: formDefinitions.length > 0 ? formDefinitions : undefined,
        workflows: workflowDefinitions.length > 0 ? workflowDefinitions : undefined,
        theme: projectTheme,
        tags: project.tags.length > 0 ? project.tags : ['exported', 'project'],
        category: 'project-export',
      }
    );

    // Create bundle with project metadata
    const bundle: BundleExport = createBundleExport(
      manifest,
      formDefinitions.length > 0 ? formDefinitions : undefined,
      workflowDefinitions.length > 0 ? workflowDefinitions : undefined,
      projectTheme
    );

    // Add project metadata
    bundle.project = {
      name: project.name,
      description: project.description,
      settings: project.settings,
      branding: project.color ? {
        primaryColor: project.color,
      } : undefined,
    };

    // Generate deployment configuration with environment variables
    bundle.deployment = generateDeploymentConfig(
      project.name,
      formDefinitions,
      workflowDefinitions,
      [], // No connection configs exported for security
      {
        mode: 'standalone',
        provisioning: 'auto',
        branding: project.color ? {
          primaryColor: project.color,
        } : undefined,
      }
    );

    // Return JSON bundle
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        bundle,
        metadata: {
          projectId: project.projectId,
          projectName: project.name,
          formsCount: formDefinitions.length,
          workflowsCount: workflowDefinitions.length,
          exportedAt: new Date().toISOString(),
        },
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${project.name || 'project'}-bundle.json"`,
        },
      });
    }

    // ZIP format (requires additional library - for future implementation)
    return NextResponse.json(
      { error: 'ZIP format not yet implemented. Use format=json' },
      { status: 501 }
    );
  } catch (error: any) {
    console.error('[Project Bundle Export] Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to export project bundle',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
