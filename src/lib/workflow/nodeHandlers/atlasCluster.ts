/**
 * Atlas Cluster Management Node Handler
 *
 * Manages MongoDB Atlas clusters via the Admin API.
 * Requires Atlas Admin API credentials stored as an integration credential.
 *
 * Config:
 *   - credentialId: Integration credential ID containing Atlas API keys
 *   - operation: 'list' | 'get_status' | 'create' | 'delete' | 'list_projects'
 *   - projectId: Atlas project ID (required for cluster operations)
 *   - clusterName: Target cluster name (required for single cluster operations)
 *   - clusterConfig: Configuration for create operations (provider, region)
 *
 * Output varies by operation:
 *   - list: { clusters: AtlasCluster[], count: number }
 *   - get_status: { cluster: AtlasCluster, state: string }
 *   - create: { cluster: AtlasCluster }
 *   - delete: { success: true, clusterName: string }
 *   - list_projects: { projects: AtlasProject[], count: number }
 */

import { registerHandler } from './registry';
import {
  ExtendedNodeContext,
  NodeHandler,
  HandlerMetadata,
  successResult,
  failureResult,
  NodeErrorCodes,
} from './types';
import { createAtlasClientFromCredential } from '@/lib/atlas/client';

const metadata: HandlerMetadata = {
  type: 'atlas-cluster',
  name: 'Atlas Cluster',
  description: 'Manage MongoDB Atlas clusters (list, create, delete, status)',
  version: '1.0.0',
};

type ClusterOperation =
  | 'list'
  | 'get_status'
  | 'create'
  | 'delete'
  | 'list_projects';

