/**
 * Deployment Mode Detection and Configuration
 *
 * NetPad supports three deployment modes:
 *
 * 1. CLOUD (netpad.io SaaS)
 *    - Multi-tenant platform with organizations
 *    - Uses Platform DB for submissions, then syncs to target MongoDB
 *    - Conversation transcripts stored in: _formMetadata.conversational
 *    - Set via: NETPAD_PLATFORM_MODE=cloud
 *
 * 2. SELF-HOSTED (full NetPad on your infra)
 *    - Same codebase as cloud, but you manage everything
 *    - Uses Platform DB architecture
 *    - Conversation transcripts stored in: _formMetadata.conversational
 *    - Set via: NETPAD_PLATFORM_MODE=self-hosted (or unset)
 *
 * 3. STANDALONE (exported single-app)
 *    - Minimal codebase from templates/standalone-app/
 *    - No Platform DB - writes directly to user's MongoDB
 *    - Conversation transcripts stored in: conversational (top-level field)
 *    - Set via: STANDALONE_MODE=true (in exported app)
 *
 * Note: This file is for the main codebase (Cloud/Self-Hosted).
 * Standalone apps have their own mode detection in templates/standalone-app/src/lib/runtime/mode.ts
 */

export type DeploymentMode = 'cloud' | 'self-hosted';

/**
 * Get the current deployment mode
 *
 * @returns 'cloud' if NETPAD_PLATFORM_MODE=cloud, otherwise 'self-hosted'
 */
export function getDeploymentMode(): DeploymentMode {
  const mode = process.env.NETPAD_PLATFORM_MODE;
  if (mode === 'cloud') return 'cloud';
  return 'self-hosted';
}

/**
 * Check if running in cloud mode (e.g., netpad.io on Vercel)
 */
export function isCloudMode(): boolean {
  return getDeploymentMode() === 'cloud';
}

/**
 * Check if running in self-hosted mode
 */
export function isSelfHostedMode(): boolean {
  return getDeploymentMode() === 'self-hosted';
}

/**
 * Configuration for each deployment mode
 */
export interface DeploymentConfig {
  mode: DeploymentMode;
  /** Whether this deployment uses a platform database for submissions */
  usesPlatformDb: boolean;
  /** Whether multi-tenancy (organizations) is supported */
  supportsMultiTenancy: boolean;
  /** Where conversation transcripts are stored in the target MongoDB document */
  conversationTranscriptPath: '_formMetadata.conversational';
  /** Whether Stripe billing is available */
  supportsBilling: boolean;
  /** Whether Atlas cluster provisioning is available */
  supportsClusterProvisioning: boolean;
}

/**
 * Get deployment configuration for the current mode
 */
export function getDeploymentConfig(): DeploymentConfig {
  const mode = getDeploymentMode();

  // Both cloud and self-hosted use the same architecture
  // The main difference is who manages the infrastructure
  return {
    mode,
    usesPlatformDb: true,
    supportsMultiTenancy: true,
    conversationTranscriptPath: '_formMetadata.conversational',
    supportsBilling: mode === 'cloud',
    supportsClusterProvisioning: mode === 'cloud',
  };
}

/**
 * Standalone app configuration (for documentation purposes)
 *
 * This describes what standalone apps look like - they use a different codebase
 * from templates/standalone-app/ and don't share this code.
 */
export const STANDALONE_CONFIG = {
  /** Standalone apps don't have a platform database */
  usesPlatformDb: false,
  /** Single application, no organizations */
  supportsMultiTenancy: false,
  /** Conversation data stored at top level of submission document */
  conversationTranscriptPath: 'conversational',
  /** No billing in standalone apps */
  supportsBilling: false,
  /** User manages their own MongoDB */
  supportsClusterProvisioning: false,
} as const;
