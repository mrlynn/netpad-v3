'use client';

/**
 * Intent Onboarding Context
 *
 * Manages the intent-first onboarding flow where new users describe what they
 * want to build, and the system generates a complete application (form + workflow)
 * using AI.
 *
 * Replaces the previous 3-step OnboardingGateContext.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { usePathname } from 'next/navigation';
import { Application } from '@/types/application';

// ============================================
// Types
// ============================================

export type OnboardingStep = 'input' | 'generating' | 'complete' | 'error';

export type GenerationPhase =
  | 'scaffolding'
  | 'analyzing'
  | 'form'
  | 'workflow'
  | 'binding'
  | 'done';

export interface GenerationProgress {
  currentPhase: GenerationPhase;
  message: string;
}

export interface OnboardingResult {
  application: Application;
  form: {
    id: string;
    name: string;
    fieldCount: number;
  };
  workflow: {
    id: string;
    name: string;
    nodeCount: number;
  };
  appUrl: string;
}

export interface IntentOnboardingStatus {
  complete: boolean;
  authenticated: boolean;
  hasOrganization: boolean;
  hasProject: boolean;
  hasApplication: boolean;
  organization: {
    orgId: string;
    name: string;
    slug: string;
  } | null;
}

interface IntentOnboardingState {
  isLoading: boolean;
  isActive: boolean;
  step: OnboardingStep;
  progress: GenerationProgress;
  intent: string;
  result: OnboardingResult | null;
  error: string | null;
  status: IntentOnboardingStatus | null;
}

interface IntentOnboardingContextValue extends IntentOnboardingState {
  // Actions
  setIntent: (intent: string) => void;
  generateFromIntent: (intent: string) => Promise<void>;
  skipOnboarding: () => Promise<void>;
  retry: () => void;
  completeOnboarding: () => void;
  refreshStatus: () => Promise<void>;
}

// ============================================
// Context
// ============================================

const IntentOnboardingContext = createContext<IntentOnboardingContextValue | undefined>(
  undefined
);

// ============================================
// Helper: Check if user is already in app context
// ============================================

function isInAppContext(pathname: string | null): boolean {
  if (!pathname) return false;
  // If URL contains /orgs/[orgId]/projects/[projectId] or /apps/, user is already working
  const isInProjectContext = /\/orgs\/[^/]+\/projects\/[^/]+/.test(pathname);
  const isInAppContext = /\/apps\//.test(pathname);
  return isInProjectContext || isInAppContext;
}

// ============================================
// Provider
// ============================================

const PHASE_MESSAGES: Record<GenerationPhase, string> = {
  scaffolding: 'Setting up your workspace...',
  analyzing: 'Understanding your requirements...',
  form: 'Designing your form...',
  workflow: 'Creating your workflow...',
  binding: 'Connecting everything together...',
  done: 'All done!',
};

export function IntentOnboardingProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const pathname = usePathname();

  // Use ref to track if we've completed onboarding to avoid re-triggering
  const hasCompletedRef = useRef(false);
  // Track if we've already fetched status to prevent duplicate fetches
  const hasFetchedRef = useRef(false);

  const [state, setState] = useState<IntentOnboardingState>({
    isLoading: true,
    isActive: false,
    step: 'input',
    progress: {
      currentPhase: 'scaffolding',
      message: PHASE_MESSAGES.scaffolding,
    },
    intent: '',
    result: null,
    error: null,
    status: null,
  });

  // Fetch onboarding status from API
  const refreshStatus = useCallback(async () => {
    // If already completed, don't re-fetch
    if (hasCompletedRef.current) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isActive: false,
      }));
      return;
    }

    // If already in app context (via URL), skip onboarding entirely
    if (isInAppContext(pathname)) {
      hasCompletedRef.current = true;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isActive: false,
        status: null,
      }));
      return;
    }

    if (!isAuthenticated) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isActive: false,
        status: null,
      }));
      return;
    }

    try {
      const response = await fetch('/api/onboarding/status');
      const data: IntentOnboardingStatus = await response.json();

      // Intent onboarding is active if:
      // 1. User is authenticated
      // 2. User has no applications yet (completely new user)
      const isActive = data.authenticated && !data.hasApplication;

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isActive,
        status: data,
      }));
    } catch (error) {
      console.error('[IntentOnboarding] Failed to fetch status:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isActive: false,
      }));
    }
  }, [isAuthenticated, pathname]);

  // Fetch status when auth state changes - but only once
  useEffect(() => {
    if (!authLoading && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      refreshStatus();
    }
  }, [authLoading, refreshStatus]);

  // Update progress with a new phase
  const updateProgress = useCallback((phase: GenerationPhase) => {
    setState((prev) => ({
      ...prev,
      progress: {
        currentPhase: phase,
        message: PHASE_MESSAGES[phase],
      },
    }));
  }, []);

  // Set intent text
  const setIntent = useCallback((intent: string) => {
    setState((prev) => ({ ...prev, intent }));
  }, []);

  // Generate application from intent
  const generateFromIntent = useCallback(async (intent: string) => {
    setState((prev) => ({
      ...prev,
      step: 'generating',
      intent,
      error: null,
    }));

    try {
      // Phase 1: Scaffolding
      updateProgress('scaffolding');
      await new Promise((r) => setTimeout(r, 500)); // Brief visual feedback

      // Phase 2: Call the onboarding intent API
      updateProgress('analyzing');

      const response = await fetch('/api/onboarding/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate application');
      }

      // The API will stream progress updates via response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let result: OnboardingResult | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n').filter(Boolean);

          for (const line of lines) {
            try {
              const data = JSON.parse(line);

              if (data.phase) {
                updateProgress(data.phase as GenerationPhase);
              }

              if (data.result) {
                result = data.result;
              }

              if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              // Not JSON, skip
            }
          }
        }

        if (result) {
          hasCompletedRef.current = true;
          setState((prev) => ({
            ...prev,
            step: 'complete',
            result,
            progress: {
              currentPhase: 'done',
              message: PHASE_MESSAGES.done,
            },
          }));
          return;
        }
      }

      // Fallback: non-streaming response
      const data = await response.json();

      if (data.result) {
        hasCompletedRef.current = true;
        setState((prev) => ({
          ...prev,
          step: 'complete',
          result: data.result,
          progress: {
            currentPhase: 'done',
            message: PHASE_MESSAGES.done,
          },
        }));
      } else {
        throw new Error('No result returned from generation');
      }
    } catch (error) {
      console.error('[IntentOnboarding] Generation failed:', error);
      setState((prev) => ({
        ...prev,
        step: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }, [updateProgress]);

  // Skip onboarding (create blank app)
  const skipOnboarding = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      step: 'generating',
      error: null,
    }));

    try {
      updateProgress('scaffolding');

      const response = await fetch('/api/onboarding/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to skip onboarding');
      }

      const data = await response.json();

      hasCompletedRef.current = true;
      setState((prev) => ({
        ...prev,
        step: 'complete',
        isActive: false,
        result: data.result || null,
        progress: {
          currentPhase: 'done',
          message: PHASE_MESSAGES.done,
        },
      }));
    } catch (error) {
      console.error('[IntentOnboarding] Skip failed:', error);
      setState((prev) => ({
        ...prev,
        step: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }, [updateProgress]);

  // Retry after error
  const retry = useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: 'input',
      error: null,
      progress: {
        currentPhase: 'scaffolding',
        message: PHASE_MESSAGES.scaffolding,
      },
    }));
  }, []);

  // Complete onboarding manually
  const completeOnboarding = useCallback(() => {
    hasCompletedRef.current = true;
    setState((prev) => ({
      ...prev,
      isActive: false,
      step: 'complete',
    }));
  }, []);

  const value: IntentOnboardingContextValue = {
    ...state,
    setIntent,
    generateFromIntent,
    skipOnboarding,
    retry,
    completeOnboarding,
    refreshStatus,
  };

  return (
    <IntentOnboardingContext.Provider value={value}>
      {children}
    </IntentOnboardingContext.Provider>
  );
}

// ============================================
// Hooks
// ============================================

export function useIntentOnboarding() {
  const context = useContext(IntentOnboardingContext);
  if (context === undefined) {
    throw new Error('useIntentOnboarding must be used within an IntentOnboardingProvider');
  }
  return context;
}

/**
 * Hook to check if intent onboarding is required
 */
export function useRequireIntentOnboarding() {
  const { isLoading, isActive, status } = useIntentOnboarding();

  return {
    isLoading,
    requiresOnboarding: isActive,
    hasOrganization: status?.hasOrganization ?? false,
    hasProject: status?.hasProject ?? false,
    hasApplication: status?.hasApplication ?? false,
  };
}
