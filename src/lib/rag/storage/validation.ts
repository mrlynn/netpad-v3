/**
 * Cluster Validation Service
 *
 * Validates MongoDB Atlas clusters for RAG storage compatibility
 * Ensures clusters meet minimum requirements for vector search
 */

import { MongoClient } from 'mongodb';
import { getOrgDb, getPlatformDb } from '@/lib/platform/db';

/**
 * Validation issue severity levels
 */
export type ValidationSeverity = 'error' | 'warning';

/**
 * Individual validation issue
 */
export interface ValidationIssue {
  /** Error/warning code */
  code: string;

  /** Severity level */
  severity: ValidationSeverity;

  /** Human-readable message */
  message: string;

  /** Optional resolution steps */
  resolution?: string;
}

/**
 * Cluster validation result
 */
export interface ClusterValidationResult {
  /** Overall validation status */
  isValid: boolean;

  /** MongoDB cluster tier (e.g., "M10", "M20", etc.) */
  clusterTier: string | null;

  /** MongoDB server version */
  mongoVersion: string | null;

  /** Whether Atlas Vector Search is available */
  vectorSearchAvailable: boolean;

  /** List of validation issues found */
  issues: ValidationIssue[];

  /** Connection test successful */
  connectionSuccessful: boolean;

  /** Response latency in ms */
  latencyMs: number;
}

// Minimum requirements for RAG storage
const MIN_MONGO_VERSION = '6.0.11'; // MongoDB 6.0.11+ required for Atlas Vector Search
const REQUIRED_CLUSTER_TIERS = ['M10', 'M20', 'M30', 'M40', 'M50', 'M60', 'M80', 'M140', 'M200', 'M300', 'M400', 'M700'];

/**
 * Validate a MongoDB Atlas cluster for RAG storage
 *
 * @param organizationId - Organization ID
 * @param connectionId - Connection ID (optional - if not provided, uses org's default connection)
 * @returns Validation result with issues and recommendations
 */
