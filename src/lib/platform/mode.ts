/**
 * Platform Mode Configuration
 * 
 * Determines whether this NetPad instance is running as:
 * - 'self-hosted': Open source deployment (default)
 * - 'cloud': NetPad.io cloud service
 * 
 * This affects admin capabilities, feature availability, and UI.
 */

export type PlatformMode = 'self-hosted' | 'cloud';

/**
 * Current platform mode, determined by environment variable.
 * Default: 'self-hosted' (open source behavior)
 */
export const PLATFORM_MODE: PlatformMode = 
  (process.env.NETPAD_PLATFORM_MODE as PlatformMode) || 'self-hosted';

/**
 * Check if running in cloud mode (netpad.io)
 */
export function isCloudMode(): boolean {
  return PLATFORM_MODE === 'cloud';
}

/**
 * Check if running in self-hosted mode (open source)
 */
export function isSelfHosted(): boolean {
  return PLATFORM_MODE === 'self-hosted';
}

/**
 * Get a human-readable platform mode label
 */
export function getPlatformModeLabel(): string {
  return isCloudMode() ? 'NetPad Cloud' : 'NetPad (Self-Hosted)';
}
