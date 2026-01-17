'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ConsentProvider } from '@/contexts/ConsentContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { CookieConsentModal } from '@/components/CookieConsent';
import { ChatWidget } from '@/components/Chat';

interface ClientLayoutProps {
  children: ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <ThemeProvider>
      <ConsentProvider>
        <ChatProvider>
          {children}
          <CookieConsentModal />
          <ChatWidget />
        </ChatProvider>
      </ConsentProvider>
    </ThemeProvider>
  );
}
