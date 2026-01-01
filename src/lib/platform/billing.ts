/**
 * Billing Service
 *
 * Manages subscriptions, payments, and usage tracking with Stripe integration.
 */

import Stripe from 'stripe';
import { WithId } from 'mongodb';
import {
  getOrganizationsCollection,
  getPlatformAuditCollection,
  getUsageCollection,
  getBillingEventsCollection,
} from './db';
import { generateSecureId } from '../encryption';
import {
  Organization,
  Subscription,
  SubscriptionTier,
  SubscriptionStatus,
  BillingInterval,
  SUBSCRIPTION_TIERS,
  TIER_PRICING,
  OrganizationUsage,
  AIFeature,
  PlatformFeature,
  TierLimits,
  BillingEvent,
  AuditLogEntry,
} from '@/types/platform';

// ============================================
// Stripe Client
// ============================================

let stripeClient: Stripe | null = null;

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Get Stripe client (throws if not configured)
 */
function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set. Use dev endpoints for local testing.');
    }
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    });
  }
  return stripeClient;
}

/**
 * Get Stripe client if configured, null otherwise
 */
function getStripeOptional(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }
  return getStripe();
}

// ============================================
// Stripe Product/Price IDs (configure in Stripe Dashboard)
// ============================================

export interface StripePriceConfig {
  monthly: string;
  yearly: string;
}

// These should be set in environment variables or fetched from Stripe
export const STRIPE_PRICES: Record<SubscriptionTier, StripePriceConfig | null> = {
  free: null,
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
  },
  team: {
    monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_TEAM_YEARLY || '',
  },
  enterprise: null, // Custom pricing
};

// ============================================
// Customer Management
// ============================================

/**
 * Create or retrieve a Stripe customer for an organization
 */
export async function getOrCreateStripeCustomer(
  orgId: string,
  email: string,
  name?: string
): Promise<string> {
  const orgsCollection = await getOrganizationsCollection();
  const org = await orgsCollection.findOne({ orgId });

  if (!org) {
    throw new Error('Organization not found');
  }

  // Return existing customer ID if available
  if (org.stripeCustomerId) {
    return org.stripeCustomerId;
  }

  // Create new Stripe customer
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    name: name || org.name,
    metadata: {
      orgId: org.orgId,
      orgName: org.name,
    },
  });

  // Store customer ID
  await orgsCollection.updateOne(
    { orgId },
    {
      $set: {
        stripeCustomerId: customer.id,
        billingEmail: email,
        updatedAt: new Date(),
      },
    }
  );

  return customer.id;
}

/**
 * Update billing email for an organization
 */
export async function updateBillingEmail(
  orgId: string,
  email: string
): Promise<void> {
  const orgsCollection = await getOrganizationsCollection();
  const org = await orgsCollection.findOne({ orgId });

  if (!org) {
    throw new Error('Organization not found');
  }

  // Update Stripe customer if exists
  if (org.stripeCustomerId) {
    const stripe = getStripe();
    await stripe.customers.update(org.stripeCustomerId, { email });
  }

  // Update local record
  await orgsCollection.updateOne(
    { orgId },
    {
      $set: {
        billingEmail: email,
        updatedAt: new Date(),
      },
    }
  );
}

// ============================================
// Subscription Management
// ============================================

/**
 * Create a checkout session for upgrading to a paid plan
 */
