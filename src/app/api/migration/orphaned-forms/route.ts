/**
 * Orphaned Forms Migration API
 *
 * GET: Check for orphaned forms (forms without applicationId)
 * POST: Migrate orphaned forms to a default application
 *
 * This supports the Templates → Applications strategy by ensuring
 * all forms have an application context for publishing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { ensureDefaultApplication } from '@/lib/platform/applications';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { listProjects } from '@/lib/platform/projects';

export const dynamic = 'force-dynamic';

interface OrphanedFormSummary {
  formId: string;
  name: string;
  createdAt?: string;
  projectId?: string;
}

interface MigrationStatus {
  hasOrphanedForms: boolean;
  orphanedCount: number;
  orphanedForms: OrphanedFormSummary[];
  migratedAt?: string;
}

/**
 * GET: Check for orphaned forms in the user's organization
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // Check user has access to this organization
    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
    }

    // Find forms without applicationId
    const formsCollection = await getOrgFormsCollection(orgId);
    const orphanedForms = await formsCollection.find({
      $or: [
        { applicationId: { $exists: false } },
        { applicationId: null },
        { applicationId: '' },
      ],
    }).toArray();

    const summary: OrphanedFormSummary[] = orphanedForms.map((form) => ({
      formId: form.formId || form.id || String(form._id),
      name: form.name || 'Untitled Form',
      createdAt: form.createdAt,
      projectId: form.projectId,
    }));

    const status: MigrationStatus = {
      hasOrphanedForms: orphanedForms.length > 0,
      orphanedCount: orphanedForms.length,
      orphanedForms: summary,
    };

    return NextResponse.json(status);
  } catch (error: any) {
    console.error('[Migration] Error checking orphaned forms:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check orphaned forms' },
      { status: 500 }
    );
  }
}

/**
 * POST: Migrate orphaned forms to applications
 *
 * Strategy: Create an "Imported Forms" application for each project
 * that has orphaned forms, then assign forms to their project's app.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { orgId } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // Check user has admin access to this organization
    const permissions = await getUserOrgPermissions(session.userId, orgId);
    if (!permissions.orgRole || !['owner', 'admin'].includes(permissions.orgRole)) {
      return NextResponse.json(
        { error: 'Admin access required to run migrations' },
        { status: 403 }
      );
    }

    // Find forms without applicationId
    const formsCollection = await getOrgFormsCollection(orgId);
    const orphanedForms = await formsCollection.find({
      $or: [
        { applicationId: { $exists: false } },
        { applicationId: null },
        { applicationId: '' },
      ],
    }).toArray();

    if (orphanedForms.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orphaned forms to migrate',
        migratedCount: 0,
      });
    }

    // Group forms by projectId
    const formsByProject = new Map<string, typeof orphanedForms>();
    const noProjectForms: typeof orphanedForms = [];

    for (const form of orphanedForms) {
      if (form.projectId) {
        const existing = formsByProject.get(form.projectId) || [];
        existing.push(form);
        formsByProject.set(form.projectId, existing);
      } else {
        noProjectForms.push(form);
      }
    }

    // Get all projects for this org to use as fallback
    const projectsResult = await listProjects(orgId);
    const defaultProject = projectsResult.projects[0];

    if (!defaultProject && noProjectForms.length > 0) {
      return NextResponse.json(
        { error: 'No projects found in organization. Create a project first.' },
        { status: 400 }
      );
    }

    let migratedCount = 0;
    const migrationResults: { formId: string; applicationId: string }[] = [];

    // Migrate forms with projectId
    for (const [projectId, forms] of formsByProject) {
      // Ensure a default application exists for this project
      const app = await ensureDefaultApplication(orgId, projectId, session.userId);

      // Update all forms in this project to use the default application
      const formIds = forms.map((f) => f.formId || f.id || String(f._id));
      await formsCollection.updateMany(
        { $or: [{ formId: { $in: formIds } }, { id: { $in: formIds } }] },
        { $set: { applicationId: app.applicationId } }
      );

      for (const form of forms) {
        migrationResults.push({
          formId: form.formId || form.id || String(form._id),
          applicationId: app.applicationId,
        });
        migratedCount++;
      }
    }

    // Migrate forms without projectId (use default project)
    if (noProjectForms.length > 0 && defaultProject) {
      const app = await ensureDefaultApplication(orgId, defaultProject.projectId, session.userId);

      const formIds = noProjectForms.map((f) => f.formId || f.id || String(f._id));
      await formsCollection.updateMany(
        { $or: [{ formId: { $in: formIds } }, { id: { $in: formIds } }] },
        {
          $set: {
            applicationId: app.applicationId,
            projectId: defaultProject.projectId,
          },
        }
      );

      for (const form of noProjectForms) {
        migrationResults.push({
          formId: form.formId || form.id || String(form._id),
          applicationId: app.applicationId,
        });
        migratedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${migratedCount} form(s) to applications`,
      migratedCount,
      results: migrationResults,
    });
  } catch (error: any) {
    console.error('[Migration] Error migrating orphaned forms:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to migrate orphaned forms' },
      { status: 500 }
    );
  }
}
