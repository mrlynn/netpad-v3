'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import {
  Organization,
  SubscriptionTier,
  SUBSCRIPTION_TIERS,
  AIFeature,
  PlatformFeature,
  TierLimits,
} from '@/types/platform';

// ============================================
// Types
// ============================================

interface OrganizationState {
  organization: Organization | null;
  organizations: Organization[];
  isLoading: boolean;
  error: string | null;
}

interface OrganizationContextValue extends OrganizationState {
  // Current org helpers
  currentOrgId: string | null;
  currentTier: SubscriptionTier;

  // Feature access
  hasAIFeature: (feature: AIFeature) => boolean;
  hasPlatformFeature: (feature: PlatformFeature) => boolean;
  getTierLimits: () => TierLimits;

  // Organization management
  selectOrganization: (orgId: string) => Promise<void>;
  refreshOrganization: () => Promise<void>;
  refreshOrganizations: () => Promise<void>;
  createOrganization: (name: string, slug: string) => Promise<{ success: boolean; orgId?: string; error?: string }>;
}

// ============================================
// Context
// ============================================

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

// Local storage key for selected org
const SELECTED_ORG_KEY = 'formbuilder_selected_org';

// ============================================
// Provider
// ============================================

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();

  const [state, setState] = useState<OrganizationState>({
    organization: null,
    organizations: [],
    isLoading: true,
    error: null,
  });

  // Fetch user's organizations
  const refreshOrganizations = useCallback(async () => {
    if (!isAuthenticated) {
      setState({
        organization: null,
        organizations: [],
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      const response = await fetch('/api/organizations');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch organizations');
      }

      const orgs: Organization[] = data.organizations || [];

      // Try to restore selected org from localStorage
      let selectedOrg: Organization | null = null;
      const savedOrgId = localStorage.getItem(SELECTED_ORG_KEY);

      if (savedOrgId) {
        selectedOrg = orgs.find(o => o.orgId === savedOrgId) || null;
        // Clear stale org from localStorage if it doesn't exist anymore
        if (!selectedOrg) {
          console.warn(`[OrganizationContext] Saved org ${savedOrgId} not found in user's organizations. Clearing stale selection.`);
          localStorage.removeItem(SELECTED_ORG_KEY);
        }
      }

      // Default to first org if none selected
      if (!selectedOrg && orgs.length > 0) {
        selectedOrg = orgs[0];
        localStorage.setItem(SELECTED_ORG_KEY, selectedOrg.orgId);
      }

      setState({
        organization: selectedOrg,
        organizations: orgs,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch organizations',
      }));
    }
  }, [isAuthenticated]);

  // Refresh current organization details
  const refreshOrganization = useCallback(async () => {
    if (!state.organization) return;

    try {
      const response = await fetch(`/api/organizations/${state.organization.orgId}`);
      const data = await response.json();

      if (response.ok && data.organization) {
        setState(prev => ({
          ...prev,
          organization: data.organization,
          organizations: prev.organizations.map(o =>
            o.orgId === data.organization.orgId ? data.organization : o
          ),
        }));
      }
    } catch (error) {
      console.error('Failed to refresh organization:', error);
    }
  }, [state.organization]);

  // Select a different organization
  const selectOrganization = useCallback(async (orgId: string) => {
    const org = state.organizations.find(o => o.orgId === orgId);

    if (org) {
      localStorage.setItem(SELECTED_ORG_KEY, orgId);
      setState(prev => ({ ...prev, organization: org }));
    }
  }, [state.organizations]);

  // Create a new organization
  const createOrganization = useCallback(async (
    name: string,
    slug: string
  ): Promise<{ success: boolean; orgId?: string; error?: string }> => {
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to create organization' };
      }

      // Refresh the list
      await refreshOrganizations();

      // Select the new org
      if (data.organization?.orgId) {
        await selectOrganization(data.organization.orgId);
      }

      return { success: true, orgId: data.organization?.orgId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create organization',
      };
    }
  }, [refreshOrganizations, selectOrganization]);

  // Feature access helpers
  const currentTier: SubscriptionTier = state.organization?.subscription?.tier || 'free';
  const tierConfig = SUBSCRIPTION_TIERS[currentTier];

  const hasAIFeature = useCallback((feature: AIFeature): boolean => {
    return tierConfig.aiFeatures.includes(feature);
  }, [tierConfig]);

  const hasPlatformFeature = useCallback((feature: PlatformFeature): boolean => {
    return tierConfig.platformFeatures.includes(feature);
  }, [tierConfig]);

  const getTierLimits = useCallback((): TierLimits => {
    return tierConfig.limits;
  }, [tierConfig]);

  // Load organizations on auth change
  useEffect(() => {
    refreshOrganizations();
  }, [refreshOrganizations]);

  // Context value
  const value: OrganizationContextValue = {
    ...state,
    currentOrgId: state.organization?.orgId || null,
    currentTier,
    hasAIFeature,
    hasPlatformFeature,
    getTierLimits,
    selectOrganization,
    refreshOrganization,
    refreshOrganizations,
    createOrganization,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

// ============================================
// Helper Hooks
// ============================================

/**
 * Require an organization to be selected
 * Also waits for auth to complete loading before determining org needs
 */
export function useRequireOrganization() {
  const { isLoading: isAuthLoading } = useAuth();
  const { organization, isLoading: isOrgLoading, organizations } = useOrganization();

  // Consider both auth and org loading states
  const isLoading = isAuthLoading || isOrgLoading;

  const needsOrg = !isLoading && !organization && organizations.length === 0;
  const needsSelection = !isLoading && !organization && organizations.length > 0;

  return {
    organization,
    isLoading,
    needsOrg,
    needsSelection,
  };
}
