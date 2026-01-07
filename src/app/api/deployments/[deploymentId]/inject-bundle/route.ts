/**
 * Bundle Injection API
 *
 * POST /api/deployments/[deploymentId]/inject-bundle
 * Injects application bundle into the deployment template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { getDeployment, updateDeploymentStatus } from '@/lib/deployment/deployments';
import {
  injectBundleIntoTemplate,
  validateBundle,
} from '@/lib/deployment/bundle-injector';
import { BundleExport } from '@/types/template';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * POST /api/deployments/[deploymentId]/inject-bundle
 * Inject bundle into template for deployment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deploymentId: string }> }
) {
  try {
    const session = await getSession();
    const { deploymentId } = await params;

    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const deployment = await getDeployment(deploymentId);
    if (!deployment) {
      return NextResponse.json(
        { error: 'Deployment not found' },
        { status: 404 }
      );
    }

    // Check organization permissions
    const permissions = await getUserOrgPermissions(
      session.userId,
      deployment.organizationId
    );
    if (!permissions.orgRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { bundle } = body as { bundle: BundleExport };

    if (!bundle) {
      return NextResponse.json(
        { error: 'Bundle is required' },
        { status: 400 }
      );
    }

    // Validate bundle structure
    const validation = validateBundle(bundle);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Bundle validation failed',
          validationErrors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Get template path
    const templatePath =
      process.env.TEMPLATE_PATH ||
      path.join(process.cwd(), 'templates', 'standalone-app');

    // Inject bundle into template
    const bundlePath = await injectBundleIntoTemplate(templatePath, bundle);

    // Update deployment status
    await updateDeploymentStatus(deploymentId, 'configuring', {
      statusMessage: 'Bundle injected successfully',
    });

    return NextResponse.json({
      success: true,
      message: 'Bundle injected successfully',
      bundlePath,
      bundle: {
        name: bundle.manifest?.name,
        version: bundle.manifest?.version,
        formsCount: bundle.forms?.length || 0,
        workflowsCount: bundle.workflows?.length || 0,
      },
    });
  } catch (error) {
    console.error('[Bundle Injection] Error:', error);

    // Try to update deployment status
    try {
      const { deploymentId } = await params;
      await updateDeploymentStatus(deploymentId, 'failed', {
        statusMessage: `Bundle injection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (updateError) {
      console.error('[Bundle Injection] Failed to update status:', updateError);
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Bundle injection failed',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/deployments/[deploymentId]/inject-bundle
 * Check if bundle is injected for this deployment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deploymentId: string }> }
) {
  try {
    const session = await getSession();
    const { deploymentId } = await params;

    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const deployment = await getDeployment(deploymentId);
    if (!deployment) {
      return NextResponse.json(
        { error: 'Deployment not found' },
        { status: 404 }
      );
    }

    // Check organization permissions
    const permissions = await getUserOrgPermissions(
      session.userId,
      deployment.organizationId
    );
    if (!permissions.orgRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      deploymentId,
      hasBundle: !!deployment.deployedBundle,
      bundle: deployment.deployedBundle
        ? {
            formsCount: deployment.deployedBundle.formsCount,
            workflowsCount: deployment.deployedBundle.workflowsCount,
            exportedAt: deployment.deployedBundle.exportedAt,
          }
        : null,
      bundleVersion: deployment.bundleVersion,
    });
  } catch (error) {
    console.error('[Bundle Injection] Get error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get bundle status',
      },
      { status: 500 }
    );
  }
}
