/**
 * Feature Gate Hooks
 *
 * React hooks for checking subscription-based feature access and usage limits.
 * Integrates with the organization's subscription tier to determine what features
 * and AI capabilities are available.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SubscriptionTier,
  AIFeature,
  PlatformFeature,
  TierLimits,
  SUBSCRIPTION_TIERS,
  OrganizationUsage,
} from '@/types/platform';

// ============================================
// Types
// ============================================

export type UsageLimitKey =
  | 'aiGenerations'
  | 'agentSessions'
  | 'responseProcessing'
  | 'submissions'
  | 'forms'
  | 'connections'
  | 'storage';

export interface FeatureGateResult {
  hasAccess: boolean;
  reason?: 'tier_required' | 'limit_reached' | 'not_configured' | 'loading';
  requiredTier?: SubscriptionTier;
  currentUsage?: number;
  limit?: number;
  remaining?: number;
  upgradeUrl?: string;
}

export interface UsageLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  percentage: number;
  isUnlimited: boolean;
}

export interface SubscriptionState {
  tier: SubscriptionTier;
  loading: boolean;
  error: string | null;
  usage: OrganizationUsage | null;
  refresh: () => Promise<void>;
}

// ============================================
// Context (for org subscription state)
// ============================================

// This would typically come from a context provider
// For now, we'll fetch it on demand

interface CachedSubscriptionData {
  tier: SubscriptionTier;
  aiFeatures: AIFeature[];
  platformFeatures: PlatformFeature[];
  limits: TierLimits;
  usage: OrganizationUsage;
  fetchedAt: number;
}

let subscriptionCache: CachedSubscriptionData | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute

async function fetchSubscriptionData(orgId: string): Promise<CachedSubscriptionData | null> {
  // Check cache
  if (subscriptionCache && Date.now() - subscriptionCache.fetchedAt < CACHE_TTL) {
    return subscriptionCache;
  }

  try {
    const response = await fetch(`/api/billing/features?orgId=${orgId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch subscription data');
    }

    const data = await response.json();
    subscriptionCache = {
      ...data,
      fetchedAt: Date.now(),
    };

    return subscriptionCache;
  } catch (error) {
    console.error('[useFeatureGate] Failed to fetch subscription:', error);
    return null;
  }
}

function invalidateCache() {
  subscriptionCache = null;
}

// ============================================
// Main Hook: useFeatureGate
// ============================================

/**
 * Check if the current organization has access to a specific feature
 */
