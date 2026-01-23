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
 * - Custom workflow nodes
 */

import { NextRequest, NextResponse } from 'next/server';
import type { WorkflowNodeDefinition } from './workflowNodes';
import type { NodeHandler } from '@/lib/workflow/nodeHandlers/types';

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
 *
 * Known features are listed explicitly for type safety.
 * Custom features can use the `custom:` prefix (e.g., 'custom:collaborate').
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
  | 'audit_logs_extended'
  // Custom features (extension-defined)
  // Use format: 'custom:{feature_name}'
  | `custom:${string}`;

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
// Usage Service Types
// ============================================

/**
 * Result of a usage limit check
 */
export interface UsageLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  reason?: string;
}

/**
 * AI feature access result with tier information
 */
export interface AIFeatureAccessResult {
  allowed: boolean;
  reason?: string;
  requiredTier?: string;
  requiredClusterTier?: string;
  currentClusterTier?: string | null;
}

/**
 * Organization usage record for a billing period
 */
export interface OrganizationUsageRecord {
  organizationId: string;
  period: string; // YYYY-MM format
  forms: { created: number; active: number };
  submissions: { total: number; byForm: Record<string, number> };
  storage: { filesBytes: number; responsesBytes: number };
  ai: { generations: number; agentSessions: number; processingRuns: number; tokensUsed: number };
  workflows: {
    executions: number;
    byWorkflow: Record<string, number>;
    successfulExecutions: number;
    failedExecutions: number;
  };
}

/**
 * Storage usage summary
 */
export interface StorageUsageSummary {
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  percentUsed: number;
  isUnlimited: boolean;
  usedFormatted: string;
  limitFormatted: string;
}

/**
 * Workflow usage summary
 */
export interface WorkflowUsageSummary {
  executions: {
    current: number;
    limit: number;
    remaining: number;
    percentUsed: number;
    isUnlimited: boolean;
  };
  activeWorkflows: {
    limit: number;
    isUnlimited: boolean;
  };
  successRate: number;
  topWorkflows: Array<{ workflowId: string; executions: number }>;
}

/**
 * Feature access summary for an organization
 */
export interface FeatureAccessSummary {
  tier: string;
  aiFeatures: string[];
  platformFeatures: string[];
  limits: Record<string, number>;
  usage: OrganizationUsageRecord;
}

/**
 * Usage service interface - handles all usage tracking and limit checking
 * Implemented by cloud extension for cloud mode, or local implementation for self-hosted
 */
export interface UsageService {
  // ---- Usage Record Management ----
  /** Get or create usage record for current billing period */
  getOrCreateUsage(orgId: string): Promise<OrganizationUsageRecord>;

  // ---- AI Usage ----
  /** Increment AI usage counter and check if allowed */
  incrementAIUsage(
    orgId: string,
    metric: 'generations' | 'agentSessions' | 'processingRuns',
    amount?: number,
    tokensUsed?: number
  ): Promise<UsageLimitResult>;

  /** Check if an AI operation is allowed (without incrementing) */
  checkAILimit(
    orgId: string,
    metric: 'generations' | 'agentSessions' | 'processingRuns'
  ): Promise<UsageLimitResult>;

  /** Check if organization has access to an AI feature */
  hasAIFeature(orgId: string, feature: string): Promise<AIFeatureAccessResult>;

  // ---- Submission Usage ----
  /** Increment submission count for a form */
  incrementSubmissionUsage(
    orgId: string,
    formId: string
  ): Promise<UsageLimitResult>;

  /** Check if a submission is allowed (without incrementing) */
  checkSubmissionLimit(orgId: string): Promise<UsageLimitResult>;

  // ---- Storage Usage ----
  /** Check storage quota */
  checkStorageQuota(
    orgId: string,
    additionalBytes?: number
  ): Promise<UsageLimitResult & { percentUsed: number }>;

  /** Increment storage usage */
  incrementStorageUsage(orgId: string, bytes: number): Promise<void>;

  /** Decrement storage usage */
  decrementStorageUsage(orgId: string, bytes: number): Promise<void>;

  /** Get storage usage summary */
  getStorageUsageSummary(orgId: string): Promise<StorageUsageSummary>;

  // ---- Workflow Usage ----
  /** Check if a workflow execution is allowed */
  checkWorkflowExecutionLimit(orgId: string): Promise<UsageLimitResult>;

  /** Check if organization can have more active workflows */
  checkActiveWorkflowLimit(
    orgId: string,
    currentActiveCount: number
  ): Promise<UsageLimitResult>;

  /** Increment workflow execution count at queue time */
  incrementWorkflowExecutionAtQueue(
    orgId: string,
    workflowId: string
  ): Promise<UsageLimitResult>;

  /** Update workflow execution result (success/failure) */
  updateWorkflowExecutionResult(
    orgId: string,
    workflowId: string,
    success: boolean
  ): Promise<void>;

  /** Get workflow usage summary */
  getWorkflowUsageSummary(orgId: string): Promise<WorkflowUsageSummary>;

  // ---- Form/Connection/Field Limits ----
  /** Check if organization can create more forms */
  checkFormLimit(orgId: string, currentFormCount: number): Promise<UsageLimitResult>;

  /** Check if organization can create more connections */
  checkConnectionLimit(
    orgId: string,
    currentConnectionCount: number
  ): Promise<UsageLimitResult>;

  /** Check if a form can have more fields */
  checkFieldLimit(
    orgId: string,
    currentFieldCount: number
  ): Promise<UsageLimitResult>;

  // ---- Feature Access ----
  /** Check if organization has access to a platform feature */
  hasPlatformFeature(orgId: string, feature: string): Promise<boolean>;

  /** Get all feature access for an organization */
  getFeatureAccess(orgId: string): Promise<FeatureAccessSummary>;

  // ---- Subscription Management ----
  /** Initialize a new organization with free tier */
  initializeFreeSubscription(orgId: string): Promise<void>;

  /** Get subscription tier for an organization */
  getSubscriptionTier(orgId: string): Promise<string>;
}

/**
 * Admin service interface - administrative operations
 */
export interface AdminService {
  /** Get platform statistics */
  getStats(): Promise<{
    totalUsers: number;
    totalOrganizations: number;
    totalForms: number;
    totalSubmissions: number;
  }>;

  /** Get user list with pagination */
  getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{
    users: Array<{
      id: string;
      email: string;
      name?: string;
      createdAt: Date;
      lastLogin?: Date;
    }>;
    total: number;
  }>;

  /** Suspend a user account */
  suspendUser(userId: string, reason?: string): Promise<void>;

  /** Reactivate a suspended user */
  reactivateUser(userId: string): Promise<void>;

  /** Get organization list with pagination */
  getOrganizations(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{
    organizations: Array<{
      orgId: string;
      name: string;
      tier: string;
      memberCount: number;
      createdAt: Date;
    }>;
    total: number;
  }>;
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
// Workflow Node Definitions
// ============================================

/**
 * Workflow node provided by an extension
 */
export interface ExtensionWorkflowNode {
  /** Node definition for UI and configuration */
  definition: Omit<WorkflowNodeDefinition, 'providedBy'>;
  /** Node execution handler */
  handler: NodeHandler;
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

  /** Custom workflow nodes provided by this extension */
  workflowNodes?: ExtensionWorkflowNode[];

  /** Service implementations */
  services?: {
    billing?: BillingService;
    atlasProvisioning?: AtlasProvisioningService;
    marketplace?: MarketplaceService;
    waitlist?: WaitlistService;
    usage?: UsageService;
    admin?: AdminService;
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
