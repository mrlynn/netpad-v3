/**
 * Runtime Mode Detection for Standalone Apps
 *
 * Standalone apps are exported from NetPad and run independently.
 * They use a simplified architecture with no Platform DB dependency.
 *
 * Data Storage Differences:
 * - Cloud/Self-Hosted: Uses Platform DB, conversation data in `_formMetadata.conversational`
 * - Standalone: Writes directly to MongoDB, conversation data in `conversational` (top-level)
 *
 * This is by design - standalone apps are meant to be simple, self-contained,
 * and not require NetPad infrastructure to operate.
 */

export type RuntimeMode = 'standalone' | 'connected';

export interface RuntimeConfig {
  mode: RuntimeMode;
  platformUrl?: string;
  appId?: string;
  version?: string;
}

/**
 * Standalone app configuration
 *
 * Key differences from Cloud/Self-Hosted:
 * - No Platform DB - writes directly to user's MongoDB
 * - No multi-tenancy - single application
 * - Conversation transcripts stored at `conversational` (top-level field)
 * - User provides their own OpenAI API key for AI features
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

/**
 * Detect if application is running in standalone mode
 *
 * In standalone mode:
 * - All data goes directly to user's MongoDB
 * - No NetPad platform API calls
 * - User is responsible for AI API keys
 */
export function isStandaloneMode(): boolean {
  return process.env.STANDALONE_MODE === 'true';
}

/**
 * Get runtime configuration
 */
export function getRuntimeConfig(): RuntimeConfig {
  const mode: RuntimeMode = isStandaloneMode() ? 'standalone' : 'connected';

  return {
    mode,
    platformUrl: process.env.NETPAD_PLATFORM_URL,
    appId: process.env.APP_ID,
    version: process.env.APP_VERSION || '1.0.0',
  };
}

/**
 * Check if platform API calls are allowed
 * In standalone mode, all data is local - no platform API calls
 */
export function canCallPlatformAPI(): boolean {
  return !isStandaloneMode() && !!process.env.NETPAD_PLATFORM_URL;
}

/**
 * Get application name from environment or bundle
 */
export function getAppName(): string {
  return process.env.APP_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'NetPad Application';
}

/**
 * Get the path where conversation transcripts are stored
 *
 * This is useful for querying/displaying conversation data:
 * - Standalone: `conversational` (top-level field)
 * - Cloud/Self-Hosted: `_formMetadata.conversational`
 */
export function getConversationDataPath(): string {
  return STANDALONE_CONFIG.conversationTranscriptPath;
}
