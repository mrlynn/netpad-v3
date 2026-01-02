'use client';

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { OnboardingBrandingConfig, DEFAULT_BRANDING } from '@/types/onboarding';

// ============================================
// Branding Context
// ============================================

interface BrandingContextType {
  branding: OnboardingBrandingConfig;
  setBranding: (branding: OnboardingBrandingConfig) => void;
  isLoading: boolean;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function useBranding(): BrandingContextType {
  const context = useContext(BrandingContext);
  if (!context) {
    return {
      branding: {
        ...DEFAULT_BRANDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      setBranding: () => {},
      isLoading: false,
    };
  }
  return context;
}

interface BrandingProviderProps {
  children: ReactNode;
}

export function BrandingProvider({ children }: BrandingProviderProps) {
  const [branding, setBrandingState] = useState<OnboardingBrandingConfig>({
    ...DEFAULT_BRANDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load branding from API on mount
  useEffect(() => {
    async function loadBranding() {
      try {
        const response = await fetch('/api/onboarding/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.branding) {
            setBrandingState({
              ...data.branding,
              createdAt: new Date(data.branding.createdAt),
              updatedAt: new Date(data.branding.updatedAt),
            });
          }
        }
      } catch (error) {
        console.error('Failed to load branding:', error);
        // Use defaults on error
      } finally {
        setIsLoading(false);
      }
    }
    loadBranding();
  }, []);

  const setBranding = (newBranding: OnboardingBrandingConfig) => {
    setBrandingState(newBranding);
  };

  const contextValue = useMemo(
    () => ({
      branding,
      setBranding,
      isLoading,
    }),
    [branding, isLoading]
  );

  return (
    <BrandingContext.Provider value={contextValue}>
      {children}
    </BrandingContext.Provider>
  );
}
