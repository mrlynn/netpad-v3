'use client';

/**
 * Signup Onboarding Context
 *
 * Manages the Linear-inspired signup onboarding flow that runs after initial
 * authentication. Guides new users through workspace setup, MongoDB connection,
 * and team invites.
 *
 * This runs BEFORE IntentOnboarding - it handles account setup while
 * IntentOnboarding handles first app creation.
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

// ============================================
// Types
// ============================================

export type SignupOnboardingStep =
  | 'welcome'
  | 'workspace'
  | 'database'
  | 'team-invites'
  | 'completion';

export type DatabaseChoice = 'auto-provision' | 'byoc' | 'skip';

export interface SignupOnboardingStatus {
  hasCompletedSignupOnboarding: boolean;
  hasOrganization: boolean;
  hasCluster: boolean;
  organizationId?: string;
  organizationName?: string;
  organizationSlug?: string;
}

interface SignupOnboardingState {
  isLoading: boolean;
  isActive: boolean;
  currentStep: SignupOnboardingStep;

  // Collected data
  workspaceName: string;
  workspaceSlug: string;
  databaseChoice: DatabaseChoice;
  connectionString: string;
  databaseName: string;
  teamInvites: string[];

  // Results
  organizationId: string | null;
  projectId: string | null;
  vaultId: string | null;

  // Status
  status: SignupOnboardingStatus | null;
  error: string | null;
  isProcessing: boolean;

  // Database provisioning
  provisioningStatus: string | null;
  provisioningProgress: number;
}

interface SignupOnboardingContextValue extends SignupOnboardingState {
  // Navigation
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: SignupOnboardingStep) => void;

  // Data setters
  setWorkspaceName: (name: string) => void;
  setWorkspaceSlug: (slug: string) => void;
  setDatabaseChoice: (choice: DatabaseChoice) => void;
  setConnectionString: (str: string) => void;
  setDatabaseName: (name: string) => void;
  addTeamInvite: (email: string) => void;
  removeTeamInvite: (email: string) => void;

  // Actions
  createWorkspace: () => Promise<boolean>;
  setupDatabase: () => Promise<boolean>;
  sendInvites: () => Promise<boolean>;
  skipStep: () => void;
  complete: () => Promise<void>;
  refreshStatus: () => Promise<void>;

  /**
   * Auto-complete onboarding for solo users.
   * Creates a default workspace and marks onboarding complete,
   * allowing users to skip directly to IntentOnboarding.
   */
  autoCompleteForSolo: () => Promise<boolean>;
}

// ============================================
// Constants
// ============================================

const STEPS_ORDER: SignupOnboardingStep[] = [
  'welcome',
  'workspace',
  'database',
  'team-invites',
  'completion',
];

// ============================================
// Context
// ============================================

const SignupOnboardingContext = createContext<SignupOnboardingContextValue | undefined>(
  undefined
);

// ============================================
// Helper Functions
// ============================================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

// ============================================
// Provider
// ============================================

