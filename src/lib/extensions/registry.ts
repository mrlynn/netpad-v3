/**
 * NetPad Extension Registry
 *
 * Central registry for managing extensions. Extensions are loaded
 * dynamically based on deployment mode and available packages.
 *
 * Usage:
 * - In cloud deployment: @netpad/cloud-features package registers its extension
 * - In self-hosted: Core features only, no cloud extensions
 */

import {
  NetPadExtension,
  ExtensionFeature,
  FeatureAvailability,
  ExtensionEvent,
  ExtensionEventHandler,
  BillingService,
  AtlasProvisioningService,
  MarketplaceService,
  WaitlistService,
  UsageService,
  AdminService,
  RouteDefinition,
  ExtensionMiddleware,
} from './types';
import { getDeploymentMode, isCloudMode } from '../runtime/deploymentMode';
import { registerExtensionNode, unregisterExtensionNode, getNodesFromExtension } from './workflowNodes';

// ============================================
// Registry State
// ============================================

const registeredExtensions: Map<string, NetPadExtension> = new Map();
const enabledFeatures: Set<ExtensionFeature> = new Set();
const eventHandlers: Set<ExtensionEventHandler> = new Set();
let initialized = false;

// ============================================
// Event Emitter
// ============================================

function emitEvent(event: Omit<ExtensionEvent, 'timestamp'>): void {
  const fullEvent: ExtensionEvent = {
    ...event,
    timestamp: new Date(),
  };

  eventHandlers.forEach((handler) => {
    try {
      handler(fullEvent);
    } catch (error) {
      console.error('[Extensions] Event handler error:', error);
    }
  });
}

// ============================================
// Registration
// ============================================

/**
 * Register an extension with the registry
 */
export function registerExtension(extension: NetPadExtension): void {
  const { id } = extension.metadata;

  if (registeredExtensions.has(id)) {
    console.warn(`[Extensions] Extension "${id}" is already registered, skipping`);
    return;
  }

  registeredExtensions.set(id, extension);

  // Track features provided by this extension
  if (extension.features) {
    extension.features.forEach((feature) => {
      enabledFeatures.add(feature);
      emitEvent({
        type: 'feature:enabled',
        extensionId: id,
        feature,
      });
    });
  }

  // Register workflow nodes provided by this extension
  if (extension.workflowNodes) {
    for (const node of extension.workflowNodes) {
      registerExtensionNode(
        { ...node.definition, providedBy: id },
        node.handler,
        id
      );
    }
    console.log(`[Extensions] Registered ${extension.workflowNodes.length} workflow node(s) from ${id}`);
  }

  emitEvent({
    type: 'extension:registered',
    extensionId: id,
  });

  console.log(`[Extensions] Registered extension: ${extension.metadata.name} v${extension.metadata.version}`);
}

/**
 * Unregister an extension
 */
export function unregisterExtension(extensionId: string): void {
  const extension = registeredExtensions.get(extensionId);
  if (!extension) return;

  // Remove features
  if (extension.features) {
    extension.features.forEach((feature) => {
      enabledFeatures.delete(feature);
      emitEvent({
        type: 'feature:disabled',
        extensionId,
        feature,
      });
    });
  }

  // Unregister workflow nodes
  if (extension.workflowNodes) {
    const extensionNodes = getNodesFromExtension(extensionId);
    for (const node of extensionNodes) {
      unregisterExtensionNode(node.type);
    }
  }

  registeredExtensions.delete(extensionId);
  console.log(`[Extensions] Unregistered extension: ${extensionId}`);
}

// ============================================
// Initialization
// ============================================

/**
 * Initialize all registered extensions
 */
