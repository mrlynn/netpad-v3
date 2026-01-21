'use client';

import { ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ConsentProvider } from '@/contexts/ConsentContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { CookieConsentModal } from '@/components/CookieConsent';
import { ChatWidget } from '@/components/Chat';
import { fetcher } from '@/lib/swr/fetcher';

interface ClientLayoutProps {
  children: ReactNode;
}

/**
 * Global SWR configuration for optimized data fetching
 */
const swrConfig = {
  fetcher,
  // Deduplication: prevent duplicate requests within 5 minutes
  dedupingInterval: 5 * 60 * 1000,
  // Revalidation on focus (throttled to once per minute)
  revalidateOnFocus: true,
  focusThrottleInterval: 60 * 1000,
  // Revalidate when browser regains connection
  revalidateOnReconnect: true,
  // Keep showing previous data while revalidating (prevents UI flicker)
  keepPreviousData: true,
  // Error retry settings
  errorRetryCount: 2,
  errorRetryInterval: 1000,
  // Don't revalidate on mount if data exists in cache
  revalidateIfStale: true,
  revalidateOnMount: true,
};

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <SWRConfig value={swrConfig}>
      <ThemeProvider>
        <ConsentProvider>
          <ChatProvider>
            {children}
            <CookieConsentModal />
            <ChatWidget />
          </ChatProvider>
        </ConsentProvider>
      </ThemeProvider>
    </SWRConfig>
  );
}
