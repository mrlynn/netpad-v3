/**
 * Project Download API
 *
 * POST /api/projects/[projectId]/download
 * Generate and download a standalone Next.js application bundle
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getProject } from '@/lib/platform/projects';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { getWorkflowsCollection } from '@/lib/workflow/db';
import { generateStandaloneBundle, BundleOptions } from '@/lib/standalone';
import { FormConfiguration } from '@/types/form';
import { WorkflowDocument } from '@/types/workflow';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for bundle generation

interface DownloadRequestBody {
  appName: string;
  description?: string;
  includeAdmin: boolean;
  includeWorkflows: boolean;
  deployTarget: 'vercel' | 'docker' | 'generic';
  includeSampleData?: boolean;
  removeBranding?: boolean;
}

/**
 * POST /api/projects/[projectId]/download
 * Generate a standalone app bundle and return as ZIP
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    // Authenticate user
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
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

    // Check organization permissions
    const permissions = await getUserOrgPermissions(session.userId, project.organizationId);
    if (!permissions.orgRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: DownloadRequestBody = await request.json();

    // Validate required fields
    if (!body.appName?.trim()) {
      return NextResponse.json(
        { error: 'App name is required' },
        { status: 400 }
      );
    }

    // Validate deploy target
    const validTargets = ['vercel', 'docker', 'generic'];
    if (!validTargets.includes(body.deployTarget)) {
      return NextResponse.json(
        { error: 'Invalid deploy target' },
        { status: 400 }
      );
    }

    // Get all forms in the project
    const formsCollection = await getOrgFormsCollection(project.organizationId);
    const formsData = await formsCollection
      .find({ projectId })
      .toArray();

    if (formsData.length === 0) {
      return NextResponse.json(
        { error: 'No forms found in this project' },
        { status: 400 }
      );
    }

    // Convert to FormConfiguration format
    const forms: FormConfiguration[] = formsData.map((form) => ({
      ...form,
      id: form.formId || (form as any).id,
      formId: form.formId || (form as any).id,
    })) as unknown as FormConfiguration[];

    // Get workflows if requested
    let workflows: WorkflowDocument[] = [];
    if (body.includeWorkflows) {
      const workflowsCollection = await getWorkflowsCollection(project.organizationId);
      const workflowsData = await workflowsCollection
        .find({ projectId })
        .toArray();
      workflows = workflowsData as unknown as WorkflowDocument[];
    }

    // Prepare bundle options
    const bundleOptions: BundleOptions = {
      projectName: body.appName,
      description: body.description,
      includeAdmin: body.includeAdmin,
      includeWorkflows: body.includeWorkflows && workflows.length > 0,
      deployTarget: body.deployTarget,
      forms,
      workflows: workflows.length > 0 ? workflows : undefined,
      theme: project.color
        ? { primaryColor: project.color }
        : undefined,
      includeSampleData: body.includeSampleData,
      removeBranding: body.removeBranding, // TODO: Validate subscription status before allowing
    };

    // Generate the bundle
    console.log('[Download API] Generating bundle for project:', projectId, {
      appName: body.appName,
      formsCount: forms.length,
      workflowsCount: workflows.length,
      deployTarget: body.deployTarget,
    });

    const zipBuffer = await generateStandaloneBundle(bundleOptions);

    // Generate safe filename
    const safeFilename = body.appName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'my-app';

    // Return ZIP file (convert Buffer to Uint8Array for Response compatibility)
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${safeFilename}-app.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('[Download API] Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate download bundle',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
