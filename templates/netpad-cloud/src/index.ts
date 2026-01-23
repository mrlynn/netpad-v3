/**
 * @netpad/cloud-features
 *
 * This package provides cloud-only features for NetPad:
 * - Billing & subscription management (Stripe)
 * - Atlas cluster provisioning
 * - Application marketplace
 * - Waitlist management
 * - Admin dashboard features
 *
 * This package is PRIVATE and only available in cloud deployments.
 * Self-hosted deployments do not include this package.
 */

import type { NetPadExtension } from '@/lib/extensions';
import { billingService } from './billing';
import { atlasProvisioningService } from './atlas';
import { marketplaceService } from './marketplace';
import { waitlistService } from './waitlist';

/**
 * Cloud extension definition
 */
export const cloudExtension: NetPadExtension = {
  metadata: {
    id: 'netpad-cloud',
    name: 'NetPad Cloud',
    version: '1.0.0',
    description: 'Cloud-only features for NetPad SaaS',
    author: 'MongoDB NetPad Team',
  },

  features: [
    // Billing
    'billing',
    'stripe_integration',
    'subscription_management',
    // Atlas
    'atlas_provisioning',
    'cluster_management',
    // Marketplace
    'application_marketplace',
    'app_approval_workflow',
    'official_app_badges',
    // Admin
    'admin_dashboard',
    'waitlist_management',
    'user_moderation',
    // Analytics
    'advanced_analytics',
    'usage_reporting',
  ],

  services: {
    billing: billingService,
    atlasProvisioning: atlasProvisioningService,
    marketplace: marketplaceService,
    waitlist: waitlistService,
  },

  async initialize() {
    console.log('[Cloud] Initializing cloud features...');
    // Initialize Stripe, Atlas API connections, etc.
  },

  async cleanup() {
    console.log('[Cloud] Cleaning up cloud features...');
  },
};

// Default export for dynamic import
export default cloudExtension;

// Named exports for specific services
export { billingService } from './billing';
export { atlasProvisioningService } from './atlas';
export { marketplaceService } from './marketplace';
export { waitlistService } from './waitlist';
