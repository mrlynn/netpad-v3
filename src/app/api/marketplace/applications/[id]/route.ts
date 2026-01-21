/**
 * Marketplace Application Detail API
 *
 * GET /api/marketplace/applications/[id] - Get application details
 * PUT /api/marketplace/applications/[id] - Update application metadata
 * DELETE /api/marketplace/applications/[id] - Delete application listing
 * GET /api/marketplace/applications/[id]/download - Download application bundle
 * POST /api/marketplace/applications/[id]/import - Import application directly
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getPlatformDb } from '@/lib/platform/db';
import { BundleExport, BundleImportResult } from '@/types/template';
import {
  convertFormDefinitionToConfig,
  convertWorkflowDefinitionToDocument,
  validateFormDefinition,
  validateWorkflowDefinition,
  generateSlug,
  resolveFormWorkflowReferences,
} from '@/lib/templates/import';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { createWorkflow } from '@/lib/workflow/db';
import { createInstallation } from '@/lib/platform/installedApplications';
import { createApplication, calculateApplicationStats, getApplicationBySlug } from '@/lib/platform/applications';

export const dynamic = 'force-dynamic';

interface MarketplaceApplication {
  id: string;
  manifest: any;
  bundle: BundleExport;
  published: boolean;
  status: 'pending' | 'approved' | 'rejected';
  publishedAt?: string;
  publishedBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  stats: {
    downloads: number;
    rating?: number;
    reviews: number;
    ratingDistribution?: {
      '5': number;
      '4': number;
      '3': number;
      '2': number;
      '1': number;
    };
  };
  versions?: Array<{
    version: string;
    releaseId?: string;
    publishedAt: string;
    changelog?: string[];
  }>;
  latestVersion?: string;
  latestVersionPublishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /api/marketplace/applications/[id]
 * Get application details and preview
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download') === 'true';

    const db = await getPlatformDb();
    const collection = db.collection<MarketplaceApplication>('marketplace_applications');

    // First try with strict query (approved + published)
    let application = await collection.findOne({ id, status: 'approved', published: true });

    // If not found, try without status check (for legacy apps or debugging)
    if (!application) {
      application = await collection.findOne({ id, published: true });
    }

    // If still not found, try just by ID (for debugging)
    if (!application) {
      application = await collection.findOne({ id });
      if (application) {
        console.warn(`[Marketplace API] Application ${id} found but doesn't meet visibility criteria:`, {
          status: application.status,
          published: application.published,
        });
      }
    }

    if (!application) {
      console.error(`[Marketplace API] Application ${id} not found in database`);
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Increment download count
    if (download) {
      await collection.updateOne(
        { id },
        { $inc: { 'stats.downloads': 1 } }
      );
    }

    // Return full bundle for download, summary for preview
    if (download) {
      return NextResponse.json(
        {
          success: true,
          bundle: application.bundle,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${application.manifest.name}-${application.manifest.version}.json"`,
          },
        }
      );
    }

    // Return preview (without full bundle data)
    return NextResponse.json({
      id: application.id,
      manifest: application.manifest,
      preview: {
        formsCount: application.bundle.forms?.length || 0,
        workflowsCount: application.bundle.workflows?.length || 0,
        connectionsCount: application.bundle.connections?.length || 0,
        forms: application.bundle.forms?.map((f) => ({
          name: f.name,
          description: f.description,
        })),
        workflows: application.bundle.workflows?.map((w) => ({
          name: w.name,
          description: w.description,
        })),
        connections: application.bundle.connections?.map((c) => ({
          formRef: c.formRef,
          workflowRef: c.workflowRef,
          type: c.type,
          description: c.description,
        })),
      },
      stats: {
        ...application.stats,
        ratingDistribution: application.stats.ratingDistribution || undefined,
      },
      publishedAt: application.publishedAt,
      source: (application as any).source || 'web', // Default to 'web' for legacy apps
      sourcePackageName: (application as any).sourcePackageName,
      versions: (application as any).versions || [], // Version history
      latestVersion: (application as any).latestVersion || application.manifest.version,
    });
  } catch (error: any) {
    console.error('[Marketplace API] Get error:', error);
    return NextResponse.json(
      { error: 'Failed to get application' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketplace/applications/[id]/import
 * Import application directly from marketplace
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
    const { orgId, projectId, options } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // If no projectId provided, use the default project for this org
    let effectiveProjectId = projectId;
    if (!effectiveProjectId) {
      try {
        const { ensureDefaultProject } = await import('@/lib/platform/projects');
        const defaultProject = await ensureDefaultProject(orgId, session.userId);
        effectiveProjectId = defaultProject.projectId;
        console.log(`[Marketplace Import] Using default project: ${effectiveProjectId}`);
      } catch (e) {
        console.error('[Marketplace Import] Failed to get default project:', e);
        return NextResponse.json({ error: 'Failed to get or create default project' }, { status: 500 });
      }
    }

    // Get application bundle
    const db = await getPlatformDb();
    const collection = db.collection<MarketplaceApplication>('marketplace_applications');

    // Try multiple queries (same as GET endpoint) to handle different status scenarios
    // First try with strict query (approved + published)
    let application = await collection.findOne({ id, status: 'approved', published: true });

    // If not found, try without status check (for pending apps that are published, or legacy apps)
    if (!application) {
      application = await collection.findOne({ id, published: true });
    }

    // If still not found, try just by ID (for debugging or admin access)
    if (!application) {
      application = await collection.findOne({ id });
      if (application) {
        console.warn(`[Marketplace API] Importing application ${id} that doesn't meet visibility criteria:`, {
          status: application.status,
          published: application.published,
        });
      }
    }

    if (!application) {
      // Check if any application exists with similar IDs for better error message
      const similar = await collection.find({ 
        $or: [
          { id: { $regex: id.replace(/[^a-z0-9]/gi, '.*'), $options: 'i' } },
          { 'manifest.name': { $regex: id.replace(/[^a-z0-9]/gi, '.*'), $options: 'i' } }
        ]
      }).limit(5).toArray();
      
      console.error(`[Marketplace API] Application ${id} not found in database (POST import)`, {
        searchedId: id,
        similarApplications: similar.map(a => ({ id: a.id, name: a.manifest?.name, status: a.status, published: a.published }))
      });
      
      return NextResponse.json({ 
        error: 'Application not found',
        searchedId: id,
        hint: similar.length > 0 ? `Found similar applications: ${similar.map(a => a.id).join(', ')}` : undefined
      }, { status: 404 });
    }

    const userId = session.userId;
    const importOptions = options || {
      generateNewIds: true,
      preserveSlugs: false,
      overwriteExisting: false,
    };

    // Import logic (same as templates/import endpoint)
    const result: BundleImportResult = {
      success: true,
      imported: {
        forms: [],
        workflows: [],
      },
      errors: [],
    };

    // Create application from manifest (required for proper form/workflow association)
    let applicationId: string | undefined;
    const manifest = application.manifest;

    if (manifest && effectiveProjectId) {
      try {
        // Use manifest data to create an application
        const appSlug = generateSlug(manifest.name);

        // Check if application with same slug already exists
        const existingApp = await getApplicationBySlug(orgId, effectiveProjectId, appSlug);

        if (existingApp) {
          // Use existing application
          applicationId = existingApp.applicationId;
          console.log(`[Marketplace Import] Using existing application: ${existingApp.name} (${applicationId})`);
          result.errors?.push({
            type: 'application',
            name: manifest.name,
            error: 'Application slug already exists in this project. Using existing application.',
          });
        } else {
          // Create new application
          const newApp = await createApplication({
            organizationId: orgId,
            projectId: effectiveProjectId,
            name: manifest.name,
            description: manifest.description || manifest.summary || '',
            slug: appSlug,
            icon: manifest.icon,
            color: manifest.color,
            version: manifest.version || '1.0.0',
            tags: manifest.tags || [],
            createdBy: userId,
            marketplaceApplicationId: application.id,
            marketplaceVersion: manifest.version,
          });
          applicationId = newApp.applicationId;
          console.log(`[Marketplace Import] Created application: ${manifest.name} (${applicationId})`);
        }
      } catch (error: any) {
        // Check if it's a duplicate slug error
        if (error.message?.includes('already exists')) {
          // Try to find the existing app
          const appSlug = generateSlug(manifest.name);
          const existingApp = await getApplicationBySlug(orgId, effectiveProjectId, appSlug);
          if (existingApp) {
            applicationId = existingApp.applicationId;
            console.log(`[Marketplace Import] Using existing application after error: ${existingApp.name} (${applicationId})`);
          }
        } else {
          result.errors?.push({
            type: 'application',
            name: manifest.name || 'unknown',
            error: error.message || 'Failed to create application',
          });
          console.error('[Marketplace Import] Failed to create application:', error.message);
        }
      }
    }

    // Build maps for reference resolution
    const formIdMap = new Map<string, string>(); // oldId/slug -> newId
    const workflowIdMap = new Map<string, string>(); // oldId/slug -> newId

    // Import forms
    if (application.bundle.forms && application.bundle.forms.length > 0) {
      const formsCollection = await getOrgFormsCollection(orgId);

      for (const formDef of application.bundle.forms) {
        try {
          // Validate
          const validation = validateFormDefinition(formDef);
          if (!validation.valid) {
            result.errors?.push({
              type: 'form',
              name: formDef.name || 'unknown',
              error: validation.error || 'Validation failed',
            });
            continue;
          }

          // Store old references for mapping
          const oldId = formDef.id || '';
          const oldSlug = formDef.slug || '';

          // Check if form with same name/slug exists
          if (!importOptions.overwriteExisting) {
            const existing = await formsCollection.findOne({
              $or: [
                { name: formDef.name },
                { slug: formDef.slug || generateSlug(formDef.name) },
              ],
            });

            if (existing) {
              result.errors?.push({
                type: 'form',
                name: formDef.name,
                error: `Form "${formDef.name}" already exists. Use overwriteExisting option to replace.`,
              });
              continue;
            }
          }

          // Convert and save
          const formConfig = convertFormDefinitionToConfig(
            formDef,
            orgId,
            userId,
            {
              generateNewId: importOptions.generateNewIds,
              preserveSlug: importOptions.preserveSlugs,
            }
          );

          // Assign projectId and applicationId
          if (effectiveProjectId) {
            formConfig.projectId = effectiveProjectId;
          }
          if (applicationId) {
            (formConfig as any).applicationId = applicationId;
          }

          // Generate unique formId if needed
          if (!formConfig.id) {
            const { nanoid } = await import('nanoid');
            formConfig.id = `form_${nanoid(16)}`;
          }
          const formId = formConfig.id;

          await formsCollection.insertOne({
            ...formConfig,
            formId,
            id: formId,
            applicationId,
            projectId: effectiveProjectId,
          } as any);

          const newId = formConfig.id!;
          result.imported.forms.push({
            originalId: oldId || undefined,
            newId,
            name: formConfig.name,
            slug: formConfig.slug || '',
          });

          // Map old references to new ID
          if (oldId) formIdMap.set(oldId, newId);
          if (oldSlug) formIdMap.set(oldSlug, newId);
          formIdMap.set(formDef.name, newId);
        } catch (error: any) {
          result.errors?.push({
            type: 'form',
            name: formDef.name || 'unknown',
            error: error.message || 'Import failed',
          });
        }
      }
    }

    // Resolve form references in workflows before importing
    if (application.bundle.workflows && application.bundle.workflows.length > 0 && application.bundle.forms) {
      resolveFormWorkflowReferences(
        application.bundle.workflows,
        formIdMap,
        workflowIdMap,
        application.bundle.forms
      );
    }

    // Import workflows
    if (application.bundle.workflows && application.bundle.workflows.length > 0) {
      for (const workflowDef of application.bundle.workflows) {
        try {
          // Validate
          const validation = validateWorkflowDefinition(workflowDef);
          if (!validation.valid) {
            result.errors?.push({
              type: 'workflow',
              name: workflowDef.name || 'unknown',
              error: validation.error || 'Validation failed',
            });
            continue;
          }

          // Store old references for mapping
          const oldId = workflowDef.id || '';
          const oldSlug = workflowDef.slug || '';

          // Convert and create
          const workflowData = convertWorkflowDefinitionToDocument(
            workflowDef,
            orgId,
            userId,
            {
              generateNewId: importOptions.generateNewIds,
              preserveSlug: importOptions.preserveSlugs,
            }
          );

          // createWorkflow only takes name, description, tags
          // We need to create and then update with canvas/settings
          const workflow = await createWorkflow(orgId, userId, {
            name: workflowData.name,
            description: workflowData.description,
            tags: workflowData.tags || [],
            projectId: effectiveProjectId,
            applicationId: applicationId,
          });

          // Update with canvas and settings (now with resolved form references)
          const { updateWorkflow } = await import('@/lib/workflow/db');
          await updateWorkflow(orgId, workflow.id, userId, {
            canvas: workflowData.canvas,
            settings: workflowData.settings,
            variables: workflowData.variables,
            inputSchema: workflowData.inputSchema,
            outputSchema: workflowData.outputSchema,
            applicationId: applicationId,
          });

          // Get updated workflow to return proper slug
          const { getWorkflowById } = await import('@/lib/workflow/db');
          const updatedWorkflow = await getWorkflowById(orgId, workflow.id);

          const newId = workflow.id;
          result.imported.workflows.push({
            originalId: oldId || undefined,
            newId,
            name: workflow.name,
            slug: updatedWorkflow?.slug || workflow.slug,
          });

          // Map old references to new ID
          if (oldId) workflowIdMap.set(oldId, newId);
          if (oldSlug) workflowIdMap.set(oldSlug, newId);
          workflowIdMap.set(workflowDef.name, newId);
        } catch (error: any) {
          result.errors?.push({
            type: 'workflow',
            name: workflowDef.name || 'unknown',
            error: error.message || 'Import failed',
          });
        }
      }
    }

    // Determine overall success (only consider critical errors, not warnings)
    const criticalErrors = result.errors?.filter(e =>
      !e.error?.includes('already exists in this project')
    ) || [];
    result.success = criticalErrors.length === 0;

    const importResult = result;

    // Update application stats if we created/used an application
    if (applicationId && orgId) {
      try {
        await calculateApplicationStats(orgId, applicationId);
        console.log(`[Marketplace Import] Updated stats for application ${applicationId}`);
      } catch (statsError) {
        console.error('[Marketplace Import] Failed to update application stats:', statsError);
        // Don't fail the import if stats update fails
      }
    }

    // Increment download count
    await collection.updateOne(
      { id },
      { $inc: { 'stats.downloads': 1 } }
    );

    // Track installation if import was successful
    let installationId: string | undefined;
    if (result.success && orgId) {
      try {
        const installation = await createInstallation({
          organizationId: orgId,
          projectId: effectiveProjectId || '',
          marketplaceApplicationId: application.id,
          marketplaceApplicationName: application.manifest.name,
          installedVersion: application.manifest.version,
          applicationId: applicationId, // Track the created/used application
          installedForms: result.imported.forms.map(f => ({
            formId: f.newId,
            originalFormId: f.originalId,
            name: f.name,
          })),
          installedWorkflows: result.imported.workflows.map(w => ({
            workflowId: w.newId,
            originalWorkflowId: w.originalId,
            name: w.name,
          })),
          installedBy: userId,
        });
        installationId = installation.installationId;
        console.log('[Marketplace API] Installation tracked:', installationId);
      } catch (installError) {
        console.error('[Marketplace API] Failed to track installation:', installError);
        // Don't fail the import if tracking fails
      }
    }

    // Get the app slug for navigation
    let appSlug: string | undefined;
    if (applicationId) {
      try {
        const { getApplication } = await import('@/lib/platform/applications');
        const createdApp = await getApplication(orgId, applicationId);
        appSlug = createdApp?.slug;
      } catch (e) {
        // Non-critical - slug is just for navigation convenience
      }
    }

    return NextResponse.json({
      success: true,
      import: importResult,
      application: {
        id: application.id,
        name: application.manifest.name,
        version: application.manifest.version,
        applicationId: applicationId, // Return the local application ID
        appSlug: appSlug, // Return slug for navigation
      },
      installation: installationId ? {
        installationId,
        installedVersion: application.manifest.version,
        applicationId: applicationId,
      } : undefined,
    });
  } catch (error: any) {
    console.error('[Marketplace API] Import error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import application' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/marketplace/applications/[id]
 * Update application metadata (only by publisher)
 */