export async function createCheckoutSession(
  orgId: string,
  tier: SubscriptionTier,
  interval: BillingInterval,
  userId: string,
  successUrl: string,
  cancelUrl: string,
  seatCount?: number
): Promise<{ sessionId: string; url: string }> {
  const stripe = getStripe();
  const orgsCollection = await getOrganizationsCollection();

  const org = await orgsCollection.findOne({ orgId });
  if (!org) {
    throw new Error('Organization not found');
  }

  // Get price ID for tier
  const prices = STRIPE_PRICES[tier];
  if (!prices) {
    throw new Error(`No Stripe price configured for tier: ${tier}`);
  }

  const priceId = interval === 'year' ? prices.yearly : prices.monthly;
  if (!priceId) {
    throw new Error(`No ${interval}ly price configured for tier: ${tier}`);
  }

  // Ensure customer exists
  const customerId = org.stripeCustomerId || await getOrCreateStripeCustomer(
    orgId,
    org.billingEmail || '',
    org.name
  );

  // Build line items
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [{
    price: priceId,
    quantity: tier === 'team' ? (seatCount || 1) : 1,
  }];

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: lineItems,
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        orgId,
        tier,
        userId,
        seatCount: seatCount?.toString() || '1',
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    customer_update: {
      address: 'auto',
      name: 'auto',
    },
  });

  // Log the checkout attempt
  await logBillingEvent({
    eventType: 'subscription.created',
    userId,
    resourceType: 'organization',
    resourceId: orgId,
    organizationId: orgId,
    action: 'checkout_started',
    details: { tier, interval, seatCount, sessionId: session.id },
    timestamp: new Date(),
  });

  return {
    sessionId: session.id,
    url: session.url!,
  };
}

/**
 * Create a customer portal session for managing billing
 */
