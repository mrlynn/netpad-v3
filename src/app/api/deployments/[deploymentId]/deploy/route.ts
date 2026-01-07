/**
 * Deployment Execution API
 *
 * POST /api/deployments/[deploymentId]/deploy
 * Trigger deployment to Vercel
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import {
  getDeployment,
  updateDeploymentStatus,
  updateDeployment,
} from '@/lib/deployment/deployments';
import {
  createVercelProject,
  createVercelDeployment,
  pushEnvironmentVariables,
} from '@/lib/integrations/vercel/client';
import { provisionM0Cluster } from '@/lib/atlas/provisioning';
import { getDecryptedConnectionString } from '@/lib/platform/connectionVault';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Generate a secure secret key
 */
function generateSecretKey(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a base64-encoded encryption key
 */
function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * POST /api/deployments/[deploymentId]/deploy
 * Trigger deployment to Vercel
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

    // Validate deployment is ready
    if (deployment.status !== 'draft' && deployment.status !== 'configuring') {
      return NextResponse.json(
        { error: `Deployment is in ${deployment.status} status and cannot be deployed` },
        { status: 400 }
      );
    }

    // Check Vercel integration
    if (!deployment.vercelInstallationId) {
      return NextResponse.json(
        { error: 'Vercel integration not configured for this deployment' },
        { status: 400 }
      );
    }

    // Update status to configuring
    await updateDeploymentStatus(deploymentId, 'configuring', {
      statusMessage: 'Preparing deployment configuration...',
    });

    // Step 1: Provision database if auto-provisioning
    let connectionString: string | undefined;
    let clusterId: string | undefined;

    if (deployment.database.provisioning === 'auto') {
      await updateDeploymentStatus(deploymentId, 'provisioning', {
        statusMessage: 'Provisioning MongoDB Atlas cluster...',
      });

      const provisionResult = await provisionM0Cluster({
        organizationId: deployment.organizationId,
        projectId: deployment.projectId,
        userId: session.userId,
      });

      if (!provisionResult.success) {
        await updateDeploymentStatus(deploymentId, 'failed', {
          statusMessage: `Database provisioning failed: ${provisionResult.error}`,
          lastError: provisionResult.error || 'Unknown error',
        });
        return NextResponse.json(
          { error: `Database provisioning failed: ${provisionResult.error}` },
          { status: 500 }
        );
      }

      clusterId = provisionResult.clusterId;

      // Get connection string from vault
      if (provisionResult.vaultId) {
        const decryptResult = await getDecryptedConnectionString(
          deployment.organizationId,
          provisionResult.vaultId
        );
        if (decryptResult) {
          connectionString = decryptResult.connectionString;
        }
      }

      // Update deployment with cluster info
      await updateDeployment(deploymentId, {
        database: {
          ...deployment.database,
          clusterId,
          vaultId: provisionResult.vaultId,
        },
      });
    } else if (deployment.database.provisioning === 'existing' && deployment.database.vaultId) {
      // Use existing connection
      const decryptResult = await getDecryptedConnectionString(
        deployment.organizationId,
        deployment.database.vaultId
      );
      if (decryptResult) {
        connectionString = decryptResult.connectionString;
      }
    } else if (deployment.database.connectionString) {
      // Manual connection string (should be encrypted in storage)
      connectionString = deployment.database.connectionString;
    }

    if (!connectionString) {
      await updateDeploymentStatus(deploymentId, 'failed', {
        statusMessage: 'No database connection string available',
        lastError: 'Database connection not configured',
      });
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 400 }
      );
    }

    // Step 2: Prepare environment variables
    // Generate secrets if not already in env vars
    const envVars: Record<string, string> = {
      ...deployment.environmentVariables,
    };

    if (!envVars.SESSION_SECRET) {
      envVars.SESSION_SECRET = generateSecretKey(32);
    }

    if (!envVars.VAULT_ENCRYPTION_KEY) {
      envVars.VAULT_ENCRYPTION_KEY = generateEncryptionKey();
    }

    // Add MongoDB connection
    envVars.MONGODB_URI = connectionString;
    envVars.MONGODB_DATABASE = deployment.database.databaseName || 'netpad_app';
    envVars.NEXT_PUBLIC_APP_URL = '${VERCEL_URL}';
    envVars.APP_URL = '${VERCEL_URL}';
    envVars.STANDALONE_MODE = 'true';

    // Step 3: Create or get Vercel project
    await updateDeploymentStatus(deploymentId, 'deploying', {
      statusMessage: 'Creating Vercel project...',
    });

    let vercelProjectId = deployment.vercelProjectId;

    if (!vercelProjectId) {
      const projectResult = await createVercelProject({
        installationId: deployment.vercelInstallationId!,
        name: deployment.appName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        framework: 'nextjs',
      });

      if (!projectResult.success || !projectResult.data) {
        await updateDeploymentStatus(deploymentId, 'failed', {
          statusMessage: `Failed to create Vercel project: ${projectResult.error}`,
          lastError: projectResult.error || 'Unknown error',
        });
        return NextResponse.json(
          { error: `Failed to create Vercel project: ${projectResult.error}` },
          { status: 500 }
        );
      }

      vercelProjectId = projectResult.data.id;

      // Update deployment with Vercel project ID
      await updateDeployment(deploymentId, {
        vercelProjectId,
      });
    }

    // Step 4: Push environment variables
    await updateDeploymentStatus(deploymentId, 'deploying', {
      statusMessage: 'Configuring environment variables...',
    });

    const envResult = await pushEnvironmentVariables({
      installationId: deployment.vercelInstallationId!,
      projectId: vercelProjectId,
      envVars,
    });

    if (!envResult.success) {
      await updateDeploymentStatus(deploymentId, 'failed', {
        statusMessage: `Failed to configure environment variables: ${envResult.error}`,
        lastError: envResult.error || 'Unknown error',
      });
      return NextResponse.json(
        { error: `Failed to configure environment variables: ${envResult.error}` },
        { status: 500 }
      );
    }

    // Step 5: Trigger deployment
    // Note: For now, we'll return success and let Vercel auto-deploy from Git
    // In the future, we can trigger deployment via API if we push code programmatically
    await updateDeploymentStatus(deploymentId, 'deploying', {
      statusMessage: 'Deployment in progress...',
      vercelProjectId,
    });

    // For now, deployment URL will be set when we check status
    // Vercel projects get auto-deployed URLs like: {project-name}.vercel.app

    return NextResponse.json({
      success: true,
      message: 'Deployment initiated successfully',
      deployment: {
        deploymentId,
        vercelProjectId,
        status: 'deploying',
        // Deployment URL will be available after Vercel completes deployment
        deployedUrl: `https://${deployment.appName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.vercel.app`,
      },
    });
  } catch (error) {
    console.error('[Deployments API] Deploy error:', error);

    // Try to update deployment status to failed
    try {
      const { deploymentId } = await params;
      await updateDeploymentStatus(deploymentId, 'failed', {
        statusMessage: error instanceof Error ? error.message : 'Deployment failed',
        lastError: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (updateError) {
      console.error('[Deployments API] Failed to update status:', updateError);
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to deploy',
      },
      { status: 500 }
    );
  }
}
