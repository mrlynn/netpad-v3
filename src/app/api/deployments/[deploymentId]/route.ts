/**
 * Deployment Details API
 *
 * GET    /api/deployments/[deploymentId] - Get deployment details
 * PATCH  /api/deployments/[deploymentId] - Update deployment
 * DELETE /api/deployments/[deploymentId] - Delete deployment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import {
  getDeployment,
  updateDeployment,
  deleteDeployment,
} from '@/lib/deployment/deployments';
import { UpdateDeploymentInput } from '@/types/deployment';

export const dynamic = 'force-dynamic';

/**
 * GET /api/deployments/[deploymentId]
 * Get deployment details
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

    // Return deployment (exclude sensitive env vars in response)
    const { environmentVariables, ...safeDeployment } = deployment;

    return NextResponse.json({
      deployment: safeDeployment,
      // Include env var keys but not values
      environmentVariableKeys: Object.keys(environmentVariables || {}),
    });
  } catch (error) {
    console.error('[Deployments API] Get error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get deployment',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/deployments/[deploymentId]
 * Update deployment configuration
 */
export async function PATCH(
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

    const body = await request.json();
    const updates: UpdateDeploymentInput = {
      appName: body.appName,
      environment: body.environment,
      database: body.database,
      environmentVariables: body.environmentVariables,
      branding: body.branding,
      customDomain: body.customDomain,
      status: body.status,
      statusMessage: body.statusMessage,
      deployedUrl: body.deployedUrl,
      healthCheckStatus: body.healthCheckStatus,
    };

    // Remove undefined values
    Object.keys(updates).forEach(
      (key) => updates[key as keyof UpdateDeploymentInput] === undefined && delete updates[key as keyof UpdateDeploymentInput]
    );

    const updated = await updateDeployment(deploymentId, updates);

    if (!updated) {
      return NextResponse.json(
        { error: 'Deployment not found' },
        { status: 404 }
      );
    }

    // Return safe deployment (exclude env var values)
    const { environmentVariables, ...safeDeployment } = updated;

    return NextResponse.json({
      success: true,
      deployment: safeDeployment,
      environmentVariableKeys: Object.keys(environmentVariables || {}),
    });
  } catch (error) {
    console.error('[Deployments API] Update error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update deployment',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/deployments/[deploymentId]
 * Delete deployment (soft delete)
 */
export async function DELETE(
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

    // Check organization permissions (only admins can delete)
    const permissions = await getUserOrgPermissions(
      session.userId,
      deployment.organizationId
    );
    if (!permissions.isOrgAdmin) {
      return NextResponse.json(
        { error: 'Only organization admins can delete deployments' },
        { status: 403 }
      );
    }

    await deleteDeployment(deploymentId);

    return NextResponse.json({
      success: true,
      message: 'Deployment deleted successfully',
    });
  } catch (error) {
    console.error('[Deployments API] Delete error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete deployment',
      },
      { status: 500 }
    );
  }
}
