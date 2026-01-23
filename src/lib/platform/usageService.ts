/**
 * Local Usage Service
 *
 * Provides usage tracking and limit enforcement for self-hosted deployments.
 * This is the fallback when @netpad/cloud-features is not installed.
 *
 * In self-hosted mode:
 * - Usage tracking still works
 * - Limits are enforced based on local configuration
 * - No Stripe integration (billing handled externally)
 */

import { WithId } from 'mongodb';
import {
  getOrganizationsCollection,
  getUsageCollection,
} from './db';
import {
  SUBSCRIPTION_TIERS,
  OrganizationUsage,
  SubscriptionTier,
  AIFeature,
  PlatformFeature,
  TierLimits,
} from '@/types/platform';
import { checkFeatureAccess, FEATURE_REQUIREMENTS } from './clusterChecks';
import { ClusterInstanceSize } from '@/lib/atlas/types';

// ============================================
// Types matching the extension interface
// ============================================

export interface UsageLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  reason?: string;
}

export interface AIFeatureAccessResult {
  allowed: boolean;
  reason?: string;
  requiredTier?: SubscriptionTier;
  requiredClusterTier?: ClusterInstanceSize;
  currentClusterTier?: ClusterInstanceSize | null;
}

export interface StorageUsageSummary {
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  percentUsed: number;
  isUnlimited: boolean;
  usedFormatted: string;
  limitFormatted: string;
}

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

export interface FeatureAccessSummary {
  tier: SubscriptionTier;
  aiFeatures: AIFeature[];
  platformFeatures: PlatformFeature[];
  limits: TierLimits;
  usage: OrganizationUsage;
}

// ============================================
// Helpers
// ============================================

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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
// Usage Record Management
// ============================================

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

// ============================================
// AI Usage
// ============================================

export async function incrementAIUsage(
  orgId: string,
  metric: 'generations' | 'agentSessions' | 'processingRuns',
  amount: number = 1,
  tokensUsed?: number
): Promise<UsageLimitResult> {
  const collection = await getUsageCollection();
  const period = getCurrentPeriod();

  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    return { allowed: false, current: 0, limit: 0, remaining: 0, reason: 'Organization not found' };
  }

  const tier = org.subscription?.tier || 'free';
  const limits = SUBSCRIPTION_TIERS[tier].limits;

  const limitKey = metric === 'generations'
    ? 'aiGenerationsPerMonth'
    : metric === 'agentSessions'
      ? 'agentSessionsPerMonth'
      : 'responseProcessingPerMonth';

  const limit = limits[limitKey];
  const currentUsage = await getOrCreateUsage(orgId);
  const current = currentUsage.ai[metric];
  const allowed = limit === -1 || current < limit;

  if (allowed) {
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

  return {
    allowed,
    current,
    limit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - current),
    reason: allowed ? undefined : `AI ${metric} limit reached`,
  };
}

export async function checkAILimit(
  orgId: string,
  metric: 'generations' | 'agentSessions' | 'processingRuns'
): Promise<UsageLimitResult> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    return { allowed: false, current: 0, limit: 0, remaining: 0, reason: 'Organization not found' };
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

  return {
    allowed,
    current,
    limit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - current),
    reason: allowed ? undefined : `AI ${metric} limit reached`,
  };
}

export async function hasAIFeature(
  orgId: string,
  feature: AIFeature
): Promise<AIFeatureAccessResult> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    return { allowed: false, reason: 'Organization not found' };
  }

  const tier = org.subscription?.tier || 'free';
  const tierConfig = SUBSCRIPTION_TIERS[tier];

  if (!tierConfig) {
    return { allowed: false, reason: 'Invalid subscription tier', requiredTier: 'pro' };
  }

  if (!tierConfig.aiFeatures.includes(feature)) {
    const tiersWithFeature = (['pro', 'team', 'enterprise'] as SubscriptionTier[]).filter(
      (t) => SUBSCRIPTION_TIERS[t].aiFeatures.includes(feature)
    );
    return {
      allowed: false,
      reason: `This feature requires a ${tiersWithFeature[0] || 'higher'} subscription`,
      requiredTier: tiersWithFeature[0],
    };
  }

  // Check cluster tier requirements for RAG features
  const featureRequirements = FEATURE_REQUIREMENTS[feature];
  if (featureRequirements?.clusterTier) {
    const clusterAccess = await checkFeatureAccess(orgId, feature);

    if (!clusterAccess.hasAccess) {
      return {
        allowed: false,
        reason: clusterAccess.reason || `This feature requires an ${featureRequirements.clusterTier}+ cluster`,
        requiredClusterTier: clusterAccess.requiredClusterTier,
        currentClusterTier: clusterAccess.currentClusterTier,
      };
    }
  }

  return { allowed: true };
}

// ============================================
// Submission Usage
// ============================================

