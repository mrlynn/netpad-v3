'use client';

/**
 * Client-side wrapper for the IntentOnboardingGate
 *
 * This is needed because the project layout is a server component,
 * and IntentOnboardingGate needs to be a client component.
 */

import { ReactNode } from 'react';
import { IntentOnboardingGate } from '@/components/Onboarding/IntentOnboardingGate';

interface OnboardingGateWrapperProps {
  children: ReactNode;
}

export function OnboardingGateWrapper({ children }: OnboardingGateWrapperProps) {
  return <IntentOnboardingGate>{children}</IntentOnboardingGate>;
}
