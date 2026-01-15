/**
 * Installed Application Detail API
 *
 * GET /api/applications/installed/[id] - Get installation details
 * GET /api/applications/installed/[id]/updates - Check for updates
 * POST /api/applications/installed/[id]/upgrade - Upgrade installation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  getInstallation,
  updateInstallationStatus,
  compareVersions,
} from '@/lib/platform/installedApplications';
import { getPlatformDb } from '@/lib/platform/db';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { createWorkflow } from '@/lib/workflow/db';
import {
  convertFormDefinitionToConfig,
  convertWorkflowDefinitionToDocument,
  validateFormDefinition,
  validateWorkflowDefinition,
  generateSlug,
  resolveFormWorkflowReferences,
} from '@/lib/templates/import';

export const dynamic = 'force-dynamic';

interface MarketplaceApplication {
  id: string;
  manifest: {
    name: string;
    version: string;
  };
  bundle: any;
  latestVersion?: string;
  versions?: Array<{
    version: string;
    changelog?: string;
    publishedAt: Date;
  }>;
}

/**
 * GET /api/applications/installed/[id]
 * Get installation details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const checkUpdates = searchParams.get('checkUpdates') === 'true';
    const updatesOnly = searchParams.get('updates') === 'true'; // For /updates endpoint

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    const installation = await getInstallation(orgId, id);

    if (!installation) {
      return NextResponse.json({ error: 'Installation not found' }, { status: 404 });
    }

    // Check for updates if requested
    if (checkUpdates) {
      const db = await getPlatformDb();
      const marketplaceCollection = db.collection<MarketplaceApplication>('marketplace_applications');
      
      const marketplaceApp = await marketplaceCollection.findOne({
        id: installation.marketplaceApplicationId,
        status: 'approved',
        published: true,
      });

      if (marketplaceApp) {
        const latestVersion = marketplaceApp.latestVersion || marketplaceApp.manifest.version;
        const hasUpdate = compareVersions(installation.installedVersion, latestVersion) < 0;

        if (hasUpdate) {
          await updateInstallationStatus(orgId, id, {
            latestAvailableVersion: latestVersion,
            status: 'update-available',
            updateAvailable: {
              version: latestVersion,
              changelog: marketplaceApp.versions?.find(v => v.version === latestVersion)?.changelog,
              publishedAt: marketplaceApp.versions?.find(v => v.version === latestVersion)?.publishedAt || new Date(),
            },
            lastCheckedAt: new Date(),
          });
        } else {
          await updateInstallationStatus(orgId, id, {
            status: 'installed',
            lastCheckedAt: new Date(),
          });
        }
      }
    }

    // If updatesOnly, return update info only
    if (updatesOnly) {
      const db = await getPlatformDb();
      const marketplaceCollection = db.collection<MarketplaceApplication>('marketplace_applications');
      
      const marketplaceApp = await marketplaceCollection.findOne({
        id: installation.marketplaceApplicationId,
        status: 'approved',
        published: true,
      });

      if (!marketplaceApp) {
        return NextResponse.json({
          hasUpdate: false,
          currentVersion: installation.installedVersion,
          error: 'Marketplace application not found',
        });
      }

      const latestVersion = marketplaceApp.latestVersion || marketplaceApp.manifest.version;
      const hasUpdate = compareVersions(installation.installedVersion, latestVersion) < 0;

      if (hasUpdate) {
        await updateInstallationStatus(orgId, id, {
          latestAvailableVersion: latestVersion,
          status: 'update-available',
          updateAvailable: {
            version: latestVersion,
            changelog: marketplaceApp.versions?.find(v => v.version === latestVersion)?.changelog,
            publishedAt: marketplaceApp.versions?.find(v => v.version === latestVersion)?.publishedAt || new Date(),
          },
          lastCheckedAt: new Date(),
        });
      }

      return NextResponse.json({
        hasUpdate,
        currentVersion: installation.installedVersion,
        latestVersion: hasUpdate ? latestVersion : undefined,
        updateInfo: hasUpdate ? {
          version: latestVersion,
          changelog: marketplaceApp.versions?.find(v => v.version === latestVersion)?.changelog,
          publishedAt: marketplaceApp.versions?.find(v => v.version === latestVersion)?.publishedAt || new Date(),
        } : undefined,
      });
    }

    // Get updated installation
    const updated = await getInstallation(orgId, id);

    return NextResponse.json({
      success: true,
      installation: updated,
    });
  } catch (error: any) {
    console.error('[Installed Applications API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get installation' },
      { status: 500 }
    );
  }
}


/**
 * POST /api/applications/installed/[id]/upgrade
 * Upgrade installation to latest or specified version
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { orgId, projectId, targetVersion, options } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    const installation = await getInstallation(orgId, id);

    if (!installation) {
      return NextResponse.json({ error: 'Installation not found' }, { status: 404 });
    }

    // Get marketplace application
    const db = await getPlatformDb();
    const marketplaceCollection = db.collection<MarketplaceApplication>('marketplace_applications');
    
    const marketplaceApp = await marketplaceCollection.findOne({
      id: installation.marketplaceApplicationId,
      status: 'approved',
      published: true,
    });

    if (!marketplaceApp) {
      return NextResponse.json({ error: 'Marketplace application not found' }, { status: 404 });
    }

    const versionToInstall = targetVersion || marketplaceApp.latestVersion || marketplaceApp.manifest.version;

    // Validate version
    if (compareVersions(installation.installedVersion, versionToInstall) >= 0) {
      return NextResponse.json({
        error: `Version ${versionToInstall} is not newer than installed version ${installation.installedVersion}`,
      }, { status: 400 });
    }

    // Update status to "updating"
    await updateInstallationStatus(orgId, id, {
      status: 'updating',
    });

    const importOptions = options || {
      generateNewIds: false,           // Keep existing IDs when possible
      preserveSlugs: true,             // Preserve slugs
      overwriteExisting: true,         // Update existing forms/workflows
    };

    const result = {
      formsAdded: 0,
      formsUpdated: 0,
      workflowsAdded: 0,
      workflowsUpdated: 0,
      errors: [] as Array<{ type: string; name: string; error: string }>,
    };

    const formIdMap = new Map<string, string>();
    const workflowIdMap = new Map<string, string>();

    // Import/update forms
    if (marketplaceApp.bundle.forms && marketplaceApp.bundle.forms.length > 0) {
      const formsCollection = await getOrgFormsCollection(orgId);

      for (const formDef of marketplaceApp.bundle.forms) {
        try {
          const validation = validateFormDefinition(formDef);
          if (!validation.valid) {
            result.errors.push({
              type: 'form',
              name: formDef.name || 'unknown',
              error: validation.error || 'Validation failed',
            });
            continue;
          }

          // Try to find existing form by original ID or slug
          const originalId = formDef.id || '';
          const originalSlug = formDef.slug || '';
          const existingForm = await formsCollection.findOne({
            $or: [
              { formId: installation.installedForms.find(f => f.originalFormId === originalId)?.formId },
              { slug: installation.installedForms.find(f => f.originalSlug === originalSlug)?.formId },
            ],
          });

          if (existingForm && importOptions.overwriteExisting) {
            // Update existing form
            const formConfig = convertFormDefinitionToConfig(
              formDef,
              orgId,
              session.userId,
              {
                generateNewId: false,
                preserveSlug: true,
              }
            );

            if (projectId) {
              formConfig.projectId = projectId;
            }

            await formsCollection.updateOne(
              { formId: existingForm.formId },
              { $set: formConfig }
            );

            result.formsUpdated++;
            formIdMap.set(originalId, existingForm.formId);
            if (originalSlug) formIdMap.set(originalSlug, existingForm.formId);
          } else if (!existingForm) {
            // Create new form
            const formConfig = convertFormDefinitionToConfig(
              formDef,
              orgId,
              session.userId,
              {
                generateNewId: importOptions.generateNewIds,
                preserveSlug: importOptions.preserveSlugs,
              }
            );

            if (projectId) {
              formConfig.projectId = projectId;
            }

            await formsCollection.insertOne(formConfig as any);
            result.formsAdded++;
            formIdMap.set(originalId, formConfig.id!);
            if (originalSlug) formIdMap.set(originalSlug, formConfig.id!);
          }
        } catch (error: any) {
          result.errors.push({
            type: 'form',
            name: formDef.name || 'unknown',
            error: error.message || 'Import failed',
          });
        }
      }
    }

    // Resolve form references in workflows
    if (marketplaceApp.bundle.workflows && marketplaceApp.bundle.workflows.length > 0 && marketplaceApp.bundle.forms) {
      resolveFormWorkflowReferences(
        marketplaceApp.bundle.workflows,
        formIdMap,
        workflowIdMap,
        marketplaceApp.bundle.forms
      );
    }

    // Import/update workflows
    if (marketplaceApp.bundle.workflows && marketplaceApp.bundle.workflows.length > 0) {
      for (const workflowDef of marketplaceApp.bundle.workflows) {
        try {
          const validation = validateWorkflowDefinition(workflowDef);
          if (!validation.valid) {
            result.errors.push({
              type: 'workflow',
              name: workflowDef.name || 'unknown',
              error: validation.error || 'Validation failed',
            });
            continue;
          }

          const originalId = workflowDef.id || '';
          const originalSlug = workflowDef.slug || '';
          const existingWorkflow = installation.installedWorkflows.find(
            w => w.originalWorkflowId === originalId || w.originalSlug === originalSlug
          );

          if (existingWorkflow && importOptions.overwriteExisting) {
            // Update existing workflow
            const workflowData = convertWorkflowDefinitionToDocument(
              workflowDef,
              orgId,
              session.userId,
              {
                generateNewId: false,
                preserveSlug: true,
              }
            );

            const { updateWorkflow } = await import('@/lib/workflow/db');
            await updateWorkflow(orgId, existingWorkflow.workflowId, session.userId, {
              canvas: workflowData.canvas,
              settings: workflowData.settings,
              variables: workflowData.variables,
              inputSchema: workflowData.inputSchema,
              outputSchema: workflowData.outputSchema,
            });

            result.workflowsUpdated++;
            workflowIdMap.set(originalId, existingWorkflow.workflowId);
            if (originalSlug) workflowIdMap.set(originalSlug, existingWorkflow.workflowId);
          } else if (!existingWorkflow) {
            // Create new workflow
            const workflowData = convertWorkflowDefinitionToDocument(
              workflowDef,
              orgId,
              session.userId,
              {
                generateNewId: importOptions.generateNewIds,
                preserveSlug: importOptions.preserveSlugs,
              }
            );

            const workflow = await createWorkflow(orgId, session.userId, {
              name: workflowData.name,
              description: workflowData.description,
              tags: workflowData.tags || [],
              projectId: projectId,
            });

            const { updateWorkflow } = await import('@/lib/workflow/db');
            await updateWorkflow(orgId, workflow.id, session.userId, {
              canvas: workflowData.canvas,
              settings: workflowData.settings,
              variables: workflowData.variables,
              inputSchema: workflowData.inputSchema,
              outputSchema: workflowData.outputSchema,
            });

            result.workflowsAdded++;
            workflowIdMap.set(originalId, workflow.id);
            if (originalSlug) workflowIdMap.set(originalSlug, workflow.id);
          }
        } catch (error: any) {
          result.errors.push({
            type: 'workflow',
            name: workflowDef.name || 'unknown',
            error: error.message || 'Import failed',
          });
        }
      }
    }

    // Update installation record
    await updateInstallationStatus(orgId, id, {
      status: result.errors.length > 0 ? 'error' : 'installed',
      installedVersion: versionToInstall,
      latestAvailableVersion: versionToInstall,
      lastUpdatedAt: new Date(),
      updateAvailable: undefined, // Clear update available flag
    });

    return NextResponse.json({
      success: result.errors.length === 0,
      upgradedTo: versionToInstall,
      changes: result,
    });
  } catch (error: any) {
    console.error('[Installed Applications API] Upgrade error:', error);
    
    // Update status to error
    const { id } = await params;
    const body = await request.json();
    const { orgId } = body;
    if (orgId) {
      try {
        await updateInstallationStatus(orgId, id, {
          status: 'error',
        });
      } catch {
        // Ignore
      }
    }

    return NextResponse.json(
      { error: error.message || 'Failed to upgrade installation' },
      { status: 500 }
    );
  }
}
