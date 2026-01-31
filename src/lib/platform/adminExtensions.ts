/**
 * Admin Extensions System
 * 
 * Provides extension points for cloud features to inject additional
 * admin capabilities without modifying core code.
 * 
 * In self-hosted mode: Returns empty extensions
 * In cloud mode: Dynamically imports @netpad/cloud-features
 */

import { isCloudMode } from './mode';
import { ReactNode } from 'react';

/**
 * Admin feature card definition
 */
export interface AdminFeature {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  color: string;
  /** Optional stats key for dashboard counters */
  statsKey?: string;
  /** If true, only shown in cloud mode */
  cloudOnly?: boolean;
  /** Required role to see this feature */
  requiredRole?: 'instance_admin' | 'cloud_admin' | 'cloud_ops' | 'cloud_support';
}

/**
 * Admin extension definition from cloud package
 */
export interface AdminExtension {
  features: AdminFeature[];
  routes?: {
    path: string;
    component: React.ComponentType;
  }[];
}

/**
 * Get additional admin features from cloud package (if available)
 * 
 * Returns empty array in self-hosted mode or if cloud package isn't installed.
 */
export async function getCloudAdminFeatures(): Promise<AdminFeature[]> {
  if (!isCloudMode()) {
    return [];
  }

  try {
    // Dynamic import to avoid bundling in self-hosted builds
    const cloudFeatures = await import('@netpad/cloud-features');
    
    if (typeof cloudFeatures.getAdminExtensions === 'function') {
      const extensions: AdminExtension = await cloudFeatures.getAdminExtensions();
      return extensions.features || [];
    }
  } catch (error) {
    // Cloud package not installed or doesn't export admin extensions
    // This is expected in self-hosted mode or during development
    if (process.env.NODE_ENV === 'development') {
      console.log('[AdminExtensions] Cloud features not available:', (error as Error).message);
    }
  }

  return [];
}

/**
 * Check if a specific admin feature is available
 */
export async function isAdminFeatureAvailable(featureId: string): Promise<boolean> {
  // Core features are always available
  const coreFeatures = [
    'users', 'groups', 'roles', 'waitlist', 
    'system-status', 'clusters', 'ai-analytics'
  ];
  
  if (coreFeatures.includes(featureId)) {
    return true;
  }

  // Cloud features require cloud mode
  if (!isCloudMode()) {
    return false;
  }

  // Check if cloud package provides this feature
  const cloudFeatures = await getCloudAdminFeatures();
  return cloudFeatures.some(f => f.id === featureId);
}

/**
 * Placeholder component for cloud-only features in self-hosted mode
 * Returns null (nothing rendered) - actual upgrade prompts handled by UI
 */
export function CloudOnlyPlaceholder(): null {
  return null;
}
