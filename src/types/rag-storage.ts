/**
 * RAG Storage & Deployment Architecture Type Definitions
 *
 * Types for multi-tier RAG storage deployment model:
 * - Platform storage (NetPad-managed cluster)
 * - User-cluster storage (customer's own MongoDB Atlas cluster)
 * - Usage tracking and limit enforcement
 */

import { ObjectId } from 'mongodb';
import { SubscriptionTier } from './platform';

// ============================================
// Storage Mode Types
// ============================================

/**
 * Storage mode for RAG documents and embeddings
 */
export type RAGStorageMode = 'platform' | 'user-cluster';

// ============================================
// Storage Configuration
// ============================================

/**
 * Platform storage configuration (NetPad-managed cluster)
 */
export interface PlatformStorageConfig {
  /** Region for platform storage */
  region: 'us-east' | 'eu-west' | 'ap-southeast';
}

/**
 * User-cluster storage configuration (customer's own MongoDB cluster)
 */
export interface UserClusterStorageConfig {
  /** Reference to connection vault entry */
  connectionId: string;

  /** Database name for RAG collections */
  database: string;

  /** Optional: customer's Atlas Embedding API key */
  embeddingApiKey?: string;

  /** Optional: use customer's blob storage instead of Vercel */
  useCustomBlobStorage?: boolean;

  /** Optional: custom blob storage configuration */
  blobStorageConfig?: CustomBlobStorageConfig;
}

/**
 * Custom blob storage configuration
 */
export interface CustomBlobStorageConfig {
  /** Storage provider */
  provider: 's3' | 'azure-blob' | 'gcs';

  /** Bucket/container name */
  bucket: string;

  /** Region */
  region: string;

  /** Credentials reference (encrypted) */
  credentialsId?: string;
}

/**
 * Usage limits for RAG features
 */
export interface RAGUsageLimits {
  /** Maximum number of documents (-1 = unlimited) */
  maxDocuments: number;

  /** Maximum storage in bytes (-1 = unlimited) */
  maxStorageBytes: number;

  /** Maximum queries per day (-1 = unlimited) */
  maxQueriesPerDay: number;

  /** Maximum queries per month (-1 = unlimited) */
  maxQueriesPerMonth: number;
}

/**
 * RAG storage status
 */
export interface RAGStorageStatus {
  /** Whether RAG is configured for this organization */
  isConfigured: boolean;

  /** Whether RAG storage is healthy */
  isHealthy: boolean;

  /** Vector index status */
  vectorIndexStatus: 'pending' | 'building' | 'ready' | 'error';

  /** Last health check timestamp */
  lastHealthCheck: Date;

  /** Health check errors (if any) */
  healthCheckErrors?: string[];

  /** Current usage statistics */
  usage: {
    /** Current number of documents */
    documentCount: number;

    /** Current storage usage in bytes */
    storageBytes: number;

    /** Query count today */
    queryCountToday: number;

    /** Query count this month */
    queryCountMonth: number;

    /** Last query timestamp */
    lastQueryAt?: Date;
  };
}

/**
 * Complete RAG storage configuration for an organization
 */
export interface RAGStorageConfig {
  /** Storage mode */
  mode: RAGStorageMode;

  /** Platform storage configuration (if mode = 'platform') */
  platform?: PlatformStorageConfig;

  /** User-cluster storage configuration (if mode = 'user-cluster') */
  userCluster?: UserClusterStorageConfig;

  /** Usage limits */
  limits: RAGUsageLimits;

  /** Current status */
  status: RAGStorageStatus;

  /** Configuration creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;

  /** Previous storage mode (if migrated) */
  migratedFrom?: RAGStorageMode;

  /** Migration date (if migrated) */
  migrationDate?: Date;
}

// ============================================
// Tier-Based Defaults
// ============================================

/**
 * Default RAG storage configuration per subscription tier
 */
