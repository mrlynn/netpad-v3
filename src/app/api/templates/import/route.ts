/**
 * Template Bundle Import API
 *
 * POST /api/templates/import
 * Import a template bundle (form + workflows + theme) as an Application
 *
 * Supports two authentication methods:
 * 1. Session-based (cookie) authentication
 * 2. API key authentication via Bearer token
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { saveForm } from '@/lib/storage';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, ensureSessionId } from '@/lib/session';
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
import {
  BundleImportRequest,
  BundleImportResult,
  ApplicationManifest,
  FormDefinition,
  WorkflowDefinition,
} from '@/types/template';
import { validateAPIKey, hasPermission } from '@/lib/api/keys';
import { createApplication, calculateApplicationStats, getApplicationBySlug } from '@/lib/platform/applications';

export const dynamic = 'force-dynamic';

/**
 * POST /api/templates/import
 * Import template bundle as an Application
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);

    // Support multiple request formats:
    // 1. Direct: { manifest, forms, workflows, organizationId, projectId }
    // 2. Wrapped: { bundle: { manifest, forms, workflows }, organizationId, projectId }
    const importRequest: BundleImportRequest = body;

    // Extract manifest, forms, workflows from either format
    const manifest = importRequest.bundle?.manifest || importRequest.manifest;
    const forms: FormDefinition[] = importRequest.bundle?.forms || importRequest.forms || [];
    const workflows: WorkflowDefinition[] =
      importRequest.bundle?.workflows || importRequest.workflows || [];

    // Get orgId and projectId from query params or body
    const orgId = searchParams.get('orgId') || importRequest.organizationId;
    const projectId = searchParams.get('projectId') || importRequest.projectId;

    const options = importRequest.options || {
      generateNewIds: true,
      preserveSlugs: false,
      overwriteExisting: false,
      createApplication: true,
    };

    // Default createApplication to true
    if (options.createApplication === undefined) {
      options.createApplication = true;
    }

    const result: BundleImportResult = {
      success: true,
      imported: {
        forms: [],
        workflows: [],
      },
      errors: [],
    };

    // Get user session - support both session and API key authentication
    let userId: string;
    let sessionId: string | undefined;
    let authenticatedOrgId: string | undefined;

    // Check for API key authentication first
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const apiKey = authHeader.slice(7);
      const keyRecord = await validateAPIKey(apiKey);

      if (!keyRecord) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      }

      // Check if key has appropriate permissions
      // Allow: templates:write, admin, or forms:write (for backward compatibility)
      const hasRequiredPermission =
        hasPermission(keyRecord, 'templates:write') ||
        hasPermission(keyRecord, 'admin') ||
        hasPermission(keyRecord, 'forms:write');

      if (!hasRequiredPermission) {
        return NextResponse.json(
          {
            error:
              'API key does not have required permission. Needs one of: templates:write, forms:write, or admin',
          },
          { status: 403 }
        );
      }

      // Use API key's organization and created user
      userId = keyRecord.createdBy;
      authenticatedOrgId = keyRecord.organizationId;

      // Verify the request is for the same org as the API key
      if (orgId && orgId !== authenticatedOrgId) {
        return NextResponse.json(
          { error: 'API key is not authorized for this organization' },
          { status: 403 }
        );
      }
    } else if (orgId) {
      // Session-based authentication for org routes
      const session = await getSession();
      if (!session.userId) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      userId = session.userId;
      authenticatedOrgId = orgId;
    } else {
      // Legacy session-based (no org)
      const session = await getIronSession(await cookies(), sessionOptions);
      sessionId = ensureSessionId(session);
      userId = sessionId;
    }

    // Use authenticated org if orgId wasn't provided
    const effectiveOrgId = orgId || authenticatedOrgId;

    // Validate required fields for platform import
    if (effectiveOrgId && options.createApplication && !projectId) {
      return NextResponse.json(
        { error: 'projectId is required when createApplication is true' },
        { status: 400 }
      );
    }

    // Build maps for reference resolution
    const formIdMap = new Map<string, string>(); // oldId/slug -> newId
    const workflowIdMap = new Map<string, string>(); // oldId/slug -> newId

    // Create Application from manifest (if createApplication option is true)
    let applicationId: string | undefined;

    if (effectiveOrgId && projectId && options.createApplication && manifest) {
      try {
        const appManifest = manifest as ApplicationManifest;

        const application = await createApplication({
          projectId,
          organizationId: effectiveOrgId,
          name: appManifest.name,
          description: appManifest.description || appManifest.summary,
          icon: appManifest.icon,
          color: appManifest.color,
          version: appManifest.version || '1.0.0',
          tags: appManifest.tags || [],
          createdBy: userId,
        });

        applicationId = application.applicationId;
        result.imported.application = {
          applicationId: application.applicationId,
          name: application.name,
          slug: application.slug,
        };

        console.log(`[Import] Created application: ${application.name} (${applicationId})`);
      } catch (error: any) {
        // If application creation fails due to slug conflict, try to find existing
        if (error.message?.includes('slug already exists')) {
          const appManifest = manifest as ApplicationManifest;
          const expectedSlug = generateSlug(appManifest.name);
          const existingApp = await getApplicationBySlug(effectiveOrgId, projectId, expectedSlug);

          if (existingApp) {
            // Use existing application
            applicationId = existingApp.applicationId;
            result.imported.application = {
              applicationId: existingApp.applicationId,
              name: existingApp.name,
              slug: existingApp.slug,
            };
            console.log(`[Import] Using existing application: ${existingApp.name} (${applicationId})`);
            // Add warning instead of error
            result.errors?.push({
              type: 'application',
              name: appManifest.name,
              error: 'Application slug already exists in this project',
            });
          } else {
            // Couldn't find existing app, report error
            result.errors?.push({
              type: 'application',
              name: manifest?.name || 'unknown',
              error: error.message || 'Failed to create application',
            });
            console.error('[Import] Failed to create application:', error.message);
          }
        } else {
          result.errors?.push({
            type: 'application',
            name: manifest?.name || 'unknown',
            error: error.message || 'Failed to create application',
          });
          console.error('[Import] Failed to create application:', error.message);
        }
      }
    }

    // Import forms
    if (forms.length > 0) {
      for (const formDef of forms) {
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

          if (effectiveOrgId) {
            // Platform-based import
            const collection = await getOrgFormsCollection(effectiveOrgId);

            // Convert to get the new slug (this generates it if needed)
            const formConfig = convertFormDefinitionToConfig(formDef, effectiveOrgId, userId, {
              generateNewId: options.generateNewIds,
              preserveSlug: options.preserveSlugs,
            });

            // Check for duplicate slug (after generating it)
            if (!options.overwriteExisting) {
              const existingBySlug = await collection.findOne({
                slug: formConfig.slug,
              });

              if (existingBySlug) {
                // Generate a unique slug by appending a number
                let uniqueSlug = formConfig.slug!;
                let counter = 1;
                while (await collection.findOne({ slug: uniqueSlug })) {
                  uniqueSlug = `${formConfig.slug}-${counter}`;
                  counter++;
                }
                formConfig.slug = uniqueSlug;
              }

              // Also check for duplicate name (optional, but good to warn)
              const existingByName = await collection.findOne({
                name: formDef.name,
                slug: { $ne: formConfig.slug }, // Different slug is OK
              });

              if (existingByName) {
                // Warn but don't fail - we'll use the unique slug
                result.errors?.push({
                  type: 'form',
                  name: formDef.name,
                  error: `Form with name "${formDef.name}" already exists. Using slug "${formConfig.slug}" instead.`,
                });
              }
            }

            // Ensure ID is set (should be generated by convertFormDefinitionToConfig)
            if (!formConfig.id) {
              const { nanoid } = await import('nanoid');
              formConfig.id = `form_${nanoid(16)}`;
            }

            // Ensure formId is unique (check against database)
            let formId = formConfig.id;
            let existingById = await collection.findOne({ formId });
            if (existingById) {
              // Generate a new unique ID
              const { nanoid } = await import('nanoid');
              formId = `form_${nanoid(16)}`;
              // Double-check it's unique (very unlikely collision, but be safe)
              while (await collection.findOne({ formId })) {
                formId = `form_${nanoid(16)}`;
              }
            }

            // Insert with formId field, applicationId, and projectId
            await collection.insertOne({
              ...formConfig,
              formId, // Use formId field for the unique index
              id: formId, // Also keep id for compatibility
              applicationId, // Associate with the created application
              projectId, // Associate with the project (required for queries)
            } as any);

            const newId = formId;
            result.imported.forms.push({
              originalId: oldId || undefined,
              newId,
              name: formConfig.name,
              slug: formConfig.slug || '',
            });

            // Map old references to new ID
            if (oldId) formIdMap.set(oldId, newId);
            if (oldSlug) formIdMap.set(oldSlug, newId);
            formIdMap.set(formDef.name, newId); // Also map by name as fallback

            console.log(`[Import] Created form: ${formConfig.name} (${newId})`);
          } else if (sessionId) {
            // Legacy session-based import
            const formConfig = convertFormDefinitionToConfig(
              formDef,
              '', // No orgId for legacy
              userId,
              {
                generateNewId: options.generateNewIds,
                preserveSlug: options.preserveSlugs,
              }
            );

            await saveForm(sessionId, formConfig as any);

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
          }
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
    if (workflows.length > 0 && forms.length > 0) {
      resolveFormWorkflowReferences(workflows, formIdMap, workflowIdMap, forms);
    }

    // Import workflows
    if (workflows.length > 0 && effectiveOrgId) {
      for (const workflowDef of workflows) {
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

          // Generate desired slug first to check for conflicts
          const desiredSlug =
            options.preserveSlugs && workflowDef.slug
              ? workflowDef.slug
              : generateSlug(workflowDef.name);

          // Check for duplicate slug and make it unique if needed
          const { getWorkflowsCollection, updateWorkflow } = await import('@/lib/workflow/db');
          const workflowsCollection = await getWorkflowsCollection(effectiveOrgId);

          let uniqueSlug = desiredSlug;
          if (!options.overwriteExisting) {
            let counter = 1;
            while (await workflowsCollection.findOne({ slug: uniqueSlug })) {
              uniqueSlug = `${desiredSlug}-${counter}`;
              counter++;
            }
          }

          // Convert and create
          const workflowData = convertWorkflowDefinitionToDocument(
            workflowDef,
            effectiveOrgId,
            userId,
            {
              generateNewId: options.generateNewIds,
              preserveSlug: options.preserveSlugs,
            }
          );

          // createWorkflow generates its own ID and slug, so we create it first
          // then update the slug if needed (createWorkflow handles ID uniqueness)
          const workflow = await createWorkflow(effectiveOrgId, userId, {
            name: workflowData.name,
            description: workflowData.description,
            tags: workflowData.tags || [],
            projectId, // Associate with the project (required for queries)
            applicationId, // Associate with the created application
          });

          // Update slug if it's different from what createWorkflow generated
          if (workflow.slug !== uniqueSlug) {
            // Check again in case createWorkflow generated a different slug
            let finalSlug = uniqueSlug;
            let counter = 1;
            while (
              await workflowsCollection.findOne({ slug: finalSlug, id: { $ne: workflow.id } })
            ) {
              finalSlug = `${desiredSlug}-${counter}`;
              counter++;
            }

            // Update the workflow with the desired slug
            await updateWorkflow(effectiveOrgId, workflow.id, userId, {
              slug: finalSlug,
            } as any);
            workflow.slug = finalSlug;
          }

          // Update with canvas, settings, and applicationId
          await updateWorkflow(effectiveOrgId, workflow.id, userId, {
            canvas: workflowData.canvas,
            settings: workflowData.settings,
            variables: workflowData.variables,
            inputSchema: workflowData.inputSchema,
            outputSchema: workflowData.outputSchema,
            applicationId, // Associate with the created application
          } as any);

          // Get updated workflow to return proper slug
          const { getWorkflowById } = await import('@/lib/workflow/db');
          const updatedWorkflow = await getWorkflowById(effectiveOrgId, workflow.id);

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

          console.log(`[Import] Created workflow: ${workflow.name} (${newId})`);
        } catch (error: any) {
          result.errors?.push({
            type: 'workflow',
            name: workflowDef.name || 'unknown',
            error: error.message || 'Import failed',
          });
        }
      }
    }

    // Update application stats after importing forms and workflows
    if (applicationId && effectiveOrgId) {
      try {
        await calculateApplicationStats(effectiveOrgId, applicationId);
        console.log(`[Import] Updated application stats for ${applicationId}`);
      } catch (error: any) {
        console.error('[Import] Failed to update application stats:', error.message);
      }
    }

    // Determine overall success
    result.success = (result.errors?.length ?? 0) === 0;

    return NextResponse.json(result, {
      status: result.success ? 200 : 207, // 207 = Multi-Status (partial success)
    });
  } catch (error: any) {
    console.error('Error importing template bundle:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import template bundle' },
      { status: 500 }
    );
  }
}