export async function initializeExtensions(): Promise<void> {
  if (initialized) {
    console.warn('[Extensions] Already initialized');
    return;
  }

  console.log(`[Extensions] Initializing ${registeredExtensions.size} extension(s)...`);

  for (const [id, extension] of registeredExtensions) {
    try {
      if (extension.initialize) {
        await extension.initialize();
      }
      emitEvent({
        type: 'extension:initialized',
        extensionId: id,
      });
      console.log(`[Extensions] Initialized: ${id}`);
    } catch (error) {
      emitEvent({
        type: 'extension:error',
        extensionId: id,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      console.error(`[Extensions] Failed to initialize ${id}:`, error);
    }
  }

  initialized = true;
}

/**
 * Cleanup all extensions (for graceful shutdown)
 */
export async function cleanupExtensions(): Promise<void> {
  for (const [id, extension] of registeredExtensions) {
    try {
      if (extension.cleanup) {
        await extension.cleanup();
      }
    } catch (error) {
      console.error(`[Extensions] Cleanup failed for ${id}:`, error);
    }
  }
  initialized = false;
}

// ============================================
// Feature Checks
// ============================================

/**
 * Check if a feature is available
 */
export function isFeatureAvailable(feature: ExtensionFeature): FeatureAvailability {
  if (!enabledFeatures.has(feature)) {
    return {
      available: false,
      reason: `Feature "${feature}" is not enabled. This may require a cloud deployment or additional extension.`,
    };
  }

  // Find which extension provides this feature
  for (const [id, extension] of registeredExtensions) {
    if (extension.features?.includes(feature)) {
      return {
        available: true,
        providedBy: id,
      };
    }
  }

  return { available: true };
}

/**
 * Check if running in a mode where cloud features should be available
 */
export function shouldLoadCloudFeatures(): boolean {
  return isCloudMode();
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): ExtensionFeature[] {
  return Array.from(enabledFeatures);
}

// ============================================
// Service Access
// ============================================

/**
 * Get the billing service (if available)
 */
export function getBillingService(): BillingService | null {
  for (const extension of registeredExtensions.values()) {
    if (extension.services?.billing) {
      return extension.services.billing;
    }
  }
  return null;
}

/**
 * Get the Atlas provisioning service (if available)
 */
export function getAtlasProvisioningService(): AtlasProvisioningService | null {
  for (const extension of registeredExtensions.values()) {
    if (extension.services?.atlasProvisioning) {
      return extension.services.atlasProvisioning;
    }
  }
  return null;
}

/**
 * Get the marketplace service (if available)
 */
export function getMarketplaceService(): MarketplaceService | null {
  for (const extension of registeredExtensions.values()) {
    if (extension.services?.marketplace) {
      return extension.services.marketplace;
    }
  }
  return null;
}

/**
 * Get the waitlist service (if available)
 */
export function getWaitlistService(): WaitlistService | null {
  for (const extension of registeredExtensions.values()) {
    if (extension.services?.waitlist) {
      return extension.services.waitlist;
    }
  }
  return null;
}

/**
 * Get the usage service (if available)
 */
export function getUsageService(): UsageService | null {
  for (const extension of registeredExtensions.values()) {
    if (extension.services?.usage) {
      return extension.services.usage;
    }
  }
  return null;
}

/**
 * Get the admin service (if available)
 */
export function getAdminService(): AdminService | null {
  for (const extension of registeredExtensions.values()) {
    if (extension.services?.admin) {
      return extension.services.admin;
    }
  }
  return null;
}

// ============================================
// Route Access
// ============================================

/**
 * Get all routes from all extensions
 */
export function getExtensionRoutes(): RouteDefinition[] {
  const routes: RouteDefinition[] = [];
  for (const extension of registeredExtensions.values()) {
    if (extension.routes) {
      routes.push(...extension.routes);
    }
  }
  return routes;
}

/**
 * Get all middleware from all extensions
 */
export function getExtensionMiddleware(): ExtensionMiddleware[] {
  const middleware: ExtensionMiddleware[] = [];
  for (const extension of registeredExtensions.values()) {
    if (extension.middleware) {
      middleware.push(...extension.middleware);
    }
  }
  // Sort by priority (lower = first)
  return middleware.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
}

// ============================================
// Event Handling
// ============================================

/**
 * Subscribe to extension events
 */
export function onExtensionEvent(handler: ExtensionEventHandler): () => void {
  eventHandlers.add(handler);
  return () => eventHandlers.delete(handler);
}

// ============================================
// Debugging
// ============================================

/**
 * Get registry status for debugging
 */
export function getRegistryStatus(): {
  extensionCount: number;
  extensions: Array<{ id: string; name: string; version: string; features: ExtensionFeature[] }>;
  enabledFeatures: ExtensionFeature[];
  initialized: boolean;
  deploymentMode: string;
} {
  return {
    extensionCount: registeredExtensions.size,
    extensions: Array.from(registeredExtensions.values()).map((ext) => ({
      id: ext.metadata.id,
      name: ext.metadata.name,
      version: ext.metadata.version,
      features: ext.features ?? [],
    })),
    enabledFeatures: Array.from(enabledFeatures),
    initialized,
    deploymentMode: getDeploymentMode(),
  };
}