export const RAG_STORAGE_DEFAULTS: Record<SubscriptionTier, Partial<RAGStorageConfig>> = {
  free: {
    mode: 'platform',
    platform: { region: 'us-east' },
    limits: {
      maxDocuments: 3,
      maxStorageBytes: 25 * 1024 * 1024, // 25 MB
      maxQueriesPerDay: 50,
      maxQueriesPerMonth: 1500,
    },
  },

  pro: {
    mode: 'platform', // Default, can be changed to 'user-cluster'
    platform: { region: 'us-east' },
    limits: {
      maxDocuments: 50,
      maxStorageBytes: 500 * 1024 * 1024, // 500 MB
      maxQueriesPerDay: -1, // Unlimited
      maxQueriesPerMonth: -1,
    },
  },

  team: {
    mode: 'user-cluster', // Required
    limits: {
      maxDocuments: -1, // Unlimited
      maxStorageBytes: -1,
      maxQueriesPerDay: -1,
      maxQueriesPerMonth: -1,
    },
  },

  enterprise: {
    mode: 'user-cluster', // Required
    limits: {
      maxDocuments: -1,
      maxStorageBytes: -1,
      maxQueriesPerDay: -1,
      maxQueriesPerMonth: -1,
    },
  },
};

// ============================================
// Usage Tracking Types
// ============================================

/**
 * Daily usage record for RAG features
 */
export interface RAGUsageRecord {
  _id?: ObjectId;

  /** Organization ID */
  organizationId: string;

  /** Date in YYYY-MM-DD format */
  date: string;

  // Document metrics
  /** Documents created today */
  documentsCreated: number;

  /** Documents deleted today */
  documentsDeleted: number;

  // Storage metrics
  /** Storage added today (bytes) */
  storageBytesAdded: number;

  /** Storage removed today (bytes) */
  storageBytesRemoved: number;

  // Query metrics
  /** Vector search queries today */
  vectorSearchQueries: number;

  /** Reranking queries today */
  rerankingQueries: number;

  // Embedding metrics
  /** Embedding tokens used today */
  embeddingTokensUsed: number;

  // Current totals (updated daily)
  /** Total documents currently stored */
  totalDocuments: number;

  /** Total storage currently used (bytes) */
  totalStorageBytes: number;

  /** Total chunks currently stored */
  totalChunks: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Usage summary with utilization percentages
 */
export interface RAGUsageSummary {
  /** Organization ID */
  organizationId: string;

  /** Summary period */
  period: 'day' | 'month';

  /** Document usage */
  documents: {
    current: number;
    limit: number;
    utilizationPercent: number;
  };

  /** Storage usage */
  storage: {
    currentBytes: number;
    limitBytes: number;
    utilizationPercent: number;
  };

  /** Query usage */
  queries: {
    today: number;
    todayLimit: number;
    month: number;
    monthLimit: number;
  };

  /** Whether any limit is reached */
  isAtLimit: boolean;

  /** Warning messages */
  warnings: string[];
}

/**
 * Limit check result
 */
export interface LimitCheckResult {
  /** Can upload new documents */
  canUpload: boolean;

  /** Can perform queries */
  canQuery: boolean;

  /** Limit violations */
  violations: LimitViolation[];

  /** Warning messages (approaching limits) */
  warnings: string[];
}

/**
 * Limit violation details
 */
export interface LimitViolation {
  /** Type of limit violated */
  type: 'documents' | 'storage' | 'queries_daily' | 'queries_monthly';

  /** Current value */
  current: number;

  /** Limit value */
  limit: number;

  /** Human-readable message */
  message: string;

  /** Suggested resolution */
  resolution?: string;
}

// ============================================
// Migration Types
// ============================================

/**
 * Migration job status
 */
export type MigrationJobStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Migration job progress tracking
 */
export interface MigrationJobProgress {
  /** Total documents to migrate */
  totalDocuments: number;

  /** Documents migrated so far */
  migratedDocuments: number;

  /** Total chunks to migrate */
  totalChunks: number;

  /** Chunks migrated so far */
  migratedChunks: number;

  /** Total bytes to migrate */
  totalBytes: number;

  /** Bytes migrated so far */
  migratedBytes: number;
}

/**
 * Migration job record
 */
export interface RAGMigrationJob {
  _id?: ObjectId;

  /** Unique job ID */
  id: string;

  /** Organization ID */
  organizationId: string;

  /** Source storage mode */
  sourceMode: RAGStorageMode;

