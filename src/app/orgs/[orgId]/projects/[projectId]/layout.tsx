/**
 * Project Layout
 * 
 * Validates project access and provides project context to child routes
 */

import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { checkOrgPermission } from '@/lib/platform/organizations';
import { getProject } from '@/lib/platform/projects';

interface ProjectLayoutProps {
  children: ReactNode;
  params: Promise<{ orgId: string; projectId: string }>;
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { orgId, projectId } = await params;
  const session = await getSession();

  // Require authentication
  if (!session?.userId) {
    redirect('/auth/login');
  }

  // Verify user has access to this organization
  const hasAccess = await checkOrgPermission(session.userId, orgId, 'view_forms');
  if (!hasAccess) {
    redirect(`/orgs/${orgId}/projects`);
  }

  // Verify project exists and belongs to organization
  const project = await getProject(projectId);
  if (!project) {
    redirect(`/orgs/${orgId}/projects`);
  }

  if (project.organizationId !== orgId) {
    redirect(`/orgs/${orgId}/projects`);
  }

  // Project is valid and user has access
  return <>{children}</>;
}
