/**
 * Organization Layout
 * 
 * Validates organization access and provides org context to child routes
 */

import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { checkOrgPermission } from '@/lib/platform/organizations';
import { getOrganization } from '@/lib/platform/organizations';

interface OrgLayoutProps {
  children: ReactNode;
  params: Promise<{ orgId: string }>;
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { orgId } = await params;
  const session = await getSession();

  // Require authentication
  if (!session?.userId) {
    redirect('/auth/login');
  }

  // Verify user has access to this organization
  const hasAccess = await checkOrgPermission(session.userId, orgId, 'view_forms');
  if (!hasAccess) {
    // User doesn't have access - redirect to settings or home
    redirect('/settings');
  }

  // Verify organization exists
  const org = await getOrganization(orgId);
  if (!org) {
    redirect('/settings');
  }

  // Organization is valid and user has access
  // Context will be provided by OrganizationContext (which reads from URL)
  return <>{children}</>;
}