export function useFeatureGate(
  feature: AIFeature | PlatformFeature,
  orgId?: string
): FeatureGateResult {
  const [result, setResult] = useState<FeatureGateResult>({
    hasAccess: false,
    reason: 'loading',
  });

  useEffect(() => {
    if (!orgId) {
      setResult({ hasAccess: false, reason: 'not_configured' });
      return;
    }

    let cancelled = false;

    async function checkAccess() {
      const data = await fetchSubscriptionData(orgId!);

      if (cancelled) return;

      if (!data) {
        setResult({ hasAccess: false, reason: 'not_configured' });
        return;
      }

      // Check if feature is available in this tier
      const isAIFeature = data.aiFeatures.includes(feature as AIFeature);
      const isPlatformFeature = data.platformFeatures.includes(feature as PlatformFeature);
      const hasAccess = isAIFeature || isPlatformFeature;

      if (hasAccess) {
        setResult({ hasAccess: true });
      } else {
        // Find the lowest tier that has this feature
        const requiredTier = findRequiredTier(feature);
        setResult({
          hasAccess: false,
          reason: 'tier_required',
          requiredTier,
          upgradeUrl: `/settings/billing?upgrade=${requiredTier}&feature=${feature}`,
        });
      }
    }

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [feature, orgId]);

  return result;
}

/**
 * Check if an AI feature is available with usage limit checking
 */
export function useAIFeatureGate(
  feature: AIFeature,
  orgId?: string
): FeatureGateResult & { incrementUsage: () => Promise<boolean> } {
  const baseResult = useFeatureGate(feature, orgId);
  const [usageResult, setUsageResult] = useState<{
    current: number;
    limit: number;
    remaining: number;
  } | null>(null);

  // Determine which usage metric this feature uses
  const usageMetric = useMemo(() => {
    if (feature.startsWith('ai_')) return 'generations';
    if (feature.startsWith('agent_')) return 'agentSessions';
    return 'generations';
  }, [feature]);

  useEffect(() => {
    if (!orgId || !baseResult.hasAccess) return;

    let cancelled = false;

    async function checkUsage() {
      const data = await fetchSubscriptionData(orgId!);
      if (cancelled || !data) return;

      const limitKey = usageMetric === 'generations'
        ? 'aiGenerationsPerMonth'
        : usageMetric === 'agentSessions'
          ? 'agentSessionsPerMonth'
          : 'responseProcessingPerMonth';

      const limit = data.limits[limitKey as keyof TierLimits] as number;
      const current = data.usage.ai[usageMetric as keyof typeof data.usage.ai] as number;
      const remaining = limit === -1 ? -1 : Math.max(0, limit - current);

      setUsageResult({ current, limit, remaining });
    }

    checkUsage();

    return () => {
      cancelled = true;
    };
  }, [orgId, baseResult.hasAccess, usageMetric]);

  // Build combined result
  const combinedResult = useMemo((): FeatureGateResult => {
    if (!baseResult.hasAccess) {
      return baseResult;
    }

    if (!usageResult) {
      return { ...baseResult, reason: 'loading' };
    }

    // Check if limit reached
    if (usageResult.limit !== -1 && usageResult.current >= usageResult.limit) {
      return {
        hasAccess: false,
        reason: 'limit_reached',
        currentUsage: usageResult.current,
        limit: usageResult.limit,
        remaining: 0,
        upgradeUrl: `/settings/billing?reason=limit_${usageMetric}`,
      };
    }

    return {
      hasAccess: true,
      currentUsage: usageResult.current,
      limit: usageResult.limit,
      remaining: usageResult.remaining,
    };
  }, [baseResult, usageResult, usageMetric]);

  // Function to increment usage (call before performing the action)
  const incrementUsage = useCallback(async (): Promise<boolean> => {
    if (!orgId) return false;

    try {
      const response = await fetch('/api/billing/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          metric: usageMetric,
          amount: 1,
        }),
      });

      const data = await response.json();

      if (data.allowed) {
        // Invalidate cache to reflect new usage
        invalidateCache();
        return true;
      }

      return false;
    } catch (error) {
      console.error('[useAIFeatureGate] Failed to increment usage:', error);
      return false;
    }
  }, [orgId, usageMetric]);

  return { ...combinedResult, incrementUsage };
}

// ============================================
// Usage Limit Hooks
// ============================================

/**
 * Check a specific usage limit
 */
export function useUsageLimit(
  limitKey: UsageLimitKey,
  orgId?: string
): UsageLimitResult & { loading: boolean } {
  const [result, setResult] = useState<UsageLimitResult & { loading: boolean }>({
    allowed: false,
    current: 0,
    limit: 0,
    remaining: 0,
    percentage: 0,
    isUnlimited: false,
    loading: true,
  });

  useEffect(() => {
    if (!orgId) {
      setResult((prev) => ({ ...prev, loading: false }));
      return;
    }

    let cancelled = false;

    async function fetchLimit() {
      const data = await fetchSubscriptionData(orgId!);

      if (cancelled) return;

      if (!data) {
        setResult((prev) => ({ ...prev, loading: false }));
        return;
      }

      // Map limitKey to actual limit and usage values
      const { limit, current } = getLimitAndUsage(limitKey, data);
      const isUnlimited = limit === -1;
      const remaining = isUnlimited ? -1 : Math.max(0, limit - current);
      const percentage = isUnlimited ? 0 : Math.min(100, (current / limit) * 100);

      setResult({
        allowed: isUnlimited || current < limit,
        current,
        limit,
        remaining,
        percentage,
        isUnlimited,
        loading: false,
      });
    }

    fetchLimit();

    return () => {
      cancelled = true;
    };
  }, [limitKey, orgId]);

  return result;
}

/**
 * Get all usage limits at once
 */
