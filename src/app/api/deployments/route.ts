/**
 * Deployments API
 *
 * POST   /api/deployments - Create deployment configuration
 * GET    /api/deployments?projectId={id} - List deployments for project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import {
  createDeployment,
  listDeployments,
} from '@/lib/deployment/deployments';
import { CreateDeploymentInput } from '@/types/deployment';

export const dynamic = 'force-dynamic';

/**
 * POST /api/deployments
 * Create a new deployment configuration
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      projectId,
      organizationId,
      target,
      appName,
      environment,
      database,
      environmentVariables,
      branding,
      vercelInstallationId,
    } = body;

    // Validate required fields
    if (!projectId || !organizationId || !target || !appName) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, organizationId, target, appName' },
        { status: 400 }
      );
    }

    // Check organization permissions
    const permissions = await getUserOrgPermissions(session.userId, organizationId);
    if (!permissions.orgRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    // Create deployment
    const input: CreateDeploymentInput = {
      projectId,
      organizationId,
      createdBy: session.userId,
      target,
      appName,
      environment: environment || 'production',
      database: database || {
        provisioning: 'auto',
      },
      environmentVariables: environmentVariables || {},
      branding,
      vercelInstallationId,
    };

    const deployment = await createDeployment(input);

    return NextResponse.json({
      success: true,
      deployment: {
        deploymentId: deployment.deploymentId,
        projectId: deployment.projectId,
        organizationId: deployment.organizationId,
        target: deployment.target,
        appName: deployment.appName,
        environment: deployment.environment,
        status: deployment.status,
        createdAt: deployment.createdAt,
        updatedAt: deployment.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Deployments API] Create error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create deployment',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/deployments
 * List deployments for a project or organization
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status');
    const target = searchParams.get('target');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    if (!projectId && !organizationId) {
      return NextResponse.json(
        { error: 'projectId or organizationId query parameter is required' },
        { status: 400 }
      );
    }

    // If organizationId provided, verify membership
    if (organizationId) {
      const permissions = await getUserOrgPermissions(session.userId, organizationId);
      if (!permissions.orgRole) {
        return NextResponse.json(
          { error: 'Not a member of this organization' },
          { status: 403 }
        );
      }
    }

    // For now, we only support projectId-based listing
    // TODO: Add organizationId-based listing if needed
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      );
    }

    const result = await listDeployments(projectId, {
      page,
      pageSize,
      status: status as any,
      target: target || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Deployments API] List error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to list deployments',
      },
      { status: 500 }
    );
  }
}