export async function incrementSubmissionUsage(
  orgId: string,
  formId: string
): Promise<UsageLimitResult> {
  const collection = await getUsageCollection();
  const period = getCurrentPeriod();

  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    return { allowed: false, current: 0, limit: 0, remaining: 0, reason: 'Organization not found' };
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

  return {
    allowed,
    current,
    limit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - current),
    reason: allowed ? undefined : 'Monthly submission limit reached',
  };
}

export async function checkSubmissionLimit(orgId: string): Promise<UsageLimitResult> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    return { allowed: false, current: 0, limit: 0, remaining: 0, reason: 'Organization not found' };
  }

  const tier = org.subscription?.tier || 'free';
  const limit = SUBSCRIPTION_TIERS[tier].limits.maxSubmissionsPerMonth;

  const usage = await getOrCreateUsage(orgId);
  const current = usage.submissions.total;
  const allowed = limit === -1 || current < limit;

  return {
    allowed,
    current,
    limit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - current),
    reason: allowed ? undefined : 'Monthly submission limit reached',
  };
}

// ============================================
// Storage Usage
// ============================================

export async function checkStorageQuota(
  orgId: string,
  additionalBytes: number = 0
): Promise<UsageLimitResult & { percentUsed: number }> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    return { allowed: false, current: 0, limit: 0, remaining: 0, percentUsed: 0, reason: 'Organization not found' };
  }

  const tier = org.subscription?.tier || 'free';
  const storageMb = SUBSCRIPTION_TIERS[tier].limits.maxFileStorageMb;
  const limitBytes = storageMb === -1 ? -1 : storageMb * 1024 * 1024;

  const usage = await getOrCreateUsage(orgId);
  const currentBytes = usage.storage.filesBytes + usage.storage.responsesBytes;
  const projectedBytes = currentBytes + additionalBytes;

  const allowed = limitBytes === -1 || projectedBytes <= limitBytes;
  const percentUsed = limitBytes === -1 ? 0 : Math.round((currentBytes / limitBytes) * 100);

  return {
    allowed,
    current: currentBytes,
    limit: limitBytes,
    remaining: limitBytes === -1 ? -1 : Math.max(0, limitBytes - currentBytes),
    percentUsed,
    reason: allowed ? undefined : 'Storage quota exceeded',
  };
}

export async function incrementStorageUsage(orgId: string, bytes: number): Promise<void> {
  const collection = await getUsageCollection();
  const period = getCurrentPeriod();

  await collection.updateOne(
    { organizationId: orgId, period },
    {
      $inc: { 'storage.filesBytes': bytes },
      $set: { updatedAt: new Date() },
    },
    { upsert: true }
  );
}

export async function decrementStorageUsage(orgId: string, bytes: number): Promise<void> {
  const collection = await getUsageCollection();
  const period = getCurrentPeriod();

  await collection.updateOne(
    { organizationId: orgId, period },
    {
      $inc: { 'storage.filesBytes': -Math.abs(bytes) },
      $set: { updatedAt: new Date() },
    }
  );
}

export async function getStorageUsageSummary(orgId: string): Promise<StorageUsageSummary> {
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

// ============================================
// Workflow Usage
// ============================================

export async function checkWorkflowExecutionLimit(orgId: string): Promise<UsageLimitResult> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    return { allowed: false, current: 0, limit: 0, remaining: 0, reason: 'Organization not found' };
  }

  const tier = org.subscription?.tier || 'free';
  const limit = SUBSCRIPTION_TIERS[tier].limits.workflowExecutionsPerMonth;

  const usage = await getOrCreateUsage(orgId);
  const current = usage.workflows?.executions || 0;

  const allowed = limit === -1 || current < limit;

  return {
    allowed,
    current,
    limit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - current),
    reason: allowed ? undefined : 'Monthly workflow execution limit reached',
  };
}

export async function checkActiveWorkflowLimit(
  orgId: string,
  currentActiveCount: number
): Promise<UsageLimitResult> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    return { allowed: false, current: 0, limit: 0, remaining: 0, reason: 'Organization not found' };
  }

  const tier = org.subscription?.tier || 'free';
  const limit = SUBSCRIPTION_TIERS[tier].limits.maxActiveWorkflows;

  const allowed = limit === -1 || currentActiveCount < limit;

  return {
    allowed,
    current: currentActiveCount,
    limit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - currentActiveCount),
    reason: allowed ? undefined : 'Maximum active workflows limit reached',
  };
}

