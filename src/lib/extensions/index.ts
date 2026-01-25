/**
 * NetPad Extension System
 *
 * This module provides the extension point architecture for the open core model.
 * Cloud-only features can be separated into @netpad/cloud-features package
 * while keeping the core functionality open source.
 *
 * @example
 * // Check if a feature is available
 * import { isFeatureAvailable } from '@/lib/extensions';
 *
 * const billing = isFeatureAvailable('billing');
 * if (billing.available) {
 *   // Show billing UI
 * }
 *
 * @example
 * // Get a service
 * import { getBillingService } from '@/lib/extensions';
 *
 * const billingService = getBillingService();
 * if (billingService) {
 *   await billingService.createCheckoutSession({...});
 * }
 *
 * @example
 * // Register an extension (in @netpad/cloud-features)
 * import { registerExtension } from '@/lib/extensions';
 *
 * registerExtension({
 *   metadata: { id: 'cloud', name: 'NetPad Cloud', version: '1.0.0' },
 *   features: ['billing', 'atlas_provisioning'],
 *   services: { billing: myBillingService },
 * });
 */

// Types
export type {
  NetPadExtension,
  ExtensionMetadata,
  ExtensionFeature,
  FeatureAvailability,
  BillingService,
  AtlasProvisioningService,
  MarketplaceService,
  WaitlistService,
  UsageService,
  AdminService,
  ReferralService,
  CommissionRates,
  ReferralCodeInfo,
  ReferralStats,
  EarningsList,
  UsageLimitResult,
  AIFeatureAccessResult,
  OrganizationUsageRecord,
  StorageUsageSummary,
  WorkflowUsageSummary,
  FeatureAccessSummary,
  RouteDefinition,
  ExtensionMiddleware,
  ComponentOverride,
  ExtensionEvent,
  ExtensionEventHandler,
  HttpMethod,
  RouteHandler,
} from './types';

// Registry functions
export {
  registerExtension,
  unregisterExtension,
  initializeExtensions,
  cleanupExtensions,
  isFeatureAvailable,
  shouldLoadCloudFeatures,
  getEnabledFeatures,
  getBillingService,
  getAtlasProvisioningService,
  getMarketplaceService,
  getWaitlistService,
  getUsageService,
  getAdminService,
  getReferralService,
  getExtensionRoutes,
  getExtensionMiddleware,
  onExtensionEvent,
  getRegistryStatus,
} from './registry';

// Loader functions
export {
  loadExtensions,
  extensionsLoaded,
  waitForExtensions,
  resetLoader,
} from './loader';

// Re-export hooks for convenience
export {
  useExtensionFeature,
  useExtensionFeatures,
  useExtensionService,
  useDeploymentMode,
} from './hooks';

// Re-export components for conditional rendering
export {
  CloudFeature,
  CloudOnly,
  SelfHostedOnly,
  RequireFeature,
} from './CloudFeature';
