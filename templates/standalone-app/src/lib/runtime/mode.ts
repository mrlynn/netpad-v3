/**
 * Runtime Mode Detection
 *
 * Detects if the application is running in standalone mode
 * vs connected mode (future feature).
 */

export interface RuntimeConfig {
  mode: 'standalone' | 'connected';
  platformUrl?: string;
  appId?: string;
  version?: string;
}

/**
 * Detect if application is running in standalone mode
 */
export function isStandaloneMode(): boolean {
  return process.env.STANDALONE_MODE === 'true';
}

/**
 * Get runtime configuration
 */
export function getRuntimeConfig(): RuntimeConfig {
  const mode = isStandaloneMode() ? 'standalone' : 'connected';
  
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