export function useAllUsageLimits(orgId?: string): {
  limits: Record<UsageLimitKey, UsageLimitResult>;
  loading: boolean;
  refresh: () => void;
} {
  const [limits, setLimits] = useState<Record<UsageLimitKey, UsageLimitResult>>({
    aiGenerations: { allowed: false, current: 0, limit: 0, remaining: 0, percentage: 0, isUnlimited: false },
    agentSessions: { allowed: false, current: 0, limit: 0, remaining: 0, percentage: 0, isUnlimited: false },
    responseProcessing: { allowed: false, current: 0, limit: 0, remaining: 0, percentage: 0, isUnlimited: false },
    submissions: { allowed: false, current: 0, limit: 0, remaining: 0, percentage: 0, isUnlimited: false },
    forms: { allowed: false, current: 0, limit: 0, remaining: 0, percentage: 0, isUnlimited: false },
    connections: { allowed: false, current: 0, limit: 0, remaining: 0, percentage: 0, isUnlimited: false },
    storage: { allowed: false, current: 0, limit: 0, remaining: 0, percentage: 0, isUnlimited: false },
  });
  const [loading, setLoading] = useState(true);

  const fetchLimits = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    invalidateCache(); // Force fresh data

    const data = await fetchSubscriptionData(orgId);

    if (!data) {
      setLoading(false);
      return;
    }

    const keys: UsageLimitKey[] = [
      'aiGenerations',
      'agentSessions',
      'responseProcessing',
      'submissions',
      'forms',
      'connections',
      'storage',
    ];

    const newLimits: Record<UsageLimitKey, UsageLimitResult> = {} as any;

    for (const key of keys) {
      const { limit, current } = getLimitAndUsage(key, data);
      const isUnlimited = limit === -1;
      const remaining = isUnlimited ? -1 : Math.max(0, limit - current);
      const percentage = isUnlimited ? 0 : Math.min(100, (current / limit) * 100);

      newLimits[key] = {
        allowed: isUnlimited || current < limit,
        current,
        limit,
        remaining,
        percentage,
        isUnlimited,
      };
    }

    setLimits(newLimits);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  return { limits, loading, refresh: fetchLimits };
}

// ============================================
// Subscription State Hook
// ============================================

/**
 * Get the current subscription tier and overall state
 */
export function useSubscription(orgId?: string): SubscriptionState {
  const [state, setState] = useState<SubscriptionState>({
    tier: 'free',
    loading: true,
    error: null,
    usage: null,
    refresh: async () => {},
  });

  const refresh = useCallback(async () => {
    if (!orgId) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));
    invalidateCache();

    const data = await fetchSubscriptionData(orgId);

    if (data) {
      setState({
        tier: data.tier,
        loading: false,
        error: null,
        usage: data.usage,
        refresh,
      });
    } else {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Failed to fetch subscription data',
      }));
    }
  }, [orgId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}

// ============================================
// Helper Functions
// ============================================

function findRequiredTier(feature: AIFeature | PlatformFeature): SubscriptionTier {
  const tiers: SubscriptionTier[] = ['free', 'pro', 'team', 'enterprise'];

  for (const tier of tiers) {
    const config = SUBSCRIPTION_TIERS[tier];
    if (
      config.aiFeatures.includes(feature as AIFeature) ||
      config.platformFeatures.includes(feature as PlatformFeature)
    ) {
      return tier;
    }
  }

  return 'enterprise';
}

function getLimitAndUsage(
  key: UsageLimitKey,
  data: CachedSubscriptionData
): { limit: number; current: number } {
  // Safely access nested usage properties with defaults
  const usage = data.usage || {};
  const ai = usage.ai || { generations: 0, agentSessions: 0, processingRuns: 0 };
  const forms = usage.forms || { active: 0, created: 0 };
  const submissions = usage.submissions || { total: 0 };
  const storage = usage.storage || { filesBytes: 0, responsesBytes: 0 };

  switch (key) {
    case 'aiGenerations':
      return {
        limit: data.limits.aiGenerationsPerMonth,
        current: ai.generations || 0,
      };
    case 'agentSessions':
      return {
        limit: data.limits.agentSessionsPerMonth,
        current: ai.agentSessions || 0,
      };
    case 'responseProcessing':
      return {
        limit: data.limits.responseProcessingPerMonth,
        current: ai.processingRuns || 0,
      };
    case 'submissions':
      return {
        limit: data.limits.maxSubmissionsPerMonth,
        current: submissions.total || 0,
      };
    case 'forms':
      return {
        limit: data.limits.maxForms,
        current: forms.active || 0,
      };
    case 'connections':
      return {
        limit: data.limits.maxConnections,
        current: 0, // Would need to fetch from org
      };
    case 'storage':
      return {
        limit: data.limits.maxFileStorageMb * 1024 * 1024, // Convert to bytes
        current: (storage.filesBytes || 0) + (storage.responsesBytes || 0),
      };
    default:
      return { limit: 0, current: 0 };
  }
}

// ============================================
// Workflow Limit Hooks
// ============================================