export async function createPortalSession(
  orgId: string,
  returnUrl: string
): Promise<{ url: string }> {
  const stripe = getStripe();
  const orgsCollection = await getOrganizationsCollection();

  const org = await orgsCollection.findOne({ orgId });
  if (!org?.stripeCustomerId) {
    throw new Error('No billing account found for this organization');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}

/**
 * Cancel a subscription (at period end)
 */
export async function cancelSubscription(
  orgId: string,
  userId: string,
  immediate: boolean = false
): Promise<void> {
  const stripe = getStripe();
  const orgsCollection = await getOrganizationsCollection();

  const org = await orgsCollection.findOne({ orgId });
  if (!org?.subscription?.stripeSubscriptionId) {
    throw new Error('No active subscription found');
  }

  if (immediate) {
    await stripe.subscriptions.cancel(org.subscription.stripeSubscriptionId);
  } else {
    await stripe.subscriptions.update(org.subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  // Update local subscription
  await orgsCollection.updateOne(
    { orgId },
    {
      $set: {
        'subscription.cancelAtPeriodEnd': !immediate,
        'subscription.canceledAt': immediate ? new Date() : undefined,
        'subscription.status': immediate ? 'canceled' : org.subscription.status,
        'subscription.updatedAt': new Date(),
        updatedAt: new Date(),
      },
    }
  );

  await logBillingEvent({
    eventType: 'subscription.canceled',
    userId,
    resourceType: 'organization',
    resourceId: orgId,
    organizationId: orgId,
    action: immediate ? 'subscription_canceled_immediate' : 'subscription_cancel_scheduled',
    details: { subscriptionId: org.subscription.stripeSubscriptionId },
    timestamp: new Date(),
  });
}

/**
 * Reactivate a subscription that was scheduled for cancellation
 */
export async function reactivateSubscription(
  orgId: string,
  userId: string
): Promise<void> {
  const stripe = getStripe();
  const orgsCollection = await getOrganizationsCollection();

  const org = await orgsCollection.findOne({ orgId });
  if (!org?.subscription?.stripeSubscriptionId) {
    throw new Error('No subscription found');
  }

  await stripe.subscriptions.update(org.subscription.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  await orgsCollection.updateOne(
    { orgId },
    {
      $set: {
        'subscription.cancelAtPeriodEnd': false,
        'subscription.canceledAt': null,
        'subscription.updatedAt': new Date(),
        updatedAt: new Date(),
      },
    }
  );
}

/**
 * Update seat count for team tier
 */
export async function updateSeatCount(
  orgId: string,
  newSeatCount: number,
  userId: string
): Promise<void> {
  const stripe = getStripe();
  const orgsCollection = await getOrganizationsCollection();

  const org = await orgsCollection.findOne({ orgId });
  if (!org?.subscription?.stripeSubscriptionId) {
    throw new Error('No active subscription found');
  }

  if (org.subscription.tier !== 'team') {
    throw new Error('Seat count can only be updated for team tier');
  }

  // Get the subscription
  const subscription = await stripe.subscriptions.retrieve(
    org.subscription.stripeSubscriptionId
  );

  // Update the quantity
  await stripe.subscriptionItems.update(subscription.items.data[0].id, {
    quantity: newSeatCount,
  });

  // Update local record
  await orgsCollection.updateOne(
    { orgId },
    {
      $set: {
        'subscription.seatCount': newSeatCount,
        'subscription.updatedAt': new Date(),
        updatedAt: new Date(),
      },
    }
  );

  await logBillingEvent({
    eventType: 'subscription.updated',
    userId,
    resourceType: 'organization',
    resourceId: orgId,
    organizationId: orgId,
    action: 'seat_count_updated',
    details: { newSeatCount },
    timestamp: new Date(),
  });
}

// ============================================
// Subscription Sync (from Stripe webhooks)
// ============================================

/**
 * Sync subscription data from Stripe webhook
 */
export async function syncSubscriptionFromStripe(
  stripeSubscription: Stripe.Subscription
): Promise<void> {
  const orgsCollection = await getOrganizationsCollection();

  const orgId = stripeSubscription.metadata.orgId;
  if (!orgId) {
    console.error('[Billing] Subscription missing orgId in metadata:', stripeSubscription.id);
    return;
  }

  const tier = stripeSubscription.metadata.tier as SubscriptionTier;
  const seatCount = parseInt(stripeSubscription.metadata.seatCount || '1', 10);

  // Map Stripe status to our status
  const statusMap: Record<string, SubscriptionStatus> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    trialing: 'trialing',
    incomplete: 'incomplete',
    incomplete_expired: 'canceled',
    unpaid: 'past_due',
    paused: 'canceled',
  };

  // Get period dates from first subscription item (new Stripe API structure)
  const firstItem = stripeSubscription.items.data[0];

  const subscription: Subscription = {
    tier,
    status: statusMap[stripeSubscription.status] || 'incomplete',
    stripeSubscriptionId: stripeSubscription.id,
    stripePriceId: firstItem?.price.id,
    stripeProductId: firstItem?.price.product as string,
    billingInterval: firstItem?.price.recurring?.interval === 'year' ? 'year' : 'month',
    currentPeriodStart: firstItem?.current_period_start
      ? new Date(firstItem.current_period_start * 1000)
      : undefined,
    currentPeriodEnd: firstItem?.current_period_end
      ? new Date(firstItem.current_period_end * 1000)
      : undefined,
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    trialStart: stripeSubscription.trial_start
      ? new Date(stripeSubscription.trial_start * 1000)
      : undefined,
    trialEnd: stripeSubscription.trial_end
      ? new Date(stripeSubscription.trial_end * 1000)
      : undefined,
    seatCount: tier === 'team' ? seatCount : undefined,
    subscribedAt: new Date(stripeSubscription.created * 1000),
    canceledAt: stripeSubscription.canceled_at
      ? new Date(stripeSubscription.canceled_at * 1000)
      : undefined,
    updatedAt: new Date(),
  };

  // Get tier limits and apply to settings
  const tierConfig = SUBSCRIPTION_TIERS[tier];

  await orgsCollection.updateOne(
    { orgId },
    {
      $set: {
        subscription,
        plan: tier, // Keep legacy plan field in sync
        'settings.maxForms': tierConfig.limits.maxForms,
        'settings.maxSubmissionsPerMonth': tierConfig.limits.maxSubmissionsPerMonth,
        'settings.maxConnections': tierConfig.limits.maxConnections,
        'settings.dataRetentionDays': tierConfig.limits.dataRetentionDays,
        'settings.allowCustomBranding': tierConfig.platformFeatures.includes('custom_branding'),
        updatedAt: new Date(),
      },
    }
  );
}

// ============================================
// Usage Tracking
// ============================================

/**
 * Get or create usage record for current period
 */
export async function getOrCreateUsage(orgId: string): Promise<WithId<OrganizationUsage>> {
  const collection = await getUsageCollection();
  const period = getCurrentPeriod();

  let usage = await collection.findOne({ organizationId: orgId, period });

  if (!usage) {
    const newUsage: Omit<OrganizationUsage, '_id'> = {
      organizationId: orgId,
      period,
      forms: { created: 0, active: 0 },
      submissions: { total: 0, byForm: {} },
      storage: { filesBytes: 0, responsesBytes: 0 },
      ai: { generations: 0, agentSessions: 0, processingRuns: 0, tokensUsed: 0 },
      workflows: { executions: 0, byWorkflow: {}, successfulExecutions: 0, failedExecutions: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(newUsage as OrganizationUsage);
    usage = { ...newUsage, _id: result.insertedId };
  }

  return usage;
}

/**
 * Increment AI usage counter
 */
export async function incrementAIUsage(
  orgId: string,
  metric: 'generations' | 'agentSessions' | 'processingRuns',
  amount: number = 1,
  tokensUsed?: number
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const collection = await getUsageCollection();
  const period = getCurrentPeriod();

  // Get current usage and limits
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    return { allowed: false, current: 0, limit: 0 };
  }

  const tier = org.subscription?.tier || 'free';
  const limits = SUBSCRIPTION_TIERS[tier].limits;

  const limitKey = metric === 'generations'
    ? 'aiGenerationsPerMonth'
    : metric === 'agentSessions'
      ? 'agentSessionsPerMonth'
      : 'responseProcessingPerMonth';

  const limit = limits[limitKey];

  // Get current usage
  const currentUsage = await getOrCreateUsage(orgId);
  const current = currentUsage.ai[metric];

  // Check if allowed (before increment)
  const allowed = limit === -1 || current < limit;

  if (allowed) {
    // Increment usage
    const update: Record<string, number> = {
      [`ai.${metric}`]: amount,
    };
    if (tokensUsed) {
      update['ai.tokensUsed'] = tokensUsed;
    }

    await collection.updateOne(
      { organizationId: orgId, period },
      {
        $inc: update,
        $set: { updatedAt: new Date() },
      },
      { upsert: true }
    );
  }

  return { allowed, current, limit };
}

/**
 * Check if an AI operation is allowed (without incrementing)
 */
export async function checkAILimit(
  orgId: string,
  metric: 'generations' | 'agentSessions' | 'processingRuns'
): Promise<{ allowed: boolean; current: number; limit: number; remaining: number }> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    return { allowed: false, current: 0, limit: 0, remaining: 0 };
  }

  const tier = org.subscription?.tier || 'free';
  const limits = SUBSCRIPTION_TIERS[tier].limits;

  const limitKey = metric === 'generations'
    ? 'aiGenerationsPerMonth'
    : metric === 'agentSessions'
      ? 'agentSessionsPerMonth'
      : 'responseProcessingPerMonth';

  const limit = limits[limitKey];
  const usage = await getOrCreateUsage(orgId);
  const current = usage.ai[metric];

  const allowed = limit === -1 || current < limit;
  const remaining = limit === -1 ? -1 : Math.max(0, limit - current);

  return { allowed, current, limit, remaining };
}

/**
 * Increment submission count
 */
export async function incrementSubmissionUsage(
  orgId: string,
  formId: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const collection = await getUsageCollection();
  const period = getCurrentPeriod();

  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    return { allowed: false, current: 0, limit: 0 };
  }

  const tier = org.subscription?.tier || 'free';
  const limit = SUBSCRIPTION_TIERS[tier].limits.maxSubmissionsPerMonth;

  const usage = await getOrCreateUsage(orgId);
  const current = usage.submissions.total;
  const allowed = limit === -1 || current < limit;

  if (allowed) {
    await collection.updateOne(
      { organizationId: orgId, period },
      {
        $inc: {
          'submissions.total': 1,
          [`submissions.byForm.${formId}`]: 1,
        },
        $set: { updatedAt: new Date() },
      },
      { upsert: true }
    );
  }

  return { allowed, current, limit };
}

// ============================================
// Feature Access Checks
// ============================================

/**
 * Check if an organization has access to an AI feature
 */
export async function hasAIFeature(
  orgId: string,
  feature: AIFeature
): Promise<boolean> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) return false;

  const tier = org.subscription?.tier || 'free';
  const tierConfig = SUBSCRIPTION_TIERS[tier];

  return tierConfig.aiFeatures.includes(feature);
}