interface ClusterConfig {
  provider?: 'AWS' | 'GCP' | 'AZURE';
  region?: string;
}

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Starting Atlas cluster operation', {
    nodeId: context.nodeId,
  });

  const { resolvedConfig } = context;

  // Extract configuration
  const credentialId = resolvedConfig.credentialId as string | undefined;
  const operation = (resolvedConfig.operation as ClusterOperation) || 'get_status';
  const projectId = resolvedConfig.projectId as string | undefined;
  const clusterName = resolvedConfig.clusterName as string | undefined;
  const clusterConfig = resolvedConfig.clusterConfig as ClusterConfig | undefined;

  // Validate required config
  if (!credentialId) {
    await context.log('error', 'Atlas credential ID is required');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'Atlas credential ID is required',
      false
    );
  }

  // Create Atlas client from stored credentials
  const clientResult = await createAtlasClientFromCredential(context.orgId, credentialId);
  if (!clientResult) {
    await context.log('error', 'Could not retrieve Atlas credentials');
    return failureResult(
      NodeErrorCodes.MISSING_CONNECTION,
      'Could not retrieve Atlas credentials. Please verify the credential is configured correctly.',
      false
    );
  }

  const { client, atlasOrgId } = clientResult;

  await context.log('info', `Executing Atlas operation: ${operation}`, {
    atlasOrgId,
    projectId,
    clusterName,
  });

  try {
    let result: Record<string, unknown>;

    switch (operation) {
      case 'list_projects': {
        // List all projects in the Atlas organization
        // We use the internal request method with proper type handling
        const listResult = await (client as any).request(
          'GET',
          `/orgs/${atlasOrgId}/groups`
        ) as { success: boolean; data?: { results: any[] }; error?: any };

        if (!listResult.success) {
          await context.log('error', 'Failed to list projects', { error: listResult.error });
          return failureResult(
            NodeErrorCodes.OPERATION_FAILED,
            String(listResult.error?.detail || 'Failed to list projects'),
            true
          );
        }

        result = {
          projects: listResult.data?.results || [],
          count: listResult.data?.results?.length || 0,
          operation: 'list_projects',
        };
        break;
      }

      case 'list': {
        if (!projectId) {
          await context.log('error', 'Project ID is required for list operation');
          return failureResult(
            NodeErrorCodes.MISSING_CONFIG,
            'Project ID is required to list clusters',
            false
          );
        }

        const listResult = await client.listClusters(projectId);
        if (!listResult.success) {
          await context.log('error', 'Failed to list clusters', { error: listResult.error });
          return failureResult(
            NodeErrorCodes.OPERATION_FAILED,
            listResult.error?.detail || 'Failed to list clusters',
            true
          );
        }

        result = {
          clusters: listResult.data || [],
          count: (listResult.data || []).length,
          operation: 'list',
        };
        break;
      }

      case 'get_status': {
        if (!projectId || !clusterName) {
          await context.log('error', 'Project ID and cluster name are required');
          return failureResult(
            NodeErrorCodes.MISSING_CONFIG,
            'Project ID and cluster name are required to get cluster status',
            false
          );
        }

        const statusResult = await client.getCluster(projectId, clusterName);
        if (!statusResult.success) {
          await context.log('error', 'Failed to get cluster status', { error: statusResult.error });
          return failureResult(
            NodeErrorCodes.OPERATION_FAILED,
            statusResult.error?.detail || 'Failed to get cluster status',
            true
          );
        }

        result = {
          cluster: statusResult.data,
          state: statusResult.data?.stateName,
          connectionStrings: statusResult.data?.connectionStrings,
          operation: 'get_status',
        };
        break;
      }

      case 'create': {
        if (!projectId || !clusterName) {
          await context.log('error', 'Project ID and cluster name are required for create');
          return failureResult(
            NodeErrorCodes.MISSING_CONFIG,
            'Project ID and cluster name are required to create a cluster',
            false
          );
        }

        await context.log('info', 'Creating M0 cluster', {
          projectId,
          clusterName,
          provider: clusterConfig?.provider || 'AWS',
          region: clusterConfig?.region || 'US_EAST_1',
        });

        const createResult = await client.createM0Cluster(projectId, {
          name: clusterName,
          providerSettings: {
            providerName: 'TENANT',
            backingProviderName: clusterConfig?.provider || 'AWS',
            regionName: (clusterConfig?.region || 'US_EAST_1') as any,
            instanceSizeName: 'M0',
          },
        });

        if (!createResult.success) {
          await context.log('error', 'Failed to create cluster', { error: createResult.error });
          return failureResult(
            NodeErrorCodes.OPERATION_FAILED,
            createResult.error?.detail || 'Failed to create cluster',
            true
          );
        }

        result = {
          cluster: createResult.data,
          operation: 'create',
          message: 'Cluster creation initiated. It may take a few minutes to become ready.',
        };
        break;
      }

      case 'delete': {
        if (!projectId || !clusterName) {
          await context.log('error', 'Project ID and cluster name are required for delete');
          return failureResult(
            NodeErrorCodes.MISSING_CONFIG,
            'Project ID and cluster name are required to delete a cluster',
            false
          );
        }

        await context.log('warn', 'Deleting cluster', { projectId, clusterName });

        const deleteResult = await client.deleteCluster(projectId, clusterName);
        if (!deleteResult.success) {
          await context.log('error', 'Failed to delete cluster', { error: deleteResult.error });
          return failureResult(
            NodeErrorCodes.OPERATION_FAILED,
            deleteResult.error?.detail || 'Failed to delete cluster',
            true
          );
        }

        result = {
          success: true,
          operation: 'delete',
          clusterName,
          message: 'Cluster deletion initiated.',
        };
        break;
      }

      default:
        await context.log('error', `Unknown operation: ${operation}`);
        return failureResult(
          NodeErrorCodes.INVALID_OPERATION,
          `Unknown operation: ${operation}. Valid operations: list, get_status, create, delete, list_projects`,
          false
        );
    }

    await context.log('info', 'Atlas cluster operation completed', {
      operation,
      durationMs: Date.now() - startTime,
    });

    return successResult(result, {
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await context.log('error', 'Atlas cluster operation failed', {
      error: errorMessage,
      operation,
    });

    // Determine if error is retryable
    const isRetryable =
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('rate limit');

    return failureResult(
      isRetryable ? NodeErrorCodes.CONNECTION_FAILED : NodeErrorCodes.OPERATION_FAILED,
      `Atlas operation failed: ${errorMessage}`,
      isRetryable
    );
  }
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