  /** Target storage mode */
  targetMode: RAGStorageMode;

  /** Target configuration (for user-cluster migrations) */
  targetConfig?: UserClusterStorageConfig;

  /** Job status */
  status: MigrationJobStatus;

  /** Progress tracking */
  progress: MigrationJobProgress;

  /** When job started */
  startedAt?: Date;

  /** When job completed */
  completedAt?: Date;

  /** Error message (if failed) */
  error?: string;

  /** Created timestamp */
  createdAt: Date;
}

// ============================================
// Cluster Validation Types
// ============================================

/**
 * Cluster validation result
 */
export interface ClusterValidationResult {
  /** Whether cluster is valid for RAG */
  isValid: boolean;

  /** Cluster tier (e.g., 'M0', 'M10', 'M30') */
  clusterTier: string | null;

  /** MongoDB version */
  mongoVersion: string | null;

  /** Whether vector search is available */
  vectorSearchAvailable: boolean;

  /** Validation issues */
  issues: ValidationIssue[];
}

/**
 * Validation issue
 */
export interface ValidationIssue {
  /** Issue code */
  code: string;

  /** Severity level */
  severity: 'error' | 'warning';

  /** Human-readable message */
  message: string;

  /** Suggested resolution */
  resolution?: string;
}

// ============================================
// Health Monitoring Types
// ============================================

/**
 * Health check status
 */
export type HealthCheckStatus = 'pass' | 'warn' | 'fail';

/**
 * Individual health check result
 */
export interface HealthCheck {
  /** Check status */
  status: HealthCheckStatus;

  /** Latency in milliseconds */
  latencyMs?: number;

  /** Status message */
  message?: string;

  /** Last error */
  lastError?: string;

  /** Last error timestamp */
  lastErrorAt?: Date;
}

/**
 * Overall RAG health status
 */
export interface RAGHealthStatus {
  /** Organization ID */
  organizationId: string;

  /** Storage mode */
  storageMode: RAGStorageMode;

  /** Overall health */
  overall: 'healthy' | 'degraded' | 'unhealthy';

  /** Individual health checks */
  checks: {
    database: HealthCheck;
    vectorIndex: HealthCheck;
    blobStorage: HealthCheck;
    embeddingAPI: HealthCheck;
  };

  /** Performance metrics */
  latency: {
    vectorSearchP50: number;
    vectorSearchP99: number;
    embeddingP50: number;
    embeddingP99: number;
  };

  /** Last health check timestamp */
  lastChecked: Date;
}

// ============================================
// Error Types
// ============================================

/**
 * RAG limit error codes
 */
export type RAGLimitErrorCode =
  | 'DOCUMENT_LIMIT_EXCEEDED'
  | 'STORAGE_LIMIT_EXCEEDED'
  | 'QUERY_LIMIT_EXCEEDED'
  | 'LIMIT_EXCEEDED';

/**
 * RAG limit error details
 */
export interface RAGLimitErrorDetails {
  /** Error code */
  code: RAGLimitErrorCode;

  /** Limit type */
  type?: string;

  /** Current value */
  current?: number;

  /** Limit value */
  limit?: number;

  /** When limit resets */
  resetAt?: Date;

  /** Upgrade URL */
  upgradeUrl?: string;

  /** Additional details */
  [key: string]: unknown;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a storage mode requires a user cluster
 */
export function requiresUserCluster(mode: RAGStorageMode): boolean {
  return mode === 'user-cluster';
}

/**
 * Check if a tier requires user-cluster storage
 */
export function tierRequiresUserCluster(tier: SubscriptionTier): boolean {
  return tier === 'team' || tier === 'enterprise';
}

/**
 * Check if a tier allows user-cluster storage
 */
export function tierAllowsUserCluster(tier: SubscriptionTier): boolean {
  return tier !== 'free'; // Pro, Team, Enterprise all allow user-cluster
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  if (bytes === -1) return 'Unlimited';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Calculate utilization percentage
 */
export function calculateUtilization(current: number, limit: number): number {
  if (limit === -1) return 0; // Unlimited
  if (limit === 0) return 100;
  return Math.min(100, (current / limit) * 100);
}