/**
 * Check if an organization has access to a platform feature
 */
export async function hasPlatformFeature(
  orgId: string,
  feature: PlatformFeature
): Promise<boolean> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) return false;

  const tier = org.subscription?.tier || 'free';
  const tierConfig = SUBSCRIPTION_TIERS[tier];

  return tierConfig.platformFeatures.includes(feature);
}

/**
 * Get all feature access for an organization
 */
export async function getFeatureAccess(orgId: string): Promise<{
  tier: SubscriptionTier;
  aiFeatures: AIFeature[];
  platformFeatures: PlatformFeature[];
  limits: TierLimits;
  usage: OrganizationUsage;
}> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    throw new Error('Organization not found');
  }

  const tier = org.subscription?.tier || 'free';
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const usage = await getOrCreateUsage(orgId);

  return {
    tier,
    aiFeatures: tierConfig.aiFeatures,
    platformFeatures: tierConfig.platformFeatures,
    limits: tierConfig.limits,
    usage,
  };
}

// ============================================
// Webhook Event Processing
// ============================================

/**
 * Record a billing event from Stripe webhook
 */
export async function recordBillingEvent(
  stripeEventId: string,
  type: BillingEvent['type'],
  orgId: string,
  data: Record<string, unknown>
): Promise<void> {
  const collection = await getBillingEventsCollection();

  // Check for duplicate
  const existing = await collection.findOne({ stripeEventId });
  if (existing) {
    console.log('[Billing] Duplicate event ignored:', stripeEventId);
    return;
  }

  const event: BillingEvent = {
    eventId: generateSecureId('evt'),
    stripeEventId,
    type,
    organizationId: orgId,
    data,
    createdAt: new Date(),
  };

  await collection.insertOne(event);
}

