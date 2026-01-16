'use client';

/**
 * Client-side wrapper for the OnboardingGate
 *
 * This is needed because the project layout is a server component,
 * and OnboardingGate needs to be a client component.
 */

import { ReactNode } from 'react';
import { OnboardingGate } from '@/components/OnboardingGate';

interface OnboardingGateWrapperProps {
  children: ReactNode;
}

export function OnboardingGateWrapper({ children }: OnboardingGateWrapperProps) {
  return <OnboardingGate>{children}</OnboardingGate>;
}
