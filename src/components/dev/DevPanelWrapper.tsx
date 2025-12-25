/**
 * DevPanelWrapper
 *
 * Connects the SubscriptionDevPanel to the OrganizationContext.
 * Only renders when there's a selected organization.
 * Hidden on public form pages and in production.
 */

'use client';

import { usePathname } from 'next/navigation';
import { useOrganization } from '@/contexts/OrganizationContext';
import { SubscriptionDevPanel } from './SubscriptionDevPanel';

// Routes where the dev panel should NOT appear (public/embedded contexts)
const HIDDEN_ROUTES = [
  '/forms/', // Published form pages
  '/auth/',  // Auth pages
];

interface DevPanelWrapperProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function DevPanelWrapper({ position = 'bottom-right' }: DevPanelWrapperProps) {
  const pathname = usePathname();

  // Don't render in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // Hide on public form pages and auth pages
  const shouldHide = HIDDEN_ROUTES.some(route => pathname?.startsWith(route));
  if (shouldHide) {
    return null;
  }

  const { currentOrgId, isLoading } = useOrganization();

  // Don't render if no org selected or still loading
  if (isLoading || !currentOrgId) {
    return null;
  }

  return <SubscriptionDevPanel orgId={currentOrgId} position={position} />;
}

export default DevPanelWrapper;