/**
 * Mark a billing event as processed
 */
export async function markEventProcessed(stripeEventId: string): Promise<void> {
  const collection = await getBillingEventsCollection();
  await collection.updateOne(
    { stripeEventId },
    { $set: { processedAt: new Date() } }
  );
}

// ============================================
// Storage Quota Management
// ============================================

/**
 * Check storage quota for an organization
 */
export async function checkStorageQuota(
  orgId: string,
  additionalBytes: number = 0
): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  percentUsed: number;
}> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    return { allowed: false, current: 0, limit: 0, remaining: 0, percentUsed: 0 };
  }

  const tier = org.subscription?.tier || 'free';
  const limitMb = SUBSCRIPTION_TIERS[tier].limits.maxFileStorageMb;
  const limitBytes = limitMb === -1 ? -1 : limitMb * 1024 * 1024;

  const usage = await getOrCreateUsage(orgId);
  const currentBytes = usage.storage.filesBytes;

  // Unlimited storage
  if (limitBytes === -1) {
    return {
      allowed: true,
      current: currentBytes,
      limit: -1,
      remaining: -1,
      percentUsed: 0,
    };
  }

  const wouldUse = currentBytes + additionalBytes;
  const allowed = wouldUse <= limitBytes;
  const remaining = Math.max(0, limitBytes - currentBytes);
  const percentUsed = (currentBytes / limitBytes) * 100;

  return { allowed, current: currentBytes, limit: limitBytes, remaining, percentUsed };
}

