import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { ClientLayout } from '@/components/ClientLayout';
import { PipelineProvider } from '@/contexts/PipelineContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { HelpProvider } from '@/contexts/HelpContext';
import { TourProvider } from '@/contexts/TourContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { ApplicationProvider } from '@/contexts/ApplicationContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { IntentOnboardingProvider } from '@/contexts/IntentOnboardingContext';
import { SignupOnboardingProvider } from '@/contexts/SignupOnboardingContext';
import { DevPanelWrapper } from '@/components/dev/DevPanelWrapper';
import { ImpersonationBanner } from '@/components/Admin/ImpersonationBanner';
import { SystemBroadcast } from '@/components/common/SystemBroadcast';
import { Analytics } from "@vercel/analytics/next"
import { NavigationTimer } from '@/lib/performance/NavigationTimer';
import { TerminalProvider } from '@/components/WebTerminal';

export const metadata: Metadata = {
  metadataBase: new URL('https://netpad.io'),
  title: 'NetPad - Build MongoDB Forms & Workflows',
  description: 'Create beautiful, validated data entry forms and workflows connected directly to your MongoDB collections. No coding required.',
  openGraph: {
    title: 'NetPad - Build MongoDB Forms & Workflows',
    description: 'Create beautiful, validated data entry forms and workflows connected directly to your MongoDB collections. No coding required.',
    url: 'https://netpad.io',
    siteName: 'NetPad',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NetPad - MongoDB-native forms and workflows',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NetPad - Build MongoDB Forms & Workflows',
    description: 'Create beautiful, validated data entry forms and workflows connected directly to your MongoDB collections. No coding required.',
    images: ['/og-image.png'],
  },
  icons: {
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
            <SystemBroadcast />
            <SignupOnboardingProvider>
              <HelpProvider>
                <TourProvider>
                  <OrganizationProvider>
                    <ApplicationProvider>
                      <SidebarProvider>
                        <IntentOnboardingProvider>
                          <PipelineProvider>{children}</PipelineProvider>
                          <NavigationTimer />
                          <DevPanelWrapper />
                          <TerminalProvider />
                          <Analytics />
                        </IntentOnboardingProvider>
                      </SidebarProvider>
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


