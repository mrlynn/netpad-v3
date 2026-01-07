/**
 * Deployment Status Tracker Service
 *
 * Polls Vercel for deployment status and performs health checks
 */

import {
  getDeployment,
  updateDeploymentStatus,
} from '@/lib/deployment/deployments';
import {
  getVercelDeploymentStatus,
  listVercelDeployments,
} from '@/lib/integrations/vercel/client';
import {
  DeploymentStatus,
  HealthCheckResult,
  DeploymentStatusResponse,
} from '@/types/deployment';

/**
 * Poll Vercel for deployment status and update database
 *
 * @param deploymentId - Deployment ID to poll
 * @returns Updated deployment status
 */
export async function pollDeploymentStatus(
  deploymentId: string
): Promise<DeploymentStatusResponse> {
  const deployment = await getDeployment(deploymentId);
  if (!deployment) {
    throw new Error(`Deployment ${deploymentId} not found`);
  }

  // If no Vercel project ID, can't poll
  if (!deployment.vercelProjectId || !deployment.vercelInstallationId) {
    return {
      deploymentId,
      status: deployment.status,
      statusMessage: deployment.statusMessage,
      error: 'Vercel integration not configured',
    };
  }

  try {
    // Get latest deployment for the project
    const deploymentsResult = await listVercelDeployments({
      installationId: deployment.vercelInstallationId,
      projectId: deployment.vercelProjectId,
      limit: 1,
      target: deployment.environment === 'production' ? 'production' : 'staging',
    });

    if (!deploymentsResult.success || !deploymentsResult.data?.deployments) {
      return {
        deploymentId,
        status: deployment.status,
        statusMessage: 'Failed to fetch Vercel deployment status',
        error: deploymentsResult.error || 'Unknown error',
      };
    }

    const latestDeployment = deploymentsResult.data.deployments[0];
    if (!latestDeployment) {
      return {
        deploymentId,
        status: deployment.status,
        statusMessage: 'No deployments found',
      };
    }

    // Map Vercel state to our status
    let newStatus: DeploymentStatus = deployment.status;
    let statusMessage = deployment.statusMessage;
    let deployedUrl = deployment.deployedUrl;
    let deployedAt = deployment.deployedAt;

    if (latestDeployment.state === 'READY') {
      newStatus = 'active';
      statusMessage = 'Deployment successful';
      deployedUrl = latestDeployment.url;
      deployedAt = latestDeployment.readyAt
        ? new Date(latestDeployment.readyAt)
        : new Date(latestDeployment.createdAt);
    } else if (latestDeployment.state === 'ERROR') {
      newStatus = 'failed';
      statusMessage = 'Deployment failed';
    } else if (['BUILDING', 'INITIALIZING', 'QUEUED'].includes(latestDeployment.state)) {
      newStatus = 'deploying';
      statusMessage = `Deployment ${latestDeployment.state.toLowerCase()}`;
    }

    // Update deployment if status changed
    if (newStatus !== deployment.status) {
      await updateDeploymentStatus(deploymentId, newStatus, {
        statusMessage,
        deployedUrl,
        deployedAt,
        vercelProjectId: deployment.vercelProjectId,
        vercelDeploymentId: latestDeployment.id,
      });
    }

    return {
      deploymentId,
      status: newStatus,
      statusMessage,
      vercelStatus: {
        state: latestDeployment.state,
        url: latestDeployment.url,
        readyAt: latestDeployment.readyAt
          ? new Date(latestDeployment.readyAt)
          : undefined,
      },
      deployedUrl,
      deployedAt,
    };
  } catch (error) {
    console.error(`[Status Tracker] Error polling deployment ${deploymentId}:`, error);
    return {
      deploymentId,
      status: deployment.status,
      statusMessage: 'Error polling deployment status',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Perform health check on deployed application
 *
 * @param deployedUrl - URL of deployed application
 * @returns Health check result
 */
export async function healthCheck(
  deployedUrl: string
): Promise<HealthCheckResult> {
  const healthCheckUrl = `${deployedUrl.replace(/\/$/, '')}/api/health`;

  try {
    const response = await fetch(healthCheckUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Timeout after 5 seconds
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return {
        status: 'unhealthy',
        checks: {
          database: 'error',
          forms: 0,
          workflows: 0,
        },
        error: `Health check returned ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      status: data.status || 'healthy',
      checks: {
        database: data.checks?.database || 'ok',
        forms: data.checks?.forms || 0,
        workflows: data.checks?.workflows || 0,
        lastSubmission: data.checks?.lastSubmission
          ? new Date(data.checks.lastSubmission)
          : undefined,
      },
      version: data.version,
      uptime: data.uptime,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      checks: {
        database: 'error',
        forms: 0,
        workflows: 0,
      },
      error: error instanceof Error ? error.message : 'Health check failed',
    };
  }
}

/**
 * Update deployment status in database
 * (Wrapper around deployments service for convenience)
 */
export async function updateDeploymentStatusInDb(
  deploymentId: string,
  status: DeploymentStatus,
  metadata?: {
    statusMessage?: string;
    deployedUrl?: string;
    deployedAt?: Date;
    lastError?: string;
    vercelProjectId?: string;
    vercelDeploymentId?: string;
    healthCheckStatus?: 'healthy' | 'degraded' | 'unhealthy';
    healthCheckError?: string;
  }
): Promise<void> {
  await updateDeploymentStatus(deploymentId, status, metadata);
}

/**
 * Poll deployment status with automatic retries
 */
export async function pollDeploymentStatusWithRetry(
  deploymentId: string,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
  } = {}
): Promise<DeploymentStatusResponse> {
  const { maxRetries = 3, retryDelay = 2000, timeout = 300000 } = options; // 5 min default timeout

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const status = await pollDeploymentStatus(deploymentId);

      // If deployment is complete (active, failed, or paused), return immediately
      if (['active', 'failed', 'paused'].includes(status.status)) {
        return status;
      }

      // Otherwise, wait and retry
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    } catch (error) {
      console.error(`[Status Tracker] Error polling ${deploymentId}:`, error);
      // Continue retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  // Timeout reached
  const deployment = await getDeployment(deploymentId);
  return {
    deploymentId,
    status: deployment?.status || 'failed',
    statusMessage: 'Status polling timed out',
    error: 'Polling timeout exceeded',
  };
}
