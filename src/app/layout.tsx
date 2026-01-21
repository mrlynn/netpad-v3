import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { ClientLayout } from '@/components/ClientLayout';
import { PipelineProvider } from '@/contexts/PipelineContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { HelpProvider } from '@/contexts/HelpContext';
import { TourProvider } from '@/contexts/TourContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { ApplicationProvider } from '@/contexts/ApplicationContext';
import { IntentOnboardingProvider } from '@/contexts/IntentOnboardingContext';
import { SignupOnboardingProvider } from '@/contexts/SignupOnboardingContext';
import { DevPanelWrapper } from '@/components/dev/DevPanelWrapper';
import { ImpersonationBanner } from '@/components/Admin/ImpersonationBanner';
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: 'NetPad - Build MongoDB Forms & Workflows',
  description: 'Create beautiful, validated data entry forms and workflows connected directly to your MongoDB collections. No coding required.',
  icons: {
    // Icon files are served from the public folder
    // Explicit metadata for better browser compatibility
    icon: [
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>
          <AuthProvider>
            <ImpersonationBanner />
            <SignupOnboardingProvider>
              <HelpProvider>
                <TourProvider>
                  <OrganizationProvider>
                    <ApplicationProvider>
                      <IntentOnboardingProvider>
                        <PipelineProvider>{children}</PipelineProvider>
                        <DevPanelWrapper />
                        <Analytics />
                      </IntentOnboardingProvider>
                    </ApplicationProvider>
                  </OrganizationProvider>
                </TourProvider>
              </HelpProvider>
            </SignupOnboardingProvider>
          </AuthProvider>
        </ClientLayout>
      </body>
    </html>
  );
}


