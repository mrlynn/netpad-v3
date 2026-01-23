/**
 * CloudFeature Component
 *
 * Conditionally renders content based on cloud feature availability.
 * Shows fallback content for self-hosted deployments.
 *
 * @example
 * <CloudFeature feature="billing" fallback={<UpgradePrompt />}>
 *   <BillingSettings />
 * </CloudFeature>
 */

'use client';

import React from 'react';
import { useExtensionFeature } from './hooks';
import type { ExtensionFeature } from './types';

interface CloudFeatureProps {
  /** The feature to check for */
  feature: ExtensionFeature;
  /** Content to render when feature is available */
  children: React.ReactNode;
  /** Content to render when feature is not available */
  fallback?: React.ReactNode;
  /** Content to render while checking feature availability */
  loading?: React.ReactNode;
  /** If true, hides content entirely instead of showing fallback */
  hideIfUnavailable?: boolean;
}

export function CloudFeature({
  feature,
  children,
  fallback = null,
  loading = null,
  hideIfUnavailable = false,
}: CloudFeatureProps) {
  const { available, loading: isLoading, error } = useExtensionFeature(feature);

  if (isLoading) {
    return <>{loading}</>;
  }

  if (error) {
    console.error(`[CloudFeature] Error checking feature "${feature}":`, error);
    // On error, assume feature is not available
    return hideIfUnavailable ? null : <>{fallback}</>;
  }

  if (!available) {
    return hideIfUnavailable ? null : <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * CloudOnly Component
 *
 * Only renders content in cloud deployments.
 * Completely hides content in self-hosted deployments.
 *
 * @example
 * <CloudOnly>
 *   <BillingBanner />
 * </CloudOnly>
 */
export function CloudOnly({ children }: { children: React.ReactNode }) {
  return (
    <CloudFeature feature="billing" hideIfUnavailable>
      {children}
    </CloudFeature>
  );
}

/**
 * SelfHostedOnly Component
 *
 * Only renders content in self-hosted deployments.
 * Completely hides content in cloud deployments.
 *
 * @example
 * <SelfHostedOnly>
 *   <SelfHostedSetupGuide />
 * </SelfHostedOnly>
 */
export function SelfHostedOnly({ children }: { children: React.ReactNode }) {
  const { available } = useExtensionFeature('billing');

  // If billing is available, we're in cloud mode
  if (available) {
    return null;
  }

  return <>{children}</>;
}

/**
 * RequireFeature Component
 *
 * Shows an upgrade prompt or custom message when feature is unavailable.
 *
 * @example
 * <RequireFeature
 *   feature="advanced_analytics"
 *   title="Advanced Analytics"
 *   description="Upgrade to Team plan for advanced analytics."
 * >
 *   <AnalyticsDashboard />
 * </RequireFeature>
 */
interface RequireFeatureProps {
  feature: ExtensionFeature;
  children: React.ReactNode;
  title?: string;
  description?: string;
  upgradeUrl?: string;
}

export function RequireFeature({
  feature,
  children,
  title = 'Feature Not Available',
  description = 'This feature requires a cloud subscription.',
  upgradeUrl = '/pricing',
}: RequireFeatureProps) {
  const { available, loading } = useExtensionFeature(feature);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!available) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-muted/50">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4">{description}</p>
        <a
          href={upgradeUrl}
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          View Plans
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
