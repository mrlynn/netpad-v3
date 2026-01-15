/**
 * Bundle Import Function
 * 
 * Reusable function to import a bundle into an organization
 */

import { BundleExport, BundleImportResult } from '@/types/template';
import {
  convertFormDefinitionToConfig,
  convertWorkflowDefinitionToDocument,
  validateFormDefinition,
  validateWorkflowDefinition,
  generateSlug,
  resolveFormWorkflowReferences,
} from './import';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { createWorkflow } from '@/lib/workflow/db';

/**
 * Import bundle into organization
 */
export async function importBundle(
  orgId: string,
  projectId: string,
  bundle: BundleExport,
  options: {
    userId: string;
    overwriteExisting?: boolean;
    generateNewIds?: boolean;
    preserveSlugs?: boolean;
  }
): Promise<BundleImportResult> {
  const result: BundleImportResult = {
    success: true,
    imported: {
      forms: [],
      workflows: [],
    },
    errors: [],
  };

  // Build maps for reference resolution
  const formIdMap = new Map<string, string>();
  const workflowIdMap = new Map<string, string>();

  // Import forms
  if (bundle.forms && bundle.forms.length > 0) {
    const formsCollection = await getOrgFormsCollection(orgId);

    for (const formDef of bundle.forms) {
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
        if (!options.overwriteExisting) {
          const existing = await formsCollection.findOne({
            $or: [
              { name: formDef.name },
              { slug: formDef.slug || generateSlug(formDef.name) },
            ],
            projectId,
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
          options.userId,
          {
            generateNewId: options.generateNewIds,
            preserveSlug: options.preserveSlugs,
          }
        );

        // Add projectId and applicationId if available
        (formConfig as any).projectId = projectId;
        // applicationId will be set separately after application is created

        const insertResult = await formsCollection.insertOne(formConfig as any);
        const newId = formConfig.id || insertResult.insertedId.toString();

        // Map old ID/slug to new ID
        if (oldId) formIdMap.set(oldId, newId);
        if (oldSlug) formIdMap.set(oldSlug, newId);

        result.imported.forms.push({
          originalId: oldId || undefined,
          newId,
          name: formDef.name,
          slug: formConfig.slug || newId,
        });
      } catch (error: any) {
        result.errors?.push({
          type: 'form',
          name: formDef.name || 'unknown',
          error: error.message || 'Failed to import form',
        });
      }
    }
  }

  // Import workflows
  if (bundle.workflows && bundle.workflows.length > 0) {
    // Resolve form references in workflows before importing
    resolveFormWorkflowReferences(
      bundle.workflows,
      formIdMap,
      workflowIdMap,
      bundle.forms || []
    );

    for (const workflowDef of bundle.workflows) {
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

        // Store old references
        const oldId = workflowDef.id || '';
        const oldSlug = workflowDef.slug || '';

        // Check if workflow with same name exists
        if (!options.overwriteExisting) {
          // Note: We'd need to check workflow collection here
          // For now, we'll let createWorkflow handle uniqueness
        }

        // Convert and create
        const workflowData = convertWorkflowDefinitionToDocument(
          workflowDef,
          orgId,
          options.userId,
          {
            generateNewId: options.generateNewIds,
            preserveSlug: options.preserveSlugs,
          }
        );

        const workflow = await createWorkflow(
          orgId,
          options.userId,
          {
            ...workflowData,
            projectId,
          }
        );

        const newId = workflow.id;

        // Map old ID/slug to new ID
        if (oldId) workflowIdMap.set(oldId, newId);
        if (oldSlug) workflowIdMap.set(oldSlug, newId);

        result.imported.workflows.push({
          originalId: oldId || undefined,
          newId,
          name: workflowDef.name,
          slug: workflow.slug,
        });
      } catch (error: any) {
        result.errors?.push({
          type: 'workflow',
          name: workflowDef.name || 'unknown',
          error: error.message || 'Failed to import workflow',
        });
      }
    }
  }

  result.success = (result.errors?.length || 0) === 0 || result.imported.forms.length > 0 || result.imported.workflows.length > 0;

  return result;
}
