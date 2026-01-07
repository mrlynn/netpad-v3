/**
 * Deployment Status API
 *
 * GET /api/deployments/[deploymentId]/status
 * Get current deployment status from Vercel
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import {
  getDeployment,
} from '@/lib/deployment/deployments';
import {
  getVercelDeploymentStatus,
  listVercelDeployments,
} from '@/lib/integrations/vercel/client';
import { DeploymentStatusResponse } from '@/types/deployment';

export const dynamic = 'force-dynamic';

/**
 * GET /api/deployments/[deploymentId]/status
 * Get deployment status
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

    const response: DeploymentStatusResponse = {
      deploymentId,
      status: deployment.status,
      statusMessage: deployment.statusMessage,
      deployedUrl: deployment.deployedUrl,
      deployedAt: deployment.deployedAt,
      error: deployment.lastError,
    };

    // If we have Vercel project ID, get latest deployment status
    if (deployment.vercelProjectId && deployment.vercelInstallationId) {
      try {
        // Get latest deployment for the project
        const deploymentsResult = await listVercelDeployments({
          installationId: deployment.vercelInstallationId,
          projectId: deployment.vercelProjectId,
          limit: 1,
          target: deployment.environment === 'production' ? 'production' : 'staging',
        });

        if (deploymentsResult.success && deploymentsResult.data?.deployments) {
          const latestDeployment = deploymentsResult.data.deployments[0];
          if (latestDeployment) {
            response.vercelStatus = {
              state: latestDeployment.state,
              url: latestDeployment.url,
              readyAt: latestDeployment.readyAt
                ? new Date(latestDeployment.readyAt)
                : undefined,
            };

            // Map Vercel state to our status
            if (latestDeployment.state === 'READY') {
              response.status = 'active';
              response.deployedUrl = latestDeployment.url;
              response.deployedAt = latestDeployment.readyAt
                ? new Date(latestDeployment.readyAt)
                : new Date(latestDeployment.createdAt);
            } else if (latestDeployment.state === 'ERROR') {
              response.status = 'failed';
            } else if (['BUILDING', 'INITIALIZING', 'QUEUED'].includes(latestDeployment.state)) {
              response.status = 'deploying';
            }
          }
        }

        // If we have a specific deployment ID, get its status
        if (deployment.vercelDeploymentId) {
          const deploymentStatusResult = await getVercelDeploymentStatus({
            installationId: deployment.vercelInstallationId,
            deploymentId: deployment.vercelDeploymentId,
          });

          if (deploymentStatusResult.success && deploymentStatusResult.data) {
            const vercelDeployment = deploymentStatusResult.data;
            response.vercelStatus = {
              state: vercelDeployment.state,
              url: vercelDeployment.url,
              readyAt: vercelDeployment.readyAt
                ? new Date(vercelDeployment.readyAt)
                : undefined,
            };
          }
        }
      } catch (error) {
        console.error('[Deployment Status] Error fetching Vercel status:', error);
        // Continue without Vercel status
      }
    }

    // Perform health check if deployment is active and has URL
    if (deployment.status === 'active' && deployment.deployedUrl) {
      try {
        const healthCheckUrl = `${deployment.deployedUrl}/api/health`;
        const healthResponse = await fetch(healthCheckUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Timeout after 5 seconds
          signal: AbortSignal.timeout(5000),
        });

        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          response.healthCheck = {
            status: healthData.status || 'healthy',
            checkedAt: new Date(),
          };
        } else {
          response.healthCheck = {
            status: 'unhealthy',
            checkedAt: new Date(),
            error: `Health check returned ${healthResponse.status}`,
          };
        }
      } catch (error) {
        response.healthCheck = {
          status: 'unhealthy',
          checkedAt: new Date(),
          error: error instanceof Error ? error.message : 'Health check failed',
        };
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Deployments API] Status error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get deployment status',
      },
      { status: 500 }
    );
  }
}
