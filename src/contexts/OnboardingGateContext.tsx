'use client';

/**
 * Onboarding Gate Context
 *
 * Manages the global onboarding state and determines if the onboarding gate
 * should be shown. Blocks access to protected routes until the user has:
 * 1. Created at least one organization
 * 2. Set up at least one database connection
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';

export type OnboardingStep = 'org' | 'database' | 'provisioning' | 'complete';

interface OnboardingStatus {
  complete: boolean;
  authenticated: boolean;
  hasOrganization: boolean;
  hasProject: boolean;
  hasDatabase: boolean;
  organization: {
    orgId: string;
    name: string;
    slug: string;
  } | null;
  project: {
    projectId: string;
    name: string;
  } | null;
  vault: {
    vaultId: string;
    name: string;
    database: string;
  } | null;
}

interface OnboardingGateState {
  isLoading: boolean;
  isGateActive: boolean;
  currentStep: OnboardingStep;
  status: OnboardingStatus | null;
  // Database setup state
  databaseMethod: 'auto' | 'byoc' | null;
  provisioningStatus: 'pending' | 'creating' | 'ready' | 'failed';
  provisioningProgress: number;
}

interface OnboardingGateContextValue extends OnboardingGateState {
  // Actions
  refreshStatus: () => Promise<void>;
  setCurrentStep: (step: OnboardingStep) => void;
  setDatabaseMethod: (method: 'auto' | 'byoc') => void;
  setProvisioningStatus: (status: 'pending' | 'creating' | 'ready' | 'failed') => void;
  setProvisioningProgress: (progress: number) => void;
  completeOnboarding: () => void;
}

const OnboardingGateContext = createContext<OnboardingGateContextValue | undefined>(
  undefined
);

export function OnboardingGateProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [state, setState] = useState<OnboardingGateState>({
    isLoading: true,
    isGateActive: false,
    currentStep: 'org',
    status: null,
    databaseMethod: null,
    provisioningStatus: 'pending',
    provisioningProgress: 0,
  });

  // Fetch onboarding status from API
  const refreshStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isGateActive: false,
        status: null,
      }));
      return;
    }

    try {
      const response = await fetch('/api/onboarding/status');
      const data: OnboardingStatus = await response.json();

      // Determine current step based on status
      let currentStep: OnboardingStep = 'org';
      if (data.hasOrganization && data.hasProject) {
        if (data.hasDatabase) {
          currentStep = 'complete';
        } else {
          currentStep = 'database';
        }
      } else if (data.hasOrganization) {
        currentStep = 'database';
      }

      // Gate is active if not complete
      const isGateActive = data.authenticated && !data.complete;

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isGateActive,
        currentStep,
        status: data,
      }));
    } catch (error) {
      console.error('[OnboardingGate] Failed to fetch status:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isGateActive: false,
      }));
    }
  }, [isAuthenticated]);

  // Fetch status when auth state changes
  useEffect(() => {
    if (!authLoading) {
      refreshStatus();
    }
  }, [authLoading, isAuthenticated, refreshStatus]);

  // Action: Set current step
  const setCurrentStep = useCallback((step: OnboardingStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  // Action: Set database method
  const setDatabaseMethod = useCallback((method: 'auto' | 'byoc') => {
    setState((prev) => ({ ...prev, databaseMethod: method }));
  }, []);

  // Action: Set provisioning status
  const setProvisioningStatus = useCallback(
    (status: 'pending' | 'creating' | 'ready' | 'failed') => {
      setState((prev) => ({ ...prev, provisioningStatus: status }));
    },
    []
  );

  // Action: Set provisioning progress
  const setProvisioningProgress = useCallback((progress: number) => {
    setState((prev) => ({ ...prev, provisioningProgress: progress }));
  }, []);

  // Action: Complete onboarding
  const completeOnboarding = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isGateActive: false,
      currentStep: 'complete',
    }));
  }, []);

  const value: OnboardingGateContextValue = {
    ...state,
    refreshStatus,
    setCurrentStep,
    setDatabaseMethod,
    setProvisioningStatus,
    setProvisioningProgress,
    completeOnboarding,
  };

  return (
    <OnboardingGateContext.Provider value={value}>
      {children}
    </OnboardingGateContext.Provider>
  );
}

export function useOnboardingGate() {
  const context = useContext(OnboardingGateContext);
  if (context === undefined) {
    throw new Error('useOnboardingGate must be used within an OnboardingGateProvider');
  }
  return context;
}

/**
 * Hook to check if onboarding is required
 * Use this in components that need to conditionally show content based on onboarding status
 */
export function useRequireOnboarding() {
  const { isLoading, isGateActive, status } = useOnboardingGate();

  return {
    isLoading,
    requiresOnboarding: isGateActive,
    hasOrganization: status?.hasOrganization ?? false,
    hasProject: status?.hasProject ?? false,
    hasDatabase: status?.hasDatabase ?? false,
  };
}
