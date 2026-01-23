/**
 * NetPad Extension Loader
 *
 * Handles dynamic loading of extensions based on deployment mode.
 * In cloud mode, attempts to load @netpad/cloud-features package.
 * In self-hosted mode, only core features are available.
 */

import { registerExtension, initializeExtensions, shouldLoadCloudFeatures } from './registry';
import type { NetPadExtension } from './types';

let loadPromise: Promise<void> | null = null;

/**
 * Dynamically load cloud features extension if available
 *
 * Uses a dynamic import with webpack magic comments to make the import
 * optional. The package may not exist in self-hosted deployments.
 */
async function loadCloudExtension(): Promise<NetPadExtension | null> {
  if (!shouldLoadCloudFeatures()) {
    console.log('[Extensions] Self-hosted mode - skipping cloud extension');
    return null;
  }

  try {
    // Dynamic import of cloud features package
    // This package is private and only available in cloud deployments
    //
    // We use a variable to store the module name to prevent webpack from
    // trying to resolve it at build time. This allows the build to succeed
    // even when the package is not installed.
    const moduleName = '@netpad/cloud-features';

    // Use Function constructor to create a truly dynamic import that webpack
    // won't try to resolve at build time
    const dynamicImport = new Function('moduleName', 'return import(moduleName)');
    const cloudModule = await dynamicImport(moduleName);

    if (cloudModule.default) {
      return cloudModule.default as NetPadExtension;
    }

    if (cloudModule.cloudExtension) {
      return cloudModule.cloudExtension as NetPadExtension;
    }

    console.warn('[Extensions] @netpad/cloud-features loaded but no extension exported');
    return null;
  } catch (error) {
    // Package not found - this is expected in self-hosted deployments
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes('Cannot find module') ||
      errorMessage.includes('Cannot find package') ||
      errorMessage.includes('MODULE_NOT_FOUND')
    ) {
      console.log('[Extensions] @netpad/cloud-features not available (self-hosted mode)');
      return null;
    }

    // Unexpected error
    console.error('[Extensions] Failed to load cloud extension:', error);
    return null;
  }
}

/**
 * Load all available extensions based on deployment mode
 *
 * Call this during app initialization (e.g., in instrumentation.ts or layout.tsx)
 */
export async function loadExtensions(): Promise<void> {
  // Prevent multiple simultaneous loads
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    console.log('[Extensions] Loading extensions...');

    // Load cloud extension if in cloud mode
    const cloudExtension = await loadCloudExtension();
    if (cloudExtension) {
      registerExtension(cloudExtension);
    }

    // Future: Load additional extensions from a plugins directory
    // await loadPluginExtensions();

    // Initialize all registered extensions
    await initializeExtensions();

    console.log('[Extensions] Extension loading complete');
  })();

  return loadPromise;
}

/**
 * Check if extensions have been loaded
 */
export function extensionsLoaded(): boolean {
  return loadPromise !== null;
}

/**
 * Wait for extensions to be loaded
 */
export async function waitForExtensions(): Promise<void> {
  if (loadPromise) {
    await loadPromise;
  }
}

/**
 * Reset loader state (for testing)
 */
export function resetLoader(): void {
  loadPromise = null;
}