export function SignupOnboardingProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const [state, setState] = useState<SignupOnboardingState>({
    isLoading: true,
    isActive: false,
    currentStep: 'welcome',
    workspaceName: '',
    workspaceSlug: '',
    databaseChoice: 'auto-provision',
    connectionString: '',
    databaseName: '',
    teamInvites: [],
    organizationId: null,
    projectId: null,
    vaultId: null,
    status: null,
    error: null,
    isProcessing: false,
    provisioningStatus: null,
    provisioningProgress: 0,
  });

  // Fetch onboarding status from API
  const refreshStatus = useCallback(async () => {
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
      const response = await fetch('/api/onboarding/signup');

      if (!response.ok) {
        throw new Error('Failed to fetch signup onboarding status');
      }

      const data: SignupOnboardingStatus = await response.json();

      // Signup onboarding is active if:
      // 1. User is authenticated
      // 2. User has NOT completed signup onboarding
      const isActive = !data.hasCompletedSignupOnboarding;

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isActive,
        status: data,
        organizationId: data.organizationId || null,
        // Pre-fill workspace name if org exists
        workspaceName: data.organizationName || prev.workspaceName,
        workspaceSlug: data.organizationSlug || prev.workspaceSlug,
      }));
    } catch (error) {
      console.error('[SignupOnboarding] Failed to fetch status:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isActive: false,
        error: error instanceof Error ? error.message : 'Failed to check onboarding status',
      }));
    }
  }, [isAuthenticated]);

  // Fetch status when auth state changes
  useEffect(() => {
    if (!authLoading) {
      refreshStatus();
    }
  }, [authLoading, isAuthenticated, refreshStatus]);

  // Navigation actions
  const nextStep = useCallback(() => {
    setState((prev) => {
      const currentIndex = STEPS_ORDER.indexOf(prev.currentStep);
      if (currentIndex < STEPS_ORDER.length - 1) {
        return { ...prev, currentStep: STEPS_ORDER[currentIndex + 1], error: null };
      }
      return prev;
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => {
      const currentIndex = STEPS_ORDER.indexOf(prev.currentStep);
      if (currentIndex > 0) {
        return { ...prev, currentStep: STEPS_ORDER[currentIndex - 1], error: null };
      }
      return prev;
    });
  }, []);

  const goToStep = useCallback((step: SignupOnboardingStep) => {
    setState((prev) => ({ ...prev, currentStep: step, error: null }));
  }, []);

  // Data setters
  const setWorkspaceName = useCallback((name: string) => {
    setState((prev) => ({
      ...prev,
      workspaceName: name,
      workspaceSlug: generateSlug(name),
    }));
  }, []);

  const setWorkspaceSlug = useCallback((slug: string) => {
    setState((prev) => ({ ...prev, workspaceSlug: generateSlug(slug) }));
  }, []);

  const setDatabaseChoice = useCallback((choice: DatabaseChoice) => {
    setState((prev) => ({ ...prev, databaseChoice: choice }));
  }, []);

  const setConnectionString = useCallback((str: string) => {
    setState((prev) => ({ ...prev, connectionString: str }));
  }, []);

  const setDatabaseName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, databaseName: name }));
  }, []);

  const addTeamInvite = useCallback((email: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    setState((prev) => {
      if (prev.teamInvites.includes(normalizedEmail)) {
        return prev;
      }
      return { ...prev, teamInvites: [...prev.teamInvites, normalizedEmail] };
    });
  }, []);

  const removeTeamInvite = useCallback((email: string) => {
    setState((prev) => ({
      ...prev,
      teamInvites: prev.teamInvites.filter((e) => e !== email),
    }));
  }, []);

  // Action: Create workspace (organization + project)
  const createWorkspace = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isProcessing: true, error: null }));

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: state.workspaceName,
          slug: state.workspaceSlug,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create workspace');
      }

      const data = await response.json();

      setState((prev) => ({
        ...prev,
        isProcessing: false,
        organizationId: data.orgId || data.organization?.orgId,
        projectId: data.projectId || data.project?.projectId,
      }));

      return true;
    } catch (error) {
      console.error('[SignupOnboarding] Create workspace failed:', error);
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Failed to create workspace',
      }));
      return false;
    }
  }, [state.workspaceName, state.workspaceSlug]);

  // Action: Setup database
  const setupDatabase = useCallback(async (): Promise<boolean> => {
    const orgId = state.organizationId;
    if (!orgId) {
      setState((prev) => ({ ...prev, error: 'No organization found' }));
      return false;
    }

    setState((prev) => ({ ...prev, isProcessing: true, error: null }));

    try {
      const response = await fetch('/api/onboarding/signup/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          choice: state.databaseChoice,
          connectionString: state.databaseChoice === 'byoc' ? state.connectionString : undefined,
          databaseName: state.databaseChoice === 'byoc' ? state.databaseName : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to setup database');
      }

      const data = await response.json();

      // For auto-provision, poll for completion
      if (state.databaseChoice === 'auto-provision' && data.status === 'provisioning') {
        setState((prev) => ({
          ...prev,
          provisioningStatus: 'creating',
          provisioningProgress: 10,
        }));

        // Poll for cluster status
        const pollStatus = async (): Promise<boolean> => {
          const statusResponse = await fetch(`/api/organizations/${orgId}/cluster`);
          if (!statusResponse.ok) {
            return false;
          }
          const statusData = await statusResponse.json();

          if (statusData.status === 'ready') {
            setState((prev) => ({
              ...prev,
              isProcessing: false,
              provisioningStatus: 'ready',
              provisioningProgress: 100,
              vaultId: statusData.vaultId,
            }));
            return true;
          } else if (statusData.status === 'failed') {
            throw new Error(statusData.error || 'Cluster provisioning failed');
          }

          // Update progress
          setState((prev) => ({
            ...prev,
            provisioningStatus: statusData.status,
            provisioningProgress: Math.min(prev.provisioningProgress + 10, 90),
          }));

          // Continue polling
          await new Promise((r) => setTimeout(r, 3000));
          return pollStatus();
        };

        const success = await pollStatus();
        return success;
      }

      setState((prev) => ({
        ...prev,
        isProcessing: false,
        vaultId: data.vaultId,
      }));

      return true;
    } catch (error) {
      console.error('[SignupOnboarding] Database setup failed:', error);
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        provisioningStatus: 'failed',
        error: error instanceof Error ? error.message : 'Failed to setup database',
      }));
      return false;
    }
  }, [state.organizationId, state.databaseChoice, state.connectionString, state.databaseName]);

  // Action: Send team invites
  const sendInvites = useCallback(async (): Promise<boolean> => {
    const orgId = state.organizationId;
    if (!orgId || state.teamInvites.length === 0) {
      return true; // Nothing to send
    }

    setState((prev) => ({ ...prev, isProcessing: true, error: null }));

    try {
      const response = await fetch(`/api/organizations/${orgId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: state.teamInvites,
          role: 'member',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invites');
      }

      setState((prev) => ({ ...prev, isProcessing: false }));
      return true;
    } catch (error) {
      console.error('[SignupOnboarding] Send invites failed:', error);
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Failed to send invites',
      }));
      return false;
    }
  }, [state.organizationId, state.teamInvites]);

  // Skip current step
  const skipStep = useCallback(() => {
    nextStep();
  }, [nextStep]);

  // Complete onboarding
  const complete = useCallback(async () => {
    setState((prev) => ({ ...prev, isProcessing: true }));

    try {
      await fetch('/api/onboarding/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      });

      setState((prev) => ({
        ...prev,
        isProcessing: false,
        isActive: false,
      }));
    } catch (error) {
      console.error('[SignupOnboarding] Complete failed:', error);
      // Still mark as inactive even if API call fails
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        isActive: false,
      }));
    }
  }, []);

  // Auto-complete onboarding for solo users
  // Creates a default workspace silently and skips to IntentOnboarding
  const autoCompleteForSolo = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isProcessing: true, error: null }));

    try {
      // Generate default workspace name from email or fallback
      const emailPrefix = user?.email?.split('@')[0] || 'my';
      const defaultWorkspaceName = `${emailPrefix}'s Workspace`;
      const defaultSlug = generateSlug(defaultWorkspaceName);

      // Step 1: Create workspace
      const createResponse = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: defaultWorkspaceName,
          slug: defaultSlug,
        }),
      });

      if (!createResponse.ok) {
        // If org already exists, that's fine - user already has a workspace
        const errorData = await createResponse.json();
        if (!errorData.error?.includes('already exists') && !errorData.error?.includes('already have')) {
          throw new Error(errorData.error || 'Failed to create workspace');
        }
      }

      // Step 2: Mark signup onboarding as complete with skipped steps
      await fetch('/api/onboarding/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: true,
          skippedSteps: ['welcome', 'workspace', 'database', 'team-invites'],
        }),
      });

      setState((prev) => ({
        ...prev,
        isProcessing: false,
        isActive: false,
      }));

      return true;
    } catch (error) {
      console.error('[SignupOnboarding] Auto-complete failed:', error);
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Failed to setup workspace',
      }));
      return false;
    }
  }, [user?.email]);

  const value: SignupOnboardingContextValue = {
    ...state,
    nextStep,
    prevStep,
    goToStep,
    setWorkspaceName,
    setWorkspaceSlug,
    setDatabaseChoice,
    setConnectionString,
    setDatabaseName,
    addTeamInvite,
    removeTeamInvite,
    createWorkspace,
    setupDatabase,
    sendInvites,
    skipStep,
    complete,
    refreshStatus,
    autoCompleteForSolo,
  };

  return (
    <SignupOnboardingContext.Provider value={value}>
      {children}
    </SignupOnboardingContext.Provider>
  );
}

// ============================================
// Hooks
// ============================================

export function useSignupOnboarding() {
  const context = useContext(SignupOnboardingContext);
  if (context === undefined) {
    throw new Error('useSignupOnboarding must be used within a SignupOnboardingProvider');
  }
  return context;
}

/**
 * Hook to check if signup onboarding is required
 */
export function useRequireSignupOnboarding() {
  const { isLoading, isActive } = useSignupOnboarding();

  return {
    isLoading,
    requiresOnboarding: isActive,
  };
}