/**
 * Workflow Limits Design Philosophy: "Limits That Map to Value"
 *
 * Draft workflows are FREE and unlimited, encouraging experimentation.
 * Only PUBLISHED/ACTIVE workflows count against tier limits.
 *
 * This allows users to:
 * - Experiment freely with workflow designs
 * - Build and test workflows before committing
 * - Only pay for workflows they actually activate
 *
 * The limit enforced is `maxActiveWorkflows` - active workflows that can run.
 * Workflow executions are separately limited by `workflowExecutionsPerMonth`.
 */

export interface WorkflowLimitsResult {
  // Active workflows (published, running)
  activeWorkflows: {
    allowed: boolean;       // Can activate more workflows?
    current: number;        // Current active count
    limit: number;          // Max active (-1 = unlimited)
    remaining: number;      // How many more can be activated
    isUnlimited: boolean;
  };
  // Monthly executions
  executions: {
    allowed: boolean;       // Can run more executions?
    current: number;        // This month's executions
    limit: number;          // Max per month (-1 = unlimited)
    remaining: number;      // Remaining this month
    percentage: number;     // Percentage used
    isUnlimited: boolean;
  };
  loading: boolean;
  refresh: () => void;
}

/**
 * Get workflow-specific limits for an organization
 */
export function useWorkflowLimits(orgId?: string, activeWorkflowCount?: number): WorkflowLimitsResult {
  const [result, setResult] = useState<WorkflowLimitsResult>({
    activeWorkflows: { allowed: false, current: 0, limit: 0, remaining: 0, isUnlimited: false },
    executions: { allowed: false, current: 0, limit: 0, remaining: 0, percentage: 0, isUnlimited: false },
    loading: true,
    refresh: () => {},
  });

  const refresh = useCallback(async () => {
    if (!orgId) {
      setResult((prev) => ({ ...prev, loading: false }));
      return;
    }

    setResult((prev) => ({ ...prev, loading: true }));
    invalidateCache();

    const data = await fetchSubscriptionData(orgId);

    if (!data) {
      setResult((prev) => ({ ...prev, loading: false }));
      return;
    }

    const workflows = data.usage.workflows || { executions: 0 };

    // Active workflows limit
    const activeLimit = data.limits.maxActiveWorkflows;
    const activeCurrent = activeWorkflowCount ?? 0;
    const activeUnlimited = activeLimit === -1;
    const activeRemaining = activeUnlimited ? -1 : Math.max(0, activeLimit - activeCurrent);

    // Executions limit
    const execLimit = data.limits.workflowExecutionsPerMonth;
    const execCurrent = workflows.executions || 0;
    const execUnlimited = execLimit === -1;
    const execRemaining = execUnlimited ? -1 : Math.max(0, execLimit - execCurrent);
    const execPercentage = execUnlimited ? 0 : Math.min(100, (execCurrent / execLimit) * 100);

    setResult({
      activeWorkflows: {
        allowed: activeUnlimited || activeCurrent < activeLimit,
        current: activeCurrent,
        limit: activeLimit,
        remaining: activeRemaining,
        isUnlimited: activeUnlimited,
      },
      executions: {
        allowed: execUnlimited || execCurrent < execLimit,
        current: execCurrent,
        limit: execLimit,
        remaining: execRemaining,
        percentage: execPercentage,
        isUnlimited: execUnlimited,
      },
      loading: false,
      refresh,
    });
  }, [orgId, activeWorkflowCount]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return result;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get human-readable tier name
 */
export function getTierDisplayName(tier: SubscriptionTier): string {
  const names: Record<SubscriptionTier, string> = {
    free: 'Free',
    pro: 'Pro',
    team: 'Team',
    enterprise: 'Enterprise',
  };
  return names[tier];
}

/**
 * Get tier color for UI
 */
export function getTierColor(tier: SubscriptionTier): string {
  const colors: Record<SubscriptionTier, string> = {
    free: '#6B7280',     // Gray
    pro: '#3B82F6',      // Blue
    team: '#8B5CF6',     // Purple
    enterprise: '#F59E0B', // Amber
  };
  return colors[tier];
}

/**
 * Check if a tier is higher than another
 */
export function isTierHigherThan(tier1: SubscriptionTier, tier2: SubscriptionTier): boolean {
  const order: SubscriptionTier[] = ['free', 'pro', 'team', 'enterprise'];
  return order.indexOf(tier1) > order.indexOf(tier2);
}