export async function PUT(
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
    const { published, marketplace } = body;

    const db = await getPlatformDb();
    const collection = db.collection<MarketplaceApplication>('marketplace_applications');

    const application = await collection.findOne({ id });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Only the publisher can update
    if (application.publishedBy !== session.userId) {
      return NextResponse.json(
        { error: 'Only the publisher can update this application' },
        { status: 403 }
      );
    }

    const update: any = {
      updatedAt: new Date().toISOString(),
    };

    // Update published status
    if (published !== undefined) {
      update.published = published;
      if (published && !application.publishedAt) {
        update.publishedAt = new Date().toISOString();
      }
    }

    // Update marketplace metadata
    if (marketplace) {
      update['manifest.summary'] = marketplace.summary !== undefined
        ? marketplace.summary
        : application.manifest.summary;
      update['manifest.tags'] = marketplace.tags !== undefined
        ? marketplace.tags
        : application.manifest.tags;
      update['manifest.category'] = marketplace.category !== undefined
        ? marketplace.category
        : application.manifest.category;
    }

    await collection.updateOne({ id }, { $set: update });

    const updated = await collection.findOne({ id });

    return NextResponse.json({
      success: true,
      application: {
        id: updated!.id,
        name: updated!.manifest.name,
        published: updated!.published,
        publishedAt: updated!.publishedAt,
        manifest: {
          summary: updated!.manifest.summary,
          tags: updated!.manifest.tags,
          category: updated!.manifest.category,
        },
      },
    });
  } catch (error: any) {
    console.error('[Marketplace API] Update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update application' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/marketplace/applications/[id]
 * Delete application listing (only by publisher)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const db = await getPlatformDb();
    const collection = db.collection<MarketplaceApplication>('marketplace_applications');

    const application = await collection.findOne({ id });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Only the publisher can delete
    if (application.publishedBy !== session.userId) {
      return NextResponse.json(
        { error: 'Only the publisher can delete this application' },
        { status: 403 }
      );
    }

    await collection.deleteOne({ id });

    return NextResponse.json({
      success: true,
      message: 'Application deleted successfully',
    });
  } catch (error: any) {
    console.error('[Marketplace API] Delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete application' },
      { status: 500 }
    );
  }
}
