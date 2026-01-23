/**
 * React hooks for extension system
 *
 * Client-side hooks for checking feature availability
 * and accessing extension services.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import type {
  ExtensionFeature,
  FeatureAvailability,
  BillingService,
  MarketplaceService,
} from './types';

// ============================================
// Feature availability cache (client-side)
// ============================================

interface FeatureCache {
  features: ExtensionFeature[];
  fetchedAt: number;
}

let featureCache: FeatureCache | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute

async function fetchEnabledFeatures(): Promise<ExtensionFeature[]> {
  // Check cache
  if (featureCache && Date.now() - featureCache.fetchedAt < CACHE_TTL) {
    return featureCache.features;
  }

  try {
    const response = await fetch('/api/extensions/features');
    if (!response.ok) {
      throw new Error('Failed to fetch features');
    }
    const data = await response.json();
    featureCache = {
      features: data.features ?? [],
      fetchedAt: Date.now(),
    };
    return featureCache.features;
  } catch (error) {
    console.error('[Extensions] Failed to fetch features:', error);
    return [];
  }
}

// ============================================
// Hooks
// ============================================

/**
 * Hook to check if a feature is available
 *
 * @example
 * const { available, loading } = useExtensionFeature('billing');
 * if (available) {
 *   return <BillingSettings />;
 * }
 */
export function useExtensionFeature(feature: ExtensionFeature): {
  available: boolean;
  loading: boolean;
  error: Error | null;
} {
  const [features, setFeatures] = useState<ExtensionFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    fetchEnabledFeatures()
      .then((f) => {
        if (mounted) {
          setFeatures(f);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (mounted) {
          setError(e);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return {
    available: features.includes(feature),
    loading,
    error,
  };
}

/**
 * Hook to check multiple features at once
 *
 * @example
 * const { features, loading } = useExtensionFeatures(['billing', 'atlas_provisioning']);
 * if (features.billing && features.atlas_provisioning) {
 *   return <CloudSettings />;
 * }
 */
export function useExtensionFeatures(
  featureList: ExtensionFeature[]
): {
  features: Record<ExtensionFeature, boolean>;
  loading: boolean;
  error: Error | null;
} {
  const [enabledFeatures, setEnabledFeatures] = useState<ExtensionFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    fetchEnabledFeatures()
      .then((f) => {
        if (mounted) {
          setEnabledFeatures(f);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (mounted) {
          setError(e);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const features = useMemo(() => {
    const result: Record<string, boolean> = {};
    featureList.forEach((f) => {
      result[f] = enabledFeatures.includes(f);
    });
    return result as Record<ExtensionFeature, boolean>;
  }, [featureList, enabledFeatures]);

  return { features, loading, error };
}

/**
 * Hook to get extension service availability info
 *
 * This hook checks if specific services are available and
 * provides metadata about them. Actual service calls should
 * be made via API routes, not directly from the client.
 *
 * @example
 * const { billing, marketplace } = useExtensionService();
 * if (billing.available) {
 *   // Show billing-related UI
 * }
 */
export function useExtensionService(): {
  billing: FeatureAvailability;
  marketplace: FeatureAvailability;
  atlasProvisioning: FeatureAvailability;
  waitlist: FeatureAvailability;
  loading: boolean;
} {
  const { features, loading } = useExtensionFeatures([
    'billing',
    'application_marketplace',
    'atlas_provisioning',
    'waitlist_management',
  ]);

  return {
    billing: {
      available: features.billing ?? false,
      reason: features.billing ? undefined : 'Billing requires cloud deployment',
    },
    marketplace: {
      available: features.application_marketplace ?? false,
      reason: features.application_marketplace
        ? undefined
        : 'Marketplace requires cloud deployment',
    },
    atlasProvisioning: {
      available: features.atlas_provisioning ?? false,
      reason: features.atlas_provisioning
        ? undefined
        : 'Atlas provisioning requires cloud deployment',
    },
    waitlist: {
      available: features.waitlist_management ?? false,
      reason: features.waitlist_management
        ? undefined
        : 'Waitlist management requires cloud deployment',
    },
    loading,
  };
}

/**
 * Hook to get deployment mode info
 *
 * @example
 * const { isCloud, isSelfHosted } = useDeploymentMode();
 */
export function useDeploymentMode(): {
  isCloud: boolean;
  isSelfHosted: boolean;
  loading: boolean;
} {
  const [mode, setMode] = useState<'cloud' | 'self-hosted' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetch('/api/extensions/status')
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          setMode(data.deploymentMode);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setMode('self-hosted'); // Default to self-hosted on error
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return {
    isCloud: mode === 'cloud',
    isSelfHosted: mode === 'self-hosted',
    loading,
  };
}
