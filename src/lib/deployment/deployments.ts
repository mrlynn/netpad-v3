/**
 * Deployment Service
 *
 * Manages deployment configurations and lifecycle
 */

import { ObjectId } from 'mongodb';
import { getDeploymentsCollection } from '@/lib/platform/db';
import { generateSecureId } from '@/lib/encryption';
import {
  Deployment,
  CreateDeploymentInput,
  UpdateDeploymentInput,
  DeploymentStatus,
} from '@/types/deployment';

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a unique deployment ID
 */
function generateDeploymentId(): string {
  return generateSecureId('deploy');
}

// ============================================
// Deployment CRUD
// ============================================

/**
 * Create a new deployment configuration
 */
export async function createDeployment(
  input: CreateDeploymentInput
): Promise<Deployment> {
  const deploymentsCollection = await getDeploymentsCollection();

  const deployment: Deployment = {
    deploymentId: generateDeploymentId(),
    projectId: input.projectId,
    organizationId: input.organizationId,
    createdBy: input.createdBy,
    target: input.target,
    appName: input.appName,
    environment: input.environment,
    database: input.database,
    environmentVariables: input.environmentVariables,
    branding: input.branding,
    vercelInstallationId: input.vercelInstallationId,
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await deploymentsCollection.insertOne(deployment);
  return deployment;
}

/**
 * Get deployment by ID
 */
export async function getDeployment(
  deploymentId: string
): Promise<Deployment | null> {
  const deploymentsCollection = await getDeploymentsCollection();
  return deploymentsCollection.findOne({
    deploymentId,
    deletedAt: { $exists: false },
  });
}

/**
 * Get deployment by Vercel project ID
 */
export async function getDeploymentByVercelProjectId(
  vercelProjectId: string
): Promise<Deployment | null> {
  const deploymentsCollection = await getDeploymentsCollection();
  return deploymentsCollection.findOne({
    vercelProjectId,
    deletedAt: { $exists: false },
  });
}

/**
 * List deployments for a project
 */
export interface ListDeploymentsOptions {
  page?: number;
  pageSize?: number;
  status?: DeploymentStatus;
  target?: string;
}

export interface ListDeploymentsResult {
  deployments: Deployment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listDeployments(
  projectId: string,
  options: ListDeploymentsOptions = {}
): Promise<ListDeploymentsResult> {
  const deploymentsCollection = await getDeploymentsCollection();
  const {
    page = 1,
    pageSize = 20,
    status,
    target,
  } = options;

  // Build query
  const query: Record<string, unknown> = {
    projectId,
    deletedAt: { $exists: false },
  };

  if (status) {
    query.status = status;
  }

  if (target) {
    query.target = target;
  }

  // Get total count
  const total = await deploymentsCollection.countDocuments(query);

  // Get paginated results
  const deployments = await deploymentsCollection
    .find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  return {
    deployments,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Update deployment
 */
export async function updateDeployment(
  deploymentId: string,
  updates: UpdateDeploymentInput
): Promise<Deployment | null> {
  const deploymentsCollection = await getDeploymentsCollection();

  const result = await deploymentsCollection.findOneAndUpdate(
    {
      deploymentId,
      deletedAt: { $exists: false },
    },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      } as Partial<Deployment>,
    },
    { returnDocument: 'after' }
  );

  return result || null;
}

/**
 * Update deployment status
 */
export async function updateDeploymentStatus(
  deploymentId: string,
  status: DeploymentStatus,
  metadata?: {
    statusMessage?: string;
    deployedUrl?: string;
    deployedAt?: Date;
    lastError?: string;
    vercelProjectId?: string;
    vercelDeploymentId?: string;
  }
): Promise<Deployment | null> {
  const updates: UpdateDeploymentInput = {
    status,
    statusMessage: metadata?.statusMessage,
    deployedUrl: metadata?.deployedUrl,
  };

  if (metadata?.deployedAt) {
    // Need to handle Date in update
    const deploymentsCollection = await getDeploymentsCollection();
    const updateDoc: any = {
      $set: {
        ...updates,
        deployedAt: metadata.deployedAt,
        updatedAt: new Date(),
      },
    };

    if (metadata.vercelProjectId) {
      updateDoc.$set.vercelProjectId = metadata.vercelProjectId;
    }

    if (metadata.vercelDeploymentId) {
      updateDoc.$set.vercelDeploymentId = metadata.vercelDeploymentId;
    }

    if (metadata.lastError) {
      updateDoc.$set.lastError = metadata.lastError;
      updateDoc.$set.lastErrorAt = new Date();
      updateDoc.$inc = { errorCount: 1 };
    }

    const result = await deploymentsCollection.findOneAndUpdate(
      {
        deploymentId,
        deletedAt: { $exists: false },
      },
      updateDoc,
      { returnDocument: 'after' }
    );

    return result || null;
  }

  return updateDeployment(deploymentId, updates);
}

/**
 * Delete deployment (soft delete)
 */
export async function deleteDeployment(
  deploymentId: string
): Promise<boolean> {
  const deploymentsCollection = await getDeploymentsCollection();

  const result = await deploymentsCollection.updateOne(
    { deploymentId },
    {
      $set: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount === 1;
}

/**
 * Get all active deployments for an organization
 */
export async function getActiveDeployments(
  organizationId: string
): Promise<Deployment[]> {
  const deploymentsCollection = await getDeploymentsCollection();
  return deploymentsCollection
    .find({
      organizationId,
      status: 'active',
      deletedAt: { $exists: false },
    })
    .sort({ deployedAt: -1 })
    .toArray();
}