export async function validateClusterForRAG(
  organizationId: string,
  connectionId?: string
): Promise<ClusterValidationResult> {
  const startTime = Date.now();
  const issues: ValidationIssue[] = [];
  let connectionSuccessful = false;
  let mongoVersion: string | null = null;
  let clusterTier: string | null = null;
  let vectorSearchAvailable = false;

  try {
    // Get database connection
    const db = await getOrgDb(organizationId);
    const client = db.client as MongoClient;

    // Test connection
    await client.db('admin').command({ ping: 1 });
    connectionSuccessful = true;

    // Get server info
    const serverInfo = await client.db('admin').command({ buildInfo: 1 });
    mongoVersion = serverInfo.version;

    // Validate MongoDB version
    if (mongoVersion && !isVersionCompatible(mongoVersion, MIN_MONGO_VERSION)) {
      issues.push({
        code: 'MONGO_VERSION_TOO_OLD',
        severity: 'error',
        message: `MongoDB version ${mongoVersion} is too old. Version ${MIN_MONGO_VERSION}+ is required for Atlas Vector Search.`,
        resolution: 'Upgrade your MongoDB Atlas cluster to version 6.0.11 or later.',
      });
    }

    // Detect cluster tier from connection string or Atlas API
    clusterTier = await detectClusterTier(client);

    if (clusterTier && !REQUIRED_CLUSTER_TIERS.includes(clusterTier)) {
      issues.push({
        code: 'CLUSTER_TIER_TOO_SMALL',
        severity: 'error',
        message: `Cluster tier ${clusterTier} does not support Atlas Vector Search. M10+ cluster is required.`,
        resolution: 'Upgrade to an M10 or larger cluster to use RAG features.',
      });
    }

    // Check if Atlas Vector Search is available
    vectorSearchAvailable = await checkVectorSearchSupport(client);

    if (!vectorSearchAvailable) {
      issues.push({
        code: 'VECTOR_SEARCH_NOT_AVAILABLE',
        severity: 'error',
        message: 'Atlas Vector Search is not available on this cluster.',
        resolution: 'Ensure you are using MongoDB Atlas (not a self-hosted cluster) with an M10+ tier.',
      });
    }

    // Check for adequate storage space (warning only)
    try {
      const dbStats = await db.stats();
      const freeSpaceGB = (dbStats.fsTotalSize - dbStats.fsUsedSize) / (1024 ** 3);

      if (freeSpaceGB < 10) {
        issues.push({
          code: 'LOW_STORAGE_SPACE',
          severity: 'warning',
          message: `Only ${freeSpaceGB.toFixed(2)} GB of free storage available.`,
          resolution: 'Consider upgrading your cluster tier for more storage capacity.',
        });
      }
    } catch (error) {
      // Stats might not be available on all configurations, ignore
      console.warn('[Cluster Validation] Could not check storage stats:', error);
    }

  } catch (error) {
    connectionSuccessful = false;

    issues.push({
      code: 'CONNECTION_FAILED',
      severity: 'error',
      message: `Failed to connect to MongoDB cluster: ${error instanceof Error ? error.message : 'Unknown error'}`,
      resolution: 'Check your connection string and ensure the cluster is accessible from your network.',
    });
  }

  // Determine overall validation status
  const hasErrors = issues.some(issue => issue.severity === 'error');
  const isValid = connectionSuccessful && !hasErrors && vectorSearchAvailable;

  return {
    isValid,
    clusterTier,
    mongoVersion,
    vectorSearchAvailable,
    issues,
    connectionSuccessful,
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Check if MongoDB version is compatible
 *
 * @param version - Current version (e.g., "6.0.11")
 * @param minVersion - Minimum required version
 * @returns True if version meets minimum requirement
 */
function isVersionCompatible(version: string, minVersion: string): boolean {
  const versionParts = version.split('.').map(Number);
  const minVersionParts = minVersion.split('.').map(Number);

  for (let i = 0; i < Math.max(versionParts.length, minVersionParts.length); i++) {
    const current = versionParts[i] || 0;
    const required = minVersionParts[i] || 0;

    if (current > required) return true;
    if (current < required) return false;
  }

  return true; // Versions are equal
}

/**
 * Detect cluster tier from connection or server info
 *
 * @param client - MongoDB client
 * @returns Cluster tier string (e.g., "M10") or null if unknown
 */
async function detectClusterTier(client: MongoClient): Promise<string | null> {
  try {
    // Try to get cluster info from Atlas Admin API (if available)
    // For now, we'll infer from connection string or return null

    // Check if it's an Atlas cluster from the connection string
    const connectionString = (client as any).s?.url || '';

    if (connectionString.includes('.mongodb.net')) {
      // It's an Atlas cluster, but we can't determine tier from connection string
      // This would require Atlas Admin API access
      return 'M10+'; // Assume minimum required tier for now
    }

    return null;
  } catch (error) {
    console.warn('[Cluster Validation] Could not detect cluster tier:', error);
    return null;
  }
}

/**
 * Check if Atlas Vector Search is supported
 *
 * @param client - MongoDB client
 * @returns True if vector search is available
 */
async function checkVectorSearchSupport(client: MongoClient): Promise<boolean> {
  try {
    // Try to run a vector search query to test support
    // We'll do this by checking for the $vectorSearch stage in aggregation

    const db = client.db('test_rag_validation');
    const testCollection = db.collection('test');

    // Try to create a search index (will fail on non-Atlas clusters)
    try {
      await testCollection.aggregate([
        {
          $vectorSearch: {
            index: 'nonexistent_index',
            path: 'embedding',
            queryVector: [0, 0, 0],
            numCandidates: 1,
            limit: 1,
          },
        },
      ]).toArray();

      // If we get here without error, vector search is supported
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';

      // If error is about missing index (not unsupported stage), vector search IS supported
      if (
        errorMessage.includes('index') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('does not exist')
      ) {
        return true;
      }

      // If error is about unsupported stage, vector search is NOT supported
      if (
        errorMessage.includes('Unrecognized pipeline stage') ||
        errorMessage.includes('$vectorSearch')
      ) {
        return false;
      }

      // Unknown error, assume not supported
      return false;
    }
  } catch (error) {
    console.warn('[Cluster Validation] Could not check vector search support:', error);
    return false;
  }
}

/**
 * Get validation summary for UI display
 *
 * @param result - Validation result
 * @returns Human-readable summary
 */
export function getValidationSummary(result: ClusterValidationResult): string {
  if (result.isValid) {
    return `Cluster is ready for RAG storage (${result.mongoVersion || 'Unknown version'}, ${result.clusterTier || 'Unknown tier'})`;
  }

  const errorCount = result.issues.filter(i => i.severity === 'error').length;
  const warningCount = result.issues.filter(i => i.severity === 'warning').length;

  if (!result.connectionSuccessful) {
    return 'Failed to connect to cluster';
  }

  if (errorCount > 0) {
    return `Cluster validation failed: ${errorCount} error${errorCount > 1 ? 's' : ''}, ${warningCount} warning${warningCount > 1 ? 's' : ''}`;
  }

  return `Cluster has ${warningCount} warning${warningCount > 1 ? 's' : ''}`;
}

/**
 * Quick validation check for API endpoints
 * Returns simplified result for faster responses
 *
 * @param organizationId - Organization ID
 * @returns Simplified validation result
 */
export async function quickValidateCluster(
  organizationId: string
): Promise<{ valid: boolean; message: string }> {
  try {
    const result = await validateClusterForRAG(organizationId);

    return {
      valid: result.isValid,
      message: getValidationSummary(result),
    };
  } catch (error) {
    return {
      valid: false,
      message: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}
