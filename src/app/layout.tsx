import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { ClientLayout } from '@/components/ClientLayout';
import { PipelineProvider } from '@/contexts/PipelineContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { DevPanelWrapper } from '@/components/dev/DevPanelWrapper';

export const metadata: Metadata = {
  title: 'FormBuilder - Build MongoDB Forms in Minutes',
  description: 'Create beautiful, validated data entry forms connected directly to your MongoDB collections. No coding required.'
};

import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>
          <AuthProvider>
            <OrganizationProvider>
              <PipelineProvider>{children}</PipelineProvider>
              <DevPanelWrapper position="bottom-right" />
            </OrganizationProvider>
          </AuthProvider>
        </ClientLayout>
      </body>
    </html>
  );
}


