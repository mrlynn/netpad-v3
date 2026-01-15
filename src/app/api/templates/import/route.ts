/**
 * Template Bundle Import API
 * 
 * POST /api/templates/import
 * Import a template bundle (form + workflows + theme)
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
import { BundleImportRequest, BundleImportResult } from '@/types/template';

export const dynamic = 'force-dynamic';

/**
 * POST /api/templates/import
 * Import template bundle
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    
    const importRequest: BundleImportRequest = body;
    const options = importRequest.options || {
      generateNewIds: true,
      preserveSlugs: false,
      overwriteExisting: false,
    };
    
    const result: BundleImportResult = {
      success: true,
      imported: {
        forms: [],
        workflows: [],
      },
      errors: [],
    };
    
    // Get user session
    let userId: string;
    let sessionId: string | undefined;
    
    if (orgId) {
      const session = await getSession();
      if (!session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = session.userId;
    } else {
      // Legacy session-based
      const session = await getIronSession(await cookies(), sessionOptions);
      sessionId = ensureSessionId(session);
      userId = sessionId;
    }
    
    // Build maps for reference resolution
    const formIdMap = new Map<string, string>(); // oldId/slug -> newId
    const workflowIdMap = new Map<string, string>(); // oldId/slug -> newId
    
    // Import forms
    if (importRequest.forms && importRequest.forms.length > 0) {
      for (const formDef of importRequest.forms) {
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
          
          if (orgId) {
            // Platform-based import
            const collection = await getOrgFormsCollection(orgId);
            
            // Check if form with same name/slug exists
            if (!options.overwriteExisting) {
              const existing = await collection.findOne({
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
                generateNewId: options.generateNewIds,
                preserveSlug: options.preserveSlugs,
              }
            );
            
            await collection.insertOne(formConfig as any);
            
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
            formIdMap.set(formDef.name, newId); // Also map by name as fallback
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
    if (importRequest.workflows && importRequest.workflows.length > 0 && importRequest.forms) {
      resolveFormWorkflowReferences(
        importRequest.workflows,
        formIdMap,
        workflowIdMap,
        importRequest.forms
      );
    }
    
    // Import workflows
    if (importRequest.workflows && importRequest.workflows.length > 0 && orgId) {
      for (const workflowDef of importRequest.workflows) {
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
              generateNewId: options.generateNewIds,
              preserveSlug: options.preserveSlugs,
            }
          );
          
          // createWorkflow only takes name, description, tags
          // We need to create and then update with canvas/settings
          const workflow = await createWorkflow(orgId, userId, {
            name: workflowData.name,
            description: workflowData.description,
            tags: workflowData.tags || [],
          });
          
          // Update with canvas and settings (now with resolved form references)
          const { updateWorkflow } = await import('@/lib/workflow/db');
          await updateWorkflow(orgId, workflow.id, userId, {
            canvas: workflowData.canvas,
            settings: workflowData.settings,
            variables: workflowData.variables,
            inputSchema: workflowData.inputSchema,
            outputSchema: workflowData.outputSchema,
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

