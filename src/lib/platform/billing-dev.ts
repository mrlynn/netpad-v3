/**
 * Development Billing Utilities
 *
 * Mock billing functions for local development without Stripe.
 * These allow testing subscription tiers and feature gates.
 */

import { getOrganizationsCollection, getUsageCollection } from './db';
import {
  SubscriptionTier,
  Subscription,
  SUBSCRIPTION_TIERS,
  OrganizationUsage,
} from '@/types/platform';

// ============================================
// Dev-only: Set subscription tier directly
// ============================================

/**
 * Set an organization's subscription tier directly (no Stripe).
 * Use this for local development and testing.
 *
 * @example
 * // In a test or dev script:
 * await setDevSubscriptionTier('org_abc123', 'pro');
 */
export async function setDevSubscriptionTier(
  orgId: string,
  tier: SubscriptionTier
): Promise<void> {
  const orgsCollection = await getOrganizationsCollection();

  const tierConfig = SUBSCRIPTION_TIERS[tier];

  const subscription: Subscription = {
    tier,
    status: 'active',
    // Mock Stripe IDs for testing
    stripeSubscriptionId: `dev_sub_${orgId}_${tier}`,
    billingInterval: 'month',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    updatedAt: new Date(),
  };

  await orgsCollection.updateOne(
    { orgId },
    {
      $set: {
        subscription,
        plan: tier,
        'settings.maxForms': tierConfig.limits.maxForms,
        'settings.maxSubmissionsPerMonth': tierConfig.limits.maxSubmissionsPerMonth,
        'settings.maxConnections': tierConfig.limits.maxConnections,
        'settings.dataRetentionDays': tierConfig.limits.dataRetentionDays,
        'settings.allowCustomBranding': tierConfig.platformFeatures.includes('custom_branding'),
        updatedAt: new Date(),
      },
    }
  );

  console.log(`[Dev Billing] Set ${orgId} to ${tier} tier`);
}

/**
 * Reset usage counters for an organization.
 * Useful for testing limit-reached scenarios.
 */
export async function resetDevUsage(orgId: string): Promise<void> {
  const collection = await getUsageCollection();
  const period = getCurrentPeriod();

  await collection.updateOne(
    { organizationId: orgId, period },
    {
      $set: {
        'ai.generations': 0,
        'ai.agentSessions': 0,
        'ai.processingRuns': 0,
        'ai.tokensUsed': 0,
        'submissions.total': 0,
        'submissions.byForm': {},
        'workflows.executions': 0,
        'workflows.successfulExecutions': 0,
        'workflows.failedExecutions': 0,
        'workflows.byWorkflow': {},
        updatedAt: new Date(),
      },
    }
  );

  console.log(`[Dev Billing] Reset usage for ${orgId}`);
}

/**
 * Set specific usage values for testing limits.
 */
export async function setDevUsage(
  orgId: string,
  usage: Partial<{
    aiGenerations: number;
    agentSessions: number;
    processingRuns: number;
    submissions: number;
    workflowExecutions: number;
  }>
): Promise<void> {
  const collection = await getUsageCollection();
  const period = getCurrentPeriod();

  const update: Record<string, number> = {};
  if (usage.aiGenerations !== undefined) update['ai.generations'] = usage.aiGenerations;
  if (usage.agentSessions !== undefined) update['ai.agentSessions'] = usage.agentSessions;
  if (usage.processingRuns !== undefined) update['ai.processingRuns'] = usage.processingRuns;
  if (usage.submissions !== undefined) update['submissions.total'] = usage.submissions;
  if (usage.workflowExecutions !== undefined) update['workflows.executions'] = usage.workflowExecutions;

  await collection.updateOne(
    { organizationId: orgId, period },
    {
      $set: {
        ...update,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  console.log(`[Dev Billing] Set usage for ${orgId}:`, usage);
}

/**
 * Get current subscription info for debugging.
 */
export async function getDevSubscriptionInfo(orgId: string): Promise<{
  tier: SubscriptionTier;
  features: string[];
  limits: Record<string, number>;
  usage: Record<string, number>;
}> {
  const orgsCollection = await getOrganizationsCollection();
  const usageCollection = await getUsageCollection();

  const org = await orgsCollection.findOne({ orgId });
  if (!org) {
    throw new Error(`Organization not found: ${orgId}`);
  }

  const tier = org.subscription?.tier || 'free';
  const tierConfig = SUBSCRIPTION_TIERS[tier];

  const period = getCurrentPeriod();
  const usage = await usageCollection.findOne({ organizationId: orgId, period });

  return {
    tier,
    features: [...tierConfig.aiFeatures, ...tierConfig.platformFeatures],
    limits: {
      maxForms: tierConfig.limits.maxForms,
      maxSubmissions: tierConfig.limits.maxSubmissionsPerMonth,
      aiGenerations: tierConfig.limits.aiGenerationsPerMonth,
      agentSessions: tierConfig.limits.agentSessionsPerMonth,
      workflowExecutions: tierConfig.limits.workflowExecutionsPerMonth,
      maxConnections: tierConfig.limits.maxConnections,
      maxActiveWorkflows: tierConfig.limits.maxActiveWorkflows,
      maxFieldsPerForm: tierConfig.limits.maxFieldsPerForm,
    },
    usage: {
      aiGenerations: usage?.ai?.generations || 0,
      agentSessions: usage?.ai?.agentSessions || 0,
      submissions: usage?.submissions?.total || 0,
      workflowExecutions: usage?.workflows?.executions || 0,
    },
  };
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
