/**
 * NetPad Extension Loader
 *
 * Handles dynamic loading of extensions based on deployment mode.
 * Supports:
 * - Cloud extension (@netpad/cloud-features) in cloud mode
 * - Additional extensions via NETPAD_EXTENSIONS environment variable
 * - Admin-controlled enable/disable via database settings
 * - Programmatic extension registration
 *
 * Loading priority:
 * 1. Cloud extension - controlled by NETPAD_PLATFORM_MODE (cannot be toggled)
 * 2. Plugin extensions from NETPAD_EXTENSIONS env var
 * 3. Database settings can disable extensions from step 2
 */

import { registerExtension, initializeExtensions, shouldLoadCloudFeatures } from './registry';
import { getDisabledExtensionIds } from '@/lib/platform/adminExtensionSettings';
import type { NetPadExtension } from './types';

let loadPromise: Promise<void> | null = null;

/**
 * Try to load a module using require (for Node.js runtime)
 * This is more reliable than dynamic import for workspace packages.
 * Uses eval to prevent webpack from transforming the require at build time.
 */
function tryRequire(moduleName: string): unknown | null {
  try {
    // Use eval to prevent webpack from transforming this require at build time
    // This allows us to load workspace packages at runtime
    // eslint-disable-next-line no-eval
    const nodeRequire = eval('require');
    const mod = nodeRequire(moduleName);
    console.log(`[Extensions] Successfully required ${moduleName}`);
    return mod;
  } catch (e) {
    const error = e as Error;
    console.error(`[Extensions] Failed to require ${moduleName}:`, error.message);
    return null;
  }
}

/**
 * Known extension loaders for packages that may be installed.
 * Uses require() for more reliable loading of workspace packages in Node.js runtime.
 * Falls back to dynamic import for edge runtime compatibility.
 */
const knownExtensionLoaders: Record<string, () => Promise<unknown>> = {
  '@netpad/cloud-features': async () => {
    // Try require first (more reliable for workspace packages)
    const mod = tryRequire('@netpad/cloud-features');
    if (mod) return mod;
    // Fall back to dynamic import - use variable to avoid TypeScript type checking
    const pkgName = '@netpad/cloud-features';
    
    return new Function('p', 'return import(p)')(pkgName).catch((e: Error) => {
      console.error('[Extensions] Failed to import @netpad/cloud-features:', e.message || e);
      return null;
    });
  },
  '@netpad/collaborate': async () => {
    const mod = tryRequire('@netpad/collaborate');
    if (mod) return mod;
    return import('@netpad/collaborate').catch((e) => {
      console.error('[Extensions] Failed to import @netpad/collaborate:', e.message || e);
      return null;
    });
  },
  '@netpad/demo-node': async () => {
    const mod = tryRequire('@netpad/demo-node');
    if (mod) return mod;
    return import('@netpad/demo-node').catch((e) => {
      console.error('[Extensions] Failed to import @netpad/demo-node:', e.message || e);
      return null;
    });
  },
  '@netpad/netpad-ext-approval-gate': async () => {
    const mod = tryRequire('@netpad/netpad-ext-approval-gate');
    if (mod) return mod;
    return import('@netpad/netpad-ext-approval-gate').catch((e) => {
      console.error('[Extensions] Failed to import @netpad/netpad-ext-approval-gate:', e.message || e);
      return null;
    });
  },
};

/**
 * Dynamically load an extension package by name
 *
 * For known packages, uses static imports (which webpack can analyze).
 * For unknown packages, falls back to dynamic import.
 */
