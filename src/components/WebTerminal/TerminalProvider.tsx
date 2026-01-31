'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useApplication } from '@/contexts/ApplicationContext';
import { TerminalDrawer } from './TerminalDrawer';

/**
 * TerminalProvider - Conditionally renders the terminal drawer
 * 
 * Only shows for authenticated users who are NOT on the waitlist pending.
 * Automatically passes current org/project context to the terminal.
 */
export function TerminalProvider() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { currentOrgId } = useOrganization();
  const { currentAppId, currentProjectId } = useApplication();

  // Debug logging (remove after testing)
  useEffect(() => {
    console.log('[TerminalProvider] Auth state:', {
      isLoading,
      isAuthenticated,
      user: user ? { email: user.email, waitlistStatus: user.waitlistStatus } : null,
    });
  }, [isLoading, isAuthenticated, user]);

  // Don't render while loading auth state
  if (isLoading) {
    console.log('[TerminalProvider] Still loading auth...');
    return null;
  }

  // Must be authenticated
  if (!isAuthenticated || !user) {
    console.log('[TerminalProvider] Not authenticated');
    return null;
  }

  // Check waitlist status - only show for approved users (or legacy users without status)
  const waitlistStatus = user.waitlistStatus;
  if (waitlistStatus === 'pending' || waitlistStatus === 'rejected') {
    console.log('[TerminalProvider] Waitlist status blocks terminal:', waitlistStatus);
    return null;
  }

  console.log('[TerminalProvider] Rendering terminal drawer');
  return (
    <TerminalDrawer
      currentOrg={currentOrgId || undefined}
      currentProject={currentAppId || currentProjectId || undefined}
    />
  );
}

export default TerminalProvider;
