'use client';

/**
 * Combined Onboarding Gate Component
 *
 * Wraps both signup onboarding and intent onboarding in the correct order:
 * 1. Signup onboarding (for brand new users - handles workspace setup)
 * 2. Intent onboarding (for users who need to create their first app)
 *
 * This ensures users complete account setup before app creation.
 */

import React, { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SignupOnboardingGate } from './SignupOnboarding/SignupOnboardingGate';
import { IntentOnboardingGate } from './IntentOnboardingGate';

interface CombinedOnboardingGateProps {
  children: ReactNode;
  /**
   * Skip signup onboarding gate (useful for public pages)
   */
  skipSignupOnboarding?: boolean;
  /**
   * Skip intent onboarding gate (useful for pages that don't need it)
   */
  skipIntentOnboarding?: boolean;
}

export function CombinedOnboardingGate({
  children,
  skipSignupOnboarding = false,
  skipIntentOnboarding = false,
}: CombinedOnboardingGateProps) {
  const { isAuthenticated, isLoading } = useAuth();

  // If not authenticated, just render children (likely a public page)
  // The individual pages can handle redirect to login if needed
  if (!isAuthenticated && !isLoading) {
    return <>{children}</>;
  }

  // Apply gates in order: Signup first, then Intent
  let content = <>{children}</>;

  // Intent onboarding (inner gate - runs second if needed)
  if (!skipIntentOnboarding) {
    content = <IntentOnboardingGate>{content}</IntentOnboardingGate>;
  }

  // Signup onboarding (outer gate - runs first if needed)
  if (!skipSignupOnboarding) {
    content = <SignupOnboardingGate>{content}</SignupOnboardingGate>;
  }

  return content;
}