async function loadExtensionPackage(packageName: string): Promise<NetPadExtension | null> {
  try {
    let extensionModule: unknown;

    // Try known loaders first (webpack can statically analyze these)
    if (knownExtensionLoaders[packageName]) {
      extensionModule = await knownExtensionLoaders[packageName]();
      if (!extensionModule) {
        console.log(`[Extensions] ${packageName} not available`);
        return null;
      }
    } else {
      // For unknown packages, use dynamic import (may not work in all environments)
      try {
        const dynamicImport = new Function('moduleName', 'return import(moduleName)');
        extensionModule = await dynamicImport(packageName);
      } catch {
        console.log(`[Extensions] ${packageName} not available (dynamic import failed)`);
        return null;
      }
    }

    const mod = extensionModule as Record<string, unknown>;

    // Handle webpack-wrapped modules (module.exports structure)
    let actualModule = mod;
    if (mod.exports && typeof mod.exports === 'object') {
      actualModule = mod.exports as Record<string, unknown>;
    }

    // Check for default export or named extension export
    if (actualModule.default) {
      console.log(`[Extensions] ${packageName} loaded via default export`);
      return actualModule.default as NetPadExtension;
    }

    // Check for common named exports
    const namedExports = [
      'extension',
      'cloudExtension',
      'collaborateExtension',
      'demoNodeExtension',
      'approvalGateExtension',
      `${packageName.split('/').pop()}Extension`,
    ];

    for (const exportName of namedExports) {
      if (actualModule[exportName]) {
        console.log(`[Extensions] ${packageName} loaded via ${exportName} export`);
        return actualModule[exportName] as NetPadExtension;
      }
    }

    console.warn(`[Extensions] ${packageName} loaded but no extension exported. Available exports:`, Object.keys(actualModule));
    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log full error for debugging
    console.error(`[Extensions] Error loading ${packageName}:`, errorMessage);

    if (
      errorMessage.includes('Cannot find module') ||
      errorMessage.includes('Cannot find package') ||
      errorMessage.includes('MODULE_NOT_FOUND')
    ) {
      // Check if this is a peer dependency issue vs package not installed
      if (errorMessage.includes('next/server') || errorMessage.includes('react')) {
        console.error(`[Extensions] ${packageName} has peer dependency resolution issue`);
      } else {
        console.log(`[Extensions] ${packageName} not available (not installed)`);
      }
      return null;
    }

    console.error(`[Extensions] Failed to load ${packageName}:`, error);
    return null;
  }
}

/**
 * Dynamically load cloud features extension if available
 */
async function loadCloudExtension(): Promise<NetPadExtension | null> {
  if (!shouldLoadCloudFeatures()) {
    console.log('[Extensions] Self-hosted mode - skipping cloud extension');
    return null;
  }

  return loadExtensionPackage('@netpad/cloud-features');
}

/**
 * Get extension IDs that are disabled via admin settings
 * Returns empty set if database is not available (e.g., during build)
 */
async function getDisabledExtensions(): Promise<Set<string>> {
  try {
    return await getDisabledExtensionIds();
  } catch (error) {
    // Database may not be available during build or in certain contexts
    console.log('[Extensions] Could not load admin settings, using defaults');
    return new Set();
  }
}

/**
 * Load additional extensions from NETPAD_EXTENSIONS environment variable
 *
 * Format: comma-separated list of package names
 * Example: NETPAD_EXTENSIONS=@netpad/collaborate,@netpad/analytics
 *
 * Extensions can be disabled via admin settings in the database.
 * Disabled extensions will be skipped during loading.
 */
async function loadPluginExtensions(): Promise<NetPadExtension[]> {
  const extensionsList = process.env.NETPAD_EXTENSIONS;
  if (!extensionsList) {
    return [];
  }

  const packageNames = extensionsList
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  // Get disabled extensions from admin settings
  const disabledExtensions = await getDisabledExtensions();

  // Filter out disabled extensions
  const enabledPackages = packageNames.filter((name) => {
    if (disabledExtensions.has(name)) {
      console.log(`[Extensions] ${name} is disabled via admin settings, skipping`);
      return false;
    }
    return true;
  });

  if (enabledPackages.length === 0 && packageNames.length > 0) {
    console.log('[Extensions] All plugin extensions are disabled via admin settings');
    return [];
  }

  console.log(`[Extensions] Loading ${enabledPackages.length} plugin extension(s):`, enabledPackages);
  if (disabledExtensions.size > 0) {
    console.log(`[Extensions] ${disabledExtensions.size} extension(s) disabled via admin settings`);
  }

  const extensions: NetPadExtension[] = [];

  for (const packageName of enabledPackages) {
    const extension = await loadExtensionPackage(packageName);
    if (extension) {
      extensions.push(extension);
    }
  }

  return extensions;
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

      // Initialize referral database operations for cloud-features
      try {
        const { initializeReferralDbOps } = await import('@/lib/platform/referralDbOps');
        await initializeReferralDbOps();
      } catch (error) {
        console.log('[Extensions] Could not initialize referral database operations:', error);
      }

      // MCP analytics is handled locally via mcpAnalyticsDbOps.ts
      // No cloud-features dependency needed - the API endpoint uses the local implementation directly
      console.log('[Extensions] MCP analytics available via local implementation');
    }

    // Load additional extensions from environment variable
    const pluginExtensions = await loadPluginExtensions();
    for (const extension of pluginExtensions) {
      registerExtension(extension);
    }

    // Initialize all registered extensions
    await initializeExtensions();

    console.log('[Extensions] Extension loading complete');
  })();

  return loadPromise;
}

/**
 * Manually register an extension
 *
 * Use this for programmatic extension registration, e.g., in tests
 * or when loading extensions from a custom source.
 */
export async function registerExtensionManually(extension: NetPadExtension): Promise<void> {
  registerExtension(extension);
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
