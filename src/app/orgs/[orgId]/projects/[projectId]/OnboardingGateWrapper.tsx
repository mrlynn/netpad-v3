'use client';

/**
 * Client-side wrapper for the Combined Onboarding Gates
 *
 * This is needed because the project layout is a server component,
 * and the onboarding gates need to be client components.
 *
 * Applies both:
 * 1. SignupOnboardingGate - for new users (workspace setup)
 * 2. IntentOnboardingGate - for first app creation
 */

import { ReactNode } from 'react';
import { CombinedOnboardingGate } from '@/components/Onboarding/CombinedOnboardingGate';

interface OnboardingGateWrapperProps {
  children: ReactNode;
}

export function OnboardingGateWrapper({ children }: OnboardingGateWrapperProps) {
  return <CombinedOnboardingGate>{children}</CombinedOnboardingGate>;
}