export async function incrementWorkflowExecutionAtQueue(
  orgId: string,
  workflowId: string
): Promise<UsageLimitResult> {
  const collection = await getUsageCollection();
  const period = getCurrentPeriod();

  const check = await checkWorkflowExecutionLimit(orgId);
  if (!check.allowed) {
    return check;
  }

  await collection.updateOne(
    { organizationId: orgId, period },
    {
      $inc: {
        'workflows.executions': 1,
        [`workflows.byWorkflow.${workflowId}`]: 1,
      },
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
        'workflows.successfulExecutions': 0,
        'workflows.failedExecutions': 0,
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

export async function updateWorkflowExecutionResult(
  orgId: string,
  workflowId: string,
  success: boolean
): Promise<void> {
  const collection = await getUsageCollection();
  const period = getCurrentPeriod();

  const field = success ? 'workflows.successfulExecutions' : 'workflows.failedExecutions';
  await collection.updateOne(
    { organizationId: orgId, period },
    {
      $inc: { [field]: 1 },
      $set: { updatedAt: new Date() },
    }
  );
}

export async function getWorkflowUsageSummary(orgId: string): Promise<WorkflowUsageSummary> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    throw new Error('Organization not found');
  }

  const tier = org.subscription?.tier || 'free';
  const limits = SUBSCRIPTION_TIERS[tier].limits;

  const usage = await getOrCreateUsage(orgId);
  const executions = usage.workflows?.executions || 0;
  const successful = usage.workflows?.successfulExecutions || 0;
  const failed = usage.workflows?.failedExecutions || 0;

  const executionLimit = limits.workflowExecutionsPerMonth;
  const activeLimit = limits.maxActiveWorkflows;

  const byWorkflow = usage.workflows?.byWorkflow || {};
  const topWorkflows = Object.entries(byWorkflow)
    .map(([workflowId, count]) => ({ workflowId, executions: count }))
    .sort((a, b) => b.executions - a.executions)
    .slice(0, 5);

  return {
    executions: {
      current: executions,
      limit: executionLimit,
      remaining: executionLimit === -1 ? -1 : Math.max(0, executionLimit - executions),
      percentUsed: executionLimit === -1 ? 0 : Math.round((executions / executionLimit) * 100),
      isUnlimited: executionLimit === -1,
    },
    activeWorkflows: {
      limit: activeLimit,
      isUnlimited: activeLimit === -1,
    },
    successRate: executions > 0 ? Math.round((successful / (successful + failed)) * 100) : 0,
    topWorkflows,
  };
}

// ============================================
// Form/Connection/Field Limits
// ============================================

export async function checkFormLimit(
  orgId: string,
  currentFormCount: number
): Promise<UsageLimitResult> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    return { allowed: false, current: 0, limit: 0, remaining: 0, reason: 'Organization not found' };
  }

  const tier = org.subscription?.tier || 'free';
  const limit = SUBSCRIPTION_TIERS[tier].limits.maxForms;

  const allowed = limit === -1 || currentFormCount < limit;

  return {
    allowed,
    current: currentFormCount,
    limit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - currentFormCount),
    reason: allowed ? undefined : 'Maximum forms limit reached',
  };
}

export async function checkConnectionLimit(
  orgId: string,
  currentConnectionCount: number
): Promise<UsageLimitResult> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    return { allowed: false, current: 0, limit: 0, remaining: 0, reason: 'Organization not found' };
  }

  const tier = org.subscription?.tier || 'free';
  const limit = SUBSCRIPTION_TIERS[tier].limits.maxConnections;

  const allowed = limit === -1 || currentConnectionCount < limit;

  return {
    allowed,
    current: currentConnectionCount,
    limit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - currentConnectionCount),
    reason: allowed ? undefined : 'Maximum connections limit reached',
  };
}

export async function checkFieldLimit(
  orgId: string,
  currentFieldCount: number
): Promise<UsageLimitResult> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) {
    return { allowed: false, current: 0, limit: 0, remaining: 0, reason: 'Organization not found' };
  }

  const tier = org.subscription?.tier || 'free';
  const limit = SUBSCRIPTION_TIERS[tier].limits.maxFieldsPerForm;

  const allowed = limit === -1 || currentFieldCount < limit;

  return {
    allowed,
    current: currentFieldCount,
    limit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - currentFieldCount),
    reason: allowed ? undefined : 'Maximum fields per form limit reached',
  };
}

// ============================================
// Feature Access
// ============================================

export async function hasPlatformFeature(orgId: string, feature: PlatformFeature): Promise<boolean> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  if (!org) return false;

  const tier = org.subscription?.tier || 'free';
  const tierConfig = SUBSCRIPTION_TIERS[tier];

  return tierConfig.platformFeatures.includes(feature);
}

export async function getFeatureAccess(orgId: string): Promise<FeatureAccessSummary> {
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
// Subscription Management
// ============================================

export async function initializeFreeSubscription(orgId: string): Promise<void> {
  const orgsCollection = await getOrganizationsCollection();

  await orgsCollection.updateOne(
    { orgId },
    {
      $set: {
        subscription: {
          tier: 'free',
          status: 'active',
          updatedAt: new Date(),
        },
        plan: 'free',
        updatedAt: new Date(),
      },
    }
  );

  await getOrCreateUsage(orgId);
}

export async function getSubscriptionTier(orgId: string): Promise<SubscriptionTier> {
  const org = await (await getOrganizationsCollection()).findOne({ orgId });
  return org?.subscription?.tier || 'free';
}