/**
 * Increment storage usage after file upload
 */
export async function incrementStorageUsage(
  orgId: string,
  bytesAdded: number
): Promise<{ allowed: boolean; current: number; limit: number }> {
  // Check quota first
  const quotaCheck = await checkStorageQuota(orgId, bytesAdded);

  if (!quotaCheck.allowed) {
    return {
      allowed: false,
      current: quotaCheck.current,
      limit: quotaCheck.limit,
    };
  }

  // Increment storage
  const collection = await getUsageCollection();
  const period = getCurrentPeriod();

  await collection.updateOne(
    { organizationId: orgId, period },
    {
      $inc: { 'storage.filesBytes': bytesAdded },
      $set: { updatedAt: new Date() },
    },
    { upsert: true }
  );

  return {
    allowed: true,
    current: quotaCheck.current + bytesAdded,
    limit: quotaCheck.limit,
  };
}

/**
 * Decrement storage usage after file deletion
 */
export async function decrementStorageUsage(
  orgId: string,
  bytesRemoved: number
): Promise<void> {
  const collection = await getUsageCollection();
  const period = getCurrentPeriod();

  await collection.updateOne(
    { organizationId: orgId, period },
    {
      $inc: { 'storage.filesBytes': -Math.abs(bytesRemoved) },
      $set: { updatedAt: new Date() },
    }
  );
}

/**
 * Get storage usage summary for display
 */
export async function getStorageUsageSummary(orgId: string): Promise<{
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  percentUsed: number;
  isUnlimited: boolean;
  usedFormatted: string;
  limitFormatted: string;
}> {
  const quota = await checkStorageQuota(orgId);

  return {
    usedBytes: quota.current,
    limitBytes: quota.limit,
    remainingBytes: quota.remaining,
    percentUsed: quota.percentUsed,
    isUnlimited: quota.limit === -1,
    usedFormatted: formatBytes(quota.current),
    limitFormatted: quota.limit === -1 ? 'Unlimited' : formatBytes(quota.limit),
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  if (bytes === -1) return 'Unlimited';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ============================================
// Helpers
// ============================================

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ============================================
// Workflow Usage & Rate Limiting
// ============================================

export interface WorkflowUsageResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  reason?: string;
}

/**
 * Check if a workflow execution is allowed (without incrementing)
 */
export async function checkWorkflowExecutionLimit(
  orgId: string
): Promise<WorkflowUsageResult> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      remaining: 0,
      reason: 'Organization not found',
    };
  }

  const tier = org.subscription?.tier || 'free';
  const limits = SUBSCRIPTION_TIERS[tier].limits;
  const limit = limits.workflowExecutionsPerMonth;

  const usage = await getOrCreateUsage(orgId);
  const current = usage.workflows?.executions || 0;

  // Unlimited
  if (limit === -1) {
    return {
      allowed: true,
      current,
      limit: -1,
      remaining: -1,
    };
  }

  const allowed = current < limit;
  const remaining = Math.max(0, limit - current);

  return {
    allowed,
    current,
    limit,
    remaining,
    reason: allowed ? undefined : `Monthly workflow execution limit reached (${limit})`,
  };
}

/**
 * Check if organization can have more active workflows
 */
export async function checkActiveWorkflowLimit(
  orgId: string,
  currentActiveCount: number
): Promise<WorkflowUsageResult> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      remaining: 0,
      reason: 'Organization not found',
    };
  }

  const tier = org.subscription?.tier || 'free';
  const limits = SUBSCRIPTION_TIERS[tier].limits;
  const limit = limits.maxActiveWorkflows;

  // Unlimited
  if (limit === -1) {
    return {
      allowed: true,
      current: currentActiveCount,
      limit: -1,
      remaining: -1,
    };
  }

  const allowed = currentActiveCount < limit;
  const remaining = Math.max(0, limit - currentActiveCount);

  return {
    allowed,
    current: currentActiveCount,
    limit,
    remaining,
    reason: allowed ? undefined : `Maximum active workflows limit reached (${limit})`,
  };
}

