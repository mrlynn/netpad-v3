/**
 * Onboarding Status API
 *
 * GET /api/onboarding/status - Check user's onboarding completion status
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUserOrganizations } from '@/lib/platform/organizations';
import { listProjects } from '@/lib/platform/projects';
import { listUserVaults } from '@/lib/platform/connectionVault';
import { getProvisioningStatus } from '@/lib/atlas/provisioning';
import { ConnectionVault } from '@/types/platform';

export async function GET() {
  try {
    const session = await getSession();

    // Not authenticated - no onboarding needed yet
    if (!session?.userId) {
      return NextResponse.json({
        complete: true, // Don't show gate for unauthenticated users
        authenticated: false,
      });
    }

    // Check for organizations
    const organizations = await getUserOrganizations(session.userId);
    const hasOrganization = organizations.length > 0;
    const organization = hasOrganization ? organizations[0] : null;

    // If no organization, onboarding is incomplete
    if (!hasOrganization || !organization) {
      return NextResponse.json({
        complete: false,
        authenticated: true,
        hasOrganization: false,
        hasProject: false,
        hasDatabase: false,
        organization: null,
        project: null,
        vault: null,
      });
    }

    // Check for projects in the first organization
    const { projects } = await listProjects(organization.orgId, {
      page: 1,
      pageSize: 1,
    });
    const hasProject = projects.length > 0;
    const project = hasProject ? projects[0] : null;

    // If no project, onboarding is incomplete
    if (!hasProject) {
      return NextResponse.json({
        complete: false,
        authenticated: true,
        hasOrganization: true,
        hasProject: false,
        hasDatabase: false,
        organization: {
          orgId: organization.orgId,
          name: organization.name,
          slug: organization.slug,
        },
        project: null,
        vault: null,
      });
    }

    // Check for database connections - either vaults OR a provisioned cluster
    const vaults = await listUserVaults(organization.orgId, session.userId);
    const activeVaults = vaults.filter((v: ConnectionVault) => v.status === 'active');
    const hasVault = activeVaults.length > 0;
    const vault = hasVault ? activeVaults[0] : null;

    // Also check for auto-provisioned cluster (M0)
    const provisioningStatus = await getProvisioningStatus(organization.orgId);
    const hasProvisionedCluster = provisioningStatus?.status === 'ready';

    // User has a database if they have either a vault OR a ready provisioned cluster
    const hasDatabase = hasVault || hasProvisionedCluster;

    // Return complete status
    const complete = hasOrganization && hasProject && hasDatabase;

    return NextResponse.json({
      complete,
      authenticated: true,
      hasOrganization,
      hasProject,
      hasDatabase,
      hasVault,
      hasProvisionedCluster,
      organization: {
        orgId: organization.orgId,
        name: organization.name,
        slug: organization.slug,
      },
      project: project
        ? {
            projectId: project.projectId,
            name: project.name,
          }
        : null,
      vault: vault
        ? {
            vaultId: vault.vaultId,
            name: vault.name,
            database: vault.database,
          }
        : null,
      provisionedCluster: provisioningStatus
        ? {
            status: provisioningStatus.status,
            vaultId: provisioningStatus.vaultId,
          }
        : null,
    });
  } catch (error) {
    console.error('[Onboarding Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check onboarding status' },
      { status: 500 }
    );
  }
}
