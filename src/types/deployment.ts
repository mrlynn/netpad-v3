/**
 * Deployment Types
 * 
 * Types for managing application deployments to Vercel and other platforms
 */

import { ObjectId } from 'mongodb';

/**
 * Deployment status lifecycle
 */
export type DeploymentStatus =
  | 'draft'              // Configuration being created
  | 'configuring'        // Setting up deployment configuration
  | 'provisioning'        // Provisioning database/resources
  | 'deploying'           // Deploying to target platform
  | 'active'             // Successfully deployed and running
  | 'failed'              // Deployment failed
  | 'paused';             // Deployment paused/stopped

/**
 * Deployment target platforms
 */
export type DeploymentTarget = 'vercel' | 'netlify' | 'railway' | 'self-hosted';

/**
 * Deployment environment
 */
export type DeploymentEnvironment = 'production' | 'staging' | 'development';

/**
 * Database provisioning mode
 */
export type DatabaseProvisioning = 'auto' | 'manual' | 'existing';

/**
 * Deployment Configuration
 * 
 * Stores complete deployment configuration for a NetPad project
 */
export interface Deployment {
  _id?: ObjectId;
  deploymentId: string;                    // "deploy_abc123"
  projectId: string;                        // NetPad project ID
  organizationId: string;                  // Organization owner
  createdBy: string;                        // User who created deployment

  // Deployment target
  target: DeploymentTarget;
  vercelProjectId?: string;                // Vercel project ID (if target is vercel)
  vercelDeploymentId?: string;             // Vercel deployment ID
  vercelInstallationId?: string;           // Vercel OAuth installation ID

  // Application configuration
  appName: string;
  environment: DeploymentEnvironment;

  // Database configuration
  database: {
    provisioning: DatabaseProvisioning;
    clusterId?: string;                     // MongoDB Atlas cluster ID (if auto-provisioned)
    vaultId?: string;                       // Connection vault ID (if using existing)
    connectionString?: string;              // Encrypted connection string (if manual)
    databaseName?: string;                  // Database name
  };

  // Environment variables (encrypted in storage)
  environmentVariables: Record<string, string>;

  // Branding
  branding?: {
    logo?: string;                          // URL or base64
    primaryColor?: string;                  // Hex color
    favicon?: string;                       // URL or base64
  };

  // Custom domain (future)
  customDomain?: string;

  // Status tracking
  status: DeploymentStatus;
  statusMessage?: string;                   // Human-readable status message
  deployedAt?: Date;                       // When deployment completed
  deployedUrl?: string;                     // URL of deployed application
  lastHealthCheck?: Date;                   // Last successful health check
  healthCheckStatus?: 'healthy' | 'degraded' | 'unhealthy';
  healthCheckError?: string;

  // Error tracking
  lastError?: string;
  errorCount?: number;
  lastErrorAt?: Date;

  // Metadata
  bundleVersion?: string;                   // Version of bundle deployed
  deployedBundle?: {
    formsCount: number;
    workflowsCount: number;
    exportedAt: string;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * Deployment creation input
 */
export interface CreateDeploymentInput {
  projectId: string;
  organizationId: string;
  createdBy: string;
  target: DeploymentTarget;
  appName: string;
  environment: DeploymentEnvironment;
  database: {
    provisioning: DatabaseProvisioning;
    clusterId?: string;
    vaultId?: string;
    connectionString?: string;
    databaseName?: string;
  };
  environmentVariables: Record<string, string>;
  branding?: {
    logo?: string;
    primaryColor?: string;
    favicon?: string;
  };
  vercelInstallationId?: string;
}

/**
 * Deployment update input
 */
export interface UpdateDeploymentInput {
  appName?: string;
  environment?: DeploymentEnvironment;
  database?: {
    provisioning?: DatabaseProvisioning;
    clusterId?: string;
    vaultId?: string;
    connectionString?: string;
    databaseName?: string;
  };
  environmentVariables?: Record<string, string>;
  branding?: {
    logo?: string;
    primaryColor?: string;
    favicon?: string;
  };
  customDomain?: string;
  status?: DeploymentStatus;
  statusMessage?: string;
  deployedUrl?: string;
  healthCheckStatus?: 'healthy' | 'degraded' | 'unhealthy';
  vercelProjectId?: string;
}

/**
 * Deployment status response
 */
export interface DeploymentStatusResponse {
  deploymentId: string;
  status: DeploymentStatus;
  statusMessage?: string;
  vercelStatus?: {
    state: string;
    url?: string;
    readyAt?: Date;
  };
  healthCheck?: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checkedAt: Date;
    error?: string;
  };
  deployedUrl?: string;
  deployedAt?: Date;
  error?: string;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: 'ok' | 'error';
    forms: number;
    workflows: number;
    lastSubmission?: Date;
  };
  version?: string;
  uptime?: number;
  error?: string;
}

/**
 * Vercel deployment response
 */
export interface VercelDeployment {
  id: string;
  url: string;
  state: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED';
  readyAt?: number;
  createdAt: number;
  target?: 'production' | 'staging';
}

/**
 * Vercel project response
 */
export interface VercelProject {
  id: string;
  name: string;
  accountId: string;
  updatedAt: number;
  createdAt: number;
  target?: 'production' | 'staging';
}