/**
 * Increment workflow execution count
 * Returns usage result with updated counts
 */
export async function incrementWorkflowExecution(
  orgId: string,
  workflowId: string,
  success: boolean
): Promise<WorkflowUsageResult> {
  const collection = await getUsageCollection();
  const period = getCurrentPeriod();

  // First check if allowed
  const check = await checkWorkflowExecutionLimit(orgId);
  if (!check.allowed) {
    return check;
  }

  // Increment usage
  const update: Record<string, number> = {
    'workflows.executions': 1,
    [`workflows.byWorkflow.${workflowId}`]: 1,
  };

  if (success) {
    update['workflows.successfulExecutions'] = 1;
  } else {
    update['workflows.failedExecutions'] = 1;
  }

  await collection.updateOne(
    { organizationId: orgId, period },
    {
      $inc: update,
      $set: { updatedAt: new Date() },
      $setOnInsert: {
        createdAt: new Date(),
        'forms.created': 0,
        'forms.active': 0,
        'submissions.total': 0,
        'submissions.byForm': {},
        'storage.filesBytes': 0,
        'storage.responsesBytes': 0,
        'ai.generations': 0,
        'ai.agentSessions': 0,
        'ai.processingRuns': 0,
        'ai.tokensUsed': 0,
      },
    },
    { upsert: true }
  );

  return {
    allowed: true,
    current: check.current + 1,
    limit: check.limit,
    remaining: check.limit === -1 ? -1 : Math.max(0, check.limit - check.current - 1),
  };
}

/**
 * Get workflow usage summary for an organization
 */
export async function getWorkflowUsageSummary(orgId: string): Promise<{
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
}> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    throw new Error('Organization not found');
  }

  const tier = org.subscription?.tier || 'free';
  const limits = SUBSCRIPTION_TIERS[tier].limits;
  const usage = await getOrCreateUsage(orgId);

  const executionsLimit = limits.workflowExecutionsPerMonth;
  const current = usage.workflows?.executions || 0;
  const successfulExecutions = usage.workflows?.successfulExecutions || 0;
  const totalExecutions = current;

  // Calculate top workflows
  const byWorkflow = usage.workflows?.byWorkflow || {};
  const topWorkflows = Object.entries(byWorkflow)
    .map(([workflowId, executions]) => ({ workflowId, executions }))
    .sort((a, b) => b.executions - a.executions)
    .slice(0, 5);

  return {
    executions: {
      current,
      limit: executionsLimit,
      remaining: executionsLimit === -1 ? -1 : Math.max(0, executionsLimit - current),
      percentUsed: executionsLimit === -1 ? 0 : (current / executionsLimit) * 100,
      isUnlimited: executionsLimit === -1,
    },
    activeWorkflows: {
      limit: limits.maxActiveWorkflows,
      isUnlimited: limits.maxActiveWorkflows === -1,
    },
    successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 100,
    topWorkflows,
  };
}

async function logBillingEvent(event: Omit<AuditLogEntry, '_id'>): Promise<void> {
  try {
    const collection = await getPlatformAuditCollection();
    await collection.insertOne(event as AuditLogEntry);
  } catch (error) {
    console.error('[Billing Audit] Failed to log event:', error);
  }
}

// ============================================
// Form Limit Checking
// ============================================

export interface FormLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  reason?: string;
}

/**
 * Check if organization can create more forms
 */
