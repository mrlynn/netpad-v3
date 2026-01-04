/**
 * Template Export Utilities
 * 
 * Functions to export forms, workflows, and bundles as portable templates
 */

import { FormConfiguration } from '@/types/form';
import { WorkflowDocument } from '@/types/workflow';
import { FormDefinition, WorkflowDefinition, TemplateManifest, BundleExport } from '@/types/template';

/**
 * Clean form configuration for export
 * Removes sensitive/organization-specific data
 */
export function cleanFormForExport(form: FormConfiguration): FormDefinition {
  const {
    // Exclude sensitive/org-specific fields
    connectionString,
    dataSource,
    organizationId,
    createdBy,
    accessControl,
    id,
    // Keep everything else
    ...exportableFields
  } = form;

  return {
    ...exportableFields,
    // Preserve slug for reference, but it will be regenerated on import if conflicts
    slug: form.slug,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
  } as FormDefinition;
}

/**
 * Clean workflow document for export
 * Removes sensitive/organization-specific data
 */
export function cleanWorkflowForExport(workflow: WorkflowDocument): WorkflowDefinition {
  const {
    // Exclude sensitive/org-specific fields
    _id,
    id,
    orgId,
    createdBy,
    lastModifiedBy,
    stats,
    // Keep everything else
    ...exportableFields
  } = workflow;

  return {
    ...exportableFields,
    // Preserve slug for reference
    slug: workflow.slug,
    createdAt: workflow.createdAt instanceof Date ? workflow.createdAt.toISOString() : workflow.createdAt,
    updatedAt: workflow.updatedAt instanceof Date ? workflow.updatedAt.toISOString() : workflow.updatedAt,
  } as WorkflowDefinition;
}

/**
 * Create template manifest from bundle contents
 */
export function createManifest(
  name: string,
  version: string,
  options: {
    description?: string;
    author?: string;
    forms?: FormDefinition[];
    workflows?: WorkflowDefinition[];
    theme?: any;
    dependencies?: TemplateManifest['dependencies'];
    instructions?: TemplateManifest['instructions'];
    tags?: string[];
    category?: string;
  }
): TemplateManifest {
  const assets: TemplateManifest['assets'] = {};
  
  if (options.forms && options.forms.length > 0) {
    assets.forms = options.forms.map((_, index) => `forms/${index === 0 ? 'form.json' : `form-${index + 1}.json`}`);
  }
  
  if (options.workflows && options.workflows.length > 0) {
    assets.workflows = options.workflows.map((_, index) => 
      `workflows/${index === 0 ? 'workflow.json' : `workflow-${index + 1}.json`}`
    );
  }
  
  if (options.theme) {
    assets.theme = 'theme.json';
  }

  return {
    name,
    version,
    description: options.description,
    author: options.author,
    assets,
    dependencies: options.dependencies,
    instructions: options.instructions,
    tags: options.tags,
    category: options.category,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create bundle export structure
 */
export function createBundleExport(
  manifest: TemplateManifest,
  forms?: FormDefinition[],
  workflows?: WorkflowDefinition[],
  theme?: any
): BundleExport {
  return {
    manifest,
    forms,
    workflows,
    theme,
  };
}
