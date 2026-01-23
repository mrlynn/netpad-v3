/**
 * NetPad Extension System Types
 *
 * This module defines the extension point architecture for separating
 * cloud-only features from the open source core.
 *
 * Extensions can provide:
 * - Additional API routes
 * - UI components/overrides
 * - Feature flags
 * - Middleware
 * - Service implementations
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// Extension Metadata
// ============================================

export interface ExtensionMetadata {
  /** Unique identifier for the extension */
  id: string;
  /** Human-readable name */
  name: string;
  /** Version string (semver) */
  version: string;
  /** Extension description */
  description?: string;
  /** Required NetPad version */
  netpadVersion?: string;
  /** Extension author */
  author?: string;
}

// ============================================
// Feature Definitions
// ============================================

/**
 * Features that can be provided by extensions
 */
export type ExtensionFeature =
  // Billing & Subscription
  | 'billing'
  | 'stripe_integration'
  | 'subscription_management'
  // Atlas Provisioning
  | 'atlas_provisioning'
  | 'cluster_management'
  // Marketplace
  | 'application_marketplace'
  | 'app_approval_workflow'
  | 'official_app_badges'
  // Admin
  | 'admin_dashboard'
  | 'waitlist_management'
  | 'user_moderation'
  // Analytics
  | 'advanced_analytics'
  | 'usage_reporting'
  // Team Features
  | 'team_management_premium'
  | 'sso_saml'
  | 'audit_logs_extended';

/**
 * Feature availability check result
 */
export interface FeatureAvailability {
  available: boolean;
  reason?: string;
  providedBy?: string; // Extension ID
}

// ============================================
// Service Interfaces
// ============================================

/**
 * Billing service interface - implemented by cloud extension
 */
export interface BillingService {
  /** Create a checkout session */
  createCheckoutSession(params: {
    organizationId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ sessionId: string; url: string }>;

  /** Create a billing portal session */
  createPortalSession(params: {
    organizationId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;

  /** Get subscription status */
  getSubscription(organizationId: string): Promise<{
    tier: string;
    status: string;
    currentPeriodEnd?: Date;
  } | null>;

  /** Handle webhook event */
  handleWebhook(payload: string, signature: string): Promise<void>;
}

/**
 * Atlas provisioning service interface
 */
export interface AtlasProvisioningService {
  /** Provision a new M0 cluster for an organization */
  provisionCluster(params: {
    organizationId: string;
    projectId: string;
    region?: string;
  }): Promise<{
    clusterId: string;
    connectionString: string;
    status: string;
  }>;

  /** Get cluster status */
  getClusterStatus(clusterId: string): Promise<{
    status: string;
    connectionString?: string;
  }>;

  /** Delete a cluster */
  deleteCluster(clusterId: string): Promise<void>;
}

/**
 * Marketplace service interface
 */
export interface MarketplaceService {
  /** Submit an application for marketplace review */
  submitForReview(applicationId: string): Promise<{ submissionId: string }>;

  /** Approve/reject a marketplace submission */
  reviewSubmission(
    submissionId: string,
    action: 'approve' | 'reject',
    reason?: string
  ): Promise<void>;

  /** Get marketplace listings */
  getListings(params: {
    category?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ listings: unknown[]; total: number }>;
}

/**
 * Waitlist service interface
 */
export interface WaitlistService {
  /** Add user to waitlist */
  addToWaitlist(params: {
    email: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ status: 'pending' | 'approved' }>;

  /** Check waitlist status */
  getStatus(email: string): Promise<'pending' | 'approved' | 'rejected' | null>;

  /** Approve a waitlist entry */
  approve(email: string): Promise<void>;

  /** Reject a waitlist entry */
  reject(email: string, reason?: string): Promise<void>;
}

// ============================================
// Route Definitions
// ============================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RouteHandler {
  (request: NextRequest, context?: { params: Record<string, string> }): Promise<NextResponse>;
}

export interface RouteDefinition {
  /** Route path pattern (e.g., '/api/billing/checkout') */
  path: string;
  /** HTTP method */
  method: HttpMethod;
  /** Route handler function */
  handler: RouteHandler;
  /** Whether route requires authentication */
  requiresAuth?: boolean;
  /** Required permissions */
  permissions?: string[];
}

// ============================================
// Middleware
// ============================================

export interface ExtensionMiddleware {
  /** Middleware name for debugging */
  name: string;
  /** Path patterns this middleware applies to */
  paths: string[];
  /** Middleware handler */
  handler: (
    request: NextRequest,
    next: () => Promise<NextResponse>
  ) => Promise<NextResponse>;
  /** Priority (lower = runs first) */
  priority?: number;
}

// ============================================
// Component Overrides
// ============================================

export interface ComponentOverride {
  /** Component identifier to override */
  componentId: string;
  /** React component (lazy loaded) */
  component: React.ComponentType<unknown>;
  /** Props transformer */
  transformProps?: (props: unknown) => unknown;
}

// ============================================
// Main Extension Interface
// ============================================

export interface NetPadExtension {
  /** Extension metadata */
  metadata: ExtensionMetadata;

  /** Features provided by this extension */
  features?: ExtensionFeature[];

  /** API routes provided by this extension */
  routes?: RouteDefinition[];

  /** Middleware provided by this extension */
  middleware?: ExtensionMiddleware[];

  /** Component overrides */
  components?: ComponentOverride[];

  /** Service implementations */
  services?: {
    billing?: BillingService;
    atlasProvisioning?: AtlasProvisioningService;
    marketplace?: MarketplaceService;
    waitlist?: WaitlistService;
  };

  /** Initialization function (called on app startup) */
  initialize?: () => Promise<void>;

  /** Cleanup function (called on shutdown) */
  cleanup?: () => Promise<void>;
}

// ============================================
// Extension Events
// ============================================

export type ExtensionEventType =
  | 'extension:registered'
  | 'extension:initialized'
  | 'extension:error'
  | 'feature:enabled'
  | 'feature:disabled';

export interface ExtensionEvent {
  type: ExtensionEventType;
  extensionId?: string;
  feature?: ExtensionFeature;
  error?: Error;
  timestamp: Date;
}

export type ExtensionEventHandler = (event: ExtensionEvent) => void;