export async function checkFormLimit(
  orgId: string,
  currentFormCount: number
): Promise<FormLimitResult> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      remaining: 0,
      reason: 'Organization not found',
    };
  }

  const tier = org.subscription?.tier || 'free';
  const limit = SUBSCRIPTION_TIERS[tier].limits.maxForms;

  // Unlimited
  if (limit === -1) {
    return {
      allowed: true,
      current: currentFormCount,
      limit: -1,
      remaining: -1,
    };
  }

  const allowed = currentFormCount < limit;
  const remaining = Math.max(0, limit - currentFormCount);

  return {
    allowed,
    current: currentFormCount,
    limit,
    remaining,
    reason: allowed ? undefined : `Maximum forms limit reached (${limit})`,
  };
}

// ============================================
// Connection Limit Checking
// ============================================

export interface ConnectionLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  reason?: string;
}

/**
 * Check if organization can create more connections
 */
export async function checkConnectionLimit(
  orgId: string,
  currentConnectionCount: number
): Promise<ConnectionLimitResult> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      remaining: 0,
      reason: 'Organization not found',
    };
  }

  const tier = org.subscription?.tier || 'free';
  const limit = SUBSCRIPTION_TIERS[tier].limits.maxConnections;

  // Unlimited
  if (limit === -1) {
    return {
      allowed: true,
      current: currentConnectionCount,
      limit: -1,
      remaining: -1,
    };
  }

  const allowed = currentConnectionCount < limit;
  const remaining = Math.max(0, limit - currentConnectionCount);

  return {
    allowed,
    current: currentConnectionCount,
    limit,
    remaining,
    reason: allowed ? undefined : `Maximum connections limit reached (${limit})`,
  };
}

// ============================================
// Submission Limit Checking (pre-check without increment)
// ============================================

export interface SubmissionLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  reason?: string;
}

/**
 * Check if a submission is allowed (without incrementing)
 */
export async function checkSubmissionLimit(
  orgId: string
): Promise<SubmissionLimitResult> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      remaining: 0,
      reason: 'Organization not found',
    };
  }

  const tier = org.subscription?.tier || 'free';
  const limit = SUBSCRIPTION_TIERS[tier].limits.maxSubmissionsPerMonth;
  const usage = await getOrCreateUsage(orgId);
  const current = usage.submissions.total;

  // Unlimited
  if (limit === -1) {
    return {
      allowed: true,
      current,
      limit: -1,
      remaining: -1,
    };
  }

  const allowed = current < limit;
  const remaining = Math.max(0, limit - current);

  return {
    allowed,
    current,
    limit,
    remaining,
    reason: allowed ? undefined : `Monthly submission limit reached (${limit})`,
  };
}

// ============================================
// Field Limit Checking
// ============================================

export interface FieldLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  reason?: string;
}

/**
 * Check if a form can have more fields
 */
export async function checkFieldLimit(
  orgId: string,
  currentFieldCount: number
): Promise<FieldLimitResult> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      remaining: 0,
      reason: 'Organization not found',
    };
  }

  const tier = org.subscription?.tier || 'free';
  const limit = SUBSCRIPTION_TIERS[tier].limits.maxFieldsPerForm;

  // Unlimited
  if (limit === -1) {
    return {
      allowed: true,
      current: currentFieldCount,
      limit: -1,
      remaining: -1,
    };
  }

  const allowed = currentFieldCount < limit;
  const remaining = Math.max(0, limit - currentFieldCount);

  return {
    allowed,
    current: currentFieldCount,
    limit,
    remaining,
    reason: allowed ? undefined : `Maximum fields per form limit reached (${limit})`,
  };
}

// ============================================
// Initialization
// ============================================

/**
 * Initialize a new organization with free tier subscription
 */
export async function initializeFreeSubscription(orgId: string): Promise<void> {
  const orgsCollection = await getOrganizationsCollection();

  const subscription: Subscription = {
    tier: 'free',
    status: 'active',
    updatedAt: new Date(),
  };

  await orgsCollection.updateOne(
    { orgId },
    {
      $set: {
        subscription,
        plan: 'free',
        updatedAt: new Date(),
      },
    }
  );

  // Create initial usage record
  await getOrCreateUsage(orgId);
}
