/**
 * Template Import Utilities
 * 
 * Functions to import forms, workflows, and bundles
 */

import { FormConfiguration } from '@/types/form';
import { WorkflowDocument } from '@/types/workflow';
import { FormDefinition, WorkflowDefinition, BundleImportRequest, BundleImportResult } from '@/types/template';
import { nanoid } from 'nanoid';

/**
 * Convert form definition to FormConfiguration
 * Adds organization-specific fields and generates new IDs
 */
export function convertFormDefinitionToConfig(
  definition: FormDefinition,
  organizationId: string,
  userId: string,
  options: {
    generateNewId?: boolean;
    preserveSlug?: boolean;
  } = {}
): FormConfiguration {
  const now = new Date().toISOString();
  
  // Generate new ID or preserve if needed
  const id = options.generateNewId !== false ? `form_${nanoid(16)}` : undefined;
  
  // Generate slug from name if not preserving
  const slug = options.preserveSlug && definition.slug
    ? definition.slug
    : generateSlug(definition.name);

  return {
    ...definition,
    id,
    slug,
    organizationId,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
    // Remove export metadata
    // These will be set by the system
  } as FormConfiguration;
}

/**
 * Convert workflow definition to WorkflowDocument
 * Returns partial workflow data suitable for creating a new workflow
 */
export function convertWorkflowDefinitionToDocument(
  definition: WorkflowDefinition,
  orgId: string,
  userId: string,
  options: {
    generateNewId?: boolean;
    preserveSlug?: boolean;
  } = {}
): {
  name: string;
  description?: string;
  canvas: any;
  settings: any;
  variables?: any[];
  inputSchema?: any;
  outputSchema?: any;
  tags?: string[];
} {
  return {
    name: definition.name,
    description: definition.description,
    canvas: definition.canvas,
    settings: definition.settings,
    variables: definition.variables,
    inputSchema: definition.inputSchema,
    outputSchema: definition.outputSchema,
    tags: definition.tags,
  };
}

/**
 * Generate URL-friendly slug from name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}


/**
 * Validate form definition structure
 */
export function validateFormDefinition(definition: any): { valid: boolean; error?: string } {
  if (!definition || typeof definition !== 'object') {
    return { valid: false, error: 'Form definition must be an object' };
  }
  
  if (!definition.name || typeof definition.name !== 'string') {
    return { valid: false, error: 'Form definition must have a name' };
  }
  
  if (!Array.isArray(definition.fieldConfigs)) {
    return { valid: false, error: 'Form definition must have fieldConfigs array' };
  }
  
  return { valid: true };
}

/**
 * Validate workflow definition structure
 */
export function validateWorkflowDefinition(definition: any): { valid: boolean; error?: string } {
  if (!definition || typeof definition !== 'object') {
    return { valid: false, error: 'Workflow definition must be an object' };
  }
  
  if (!definition.name || typeof definition.name !== 'string') {
    return { valid: false, error: 'Workflow definition must have a name' };
  }
  
  if (!definition.canvas || typeof definition.canvas !== 'object') {
    return { valid: false, error: 'Workflow definition must have a canvas' };
  }
  
  if (!definition.settings || typeof definition.settings !== 'object') {
    return { valid: false, error: 'Workflow definition must have settings' };
  }
  
  return { valid: true };
}
