/**
 * Template Loader
 *
 * Loads form and workflow templates from JSON files and TypeScript definitions.
 * Supports both static imports (build-time) and fallback to hardcoded templates.
 *
 * Two template systems are available:
 * 1. JSON templates (legacy) - simple templates from JSON files
 * 2. Definition templates (new) - comprehensive templates with full field configs
 */

import { formTemplates as jsonTemplates, templateCategories } from './formTemplates';
import { workflowTemplates as jsonWorkflowTemplates, workflowTemplateCategories } from './workflowTemplates';
import {
  ALL_TEMPLATES as definitionTemplates,
  getTemplatesByCategory as getDefTemplatesByCategory,
  getTemplateById as getDefTemplateById,
  getFeaturedTemplates as getDefFeaturedTemplates,
  searchTemplates as searchDefTemplates,
  getTemplateCounts as getDefTemplateCounts,
} from './definitions';
import type { FormType, SearchConfig } from '@/types/form';
import type { FormTemplate as NewFormTemplate, TEMPLATE_CATEGORIES } from '@/types/formTemplate';

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  fields: any[]; // FieldConfig[]
  tags?: string[];
  complexity?: 'simple' | 'moderate' | 'advanced';
  estimatedTime?: string;
  previewImageUrl?: string; // URL to preview image (e.g., "/templates/forms/contact-form.png")
  // Form type configuration (optional - defaults to 'data-entry' if not specified)
  formType?: 'data-entry' | 'search' | 'both' | 'conversational';
  // Search configuration (for search or 'both' form types)
  searchConfig?: SearchConfig;
  // Conversational configuration (for conversational form type)
  // Note: Conversational forms also have a separate template system via ConversationTemplate
  conversationalConfig?: import('@/types/conversational').ConversationalFormConfig;
  requirements?: {
    integrations?: string[];
    connections?: string[];
  };
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  nodeCount: number;
  nodes: Array<{
    type: string;
    label: string;
    position: { x: number; y: number };
  }>;
  edges: Array<{
    source: number;
    target: number;
  }>;
  tags?: string[];
  complexity?: 'simple' | 'moderate' | 'advanced';
  estimatedTime?: string;
  previewImageUrl?: string; // URL to preview image (e.g., "/templates/workflows/form-to-email.png")
}

// Fallback to hardcoded templates (from EmptyFormState.tsx)
// This allows backward compatibility during migration
let hardcodedTemplates: FormTemplate[] | null = null;

/**
 * Set hardcoded templates (used as fallback during migration)
 */
export function setHardcodedTemplates(templates: FormTemplate[]): void {
  hardcodedTemplates = templates;
}

/**
 * Load all form templates
 * 
 * Priority:
 * 1. JSON templates (from formTemplates.ts)
 * 2. Hardcoded templates (fallback, for backward compatibility)
 */
export function loadFormTemplates(): FormTemplate[] {
  // Use JSON templates if available
  if (jsonTemplates && jsonTemplates.length > 0) {
    return jsonTemplates;
  }
  
  // Fallback to hardcoded templates if set
  if (hardcodedTemplates && hardcodedTemplates.length > 0) {
    return hardcodedTemplates;
  }
  
  // Return empty array if neither available
  return [];
}

/**
 * Load form templates by category
 */
export function loadFormTemplatesByCategory(category: string): FormTemplate[] {
  const allTemplates = loadFormTemplates();
  if (category === 'all') {
    return allTemplates;
  }
  return allTemplates.filter(t => t.category === category);
}

/**
 * Load a specific form template by ID
 */
export function loadFormTemplate(id: string): FormTemplate | null {
  const allTemplates = loadFormTemplates();
  return allTemplates.find(t => t.id === id) || null;
}

/**
 * Get template categories
 */
export function getTemplateCategories() {
  return templateCategories;
}

/**
 * Load all workflow templates
 * 
 * Priority:
 * 1. JSON templates (from workflowTemplates.ts)
 * 2. Hardcoded templates (fallback, for backward compatibility)
 */
export function loadWorkflowTemplates(): WorkflowTemplate[] {
  // Use JSON templates if available
  if (jsonWorkflowTemplates && jsonWorkflowTemplates.length > 0) {
    return jsonWorkflowTemplates;
  }
  
  // Return empty array if not available
  return [];
}

/**
 * Load workflow templates by category
 */
export function loadWorkflowTemplatesByCategory(category: string): WorkflowTemplate[] {
  const allTemplates = loadWorkflowTemplates();
  if (category === 'all') {
    return allTemplates;
  }
  return allTemplates.filter(t => t.category === category);
}

/**
 * Load a specific workflow template by ID
 */
export function loadWorkflowTemplate(id: string): WorkflowTemplate | null {
  const allTemplates = loadWorkflowTemplates();
  return allTemplates.find(t => t.id === id) || null;
}

/**
 * Get workflow template categories
 */
export function getWorkflowTemplateCategories() {
  return workflowTemplateCategories;
}

// ============================================
// New Template System (definitions/)
// ============================================
// These exports provide access to the comprehensive 100+ template gallery

/**
 * Get all gallery templates (from definitions/)
 */
export function loadGalleryTemplates(): NewFormTemplate[] {
  return definitionTemplates;
}

/**
 * Get gallery template by ID
 */
export function loadGalleryTemplate(id: string): NewFormTemplate | undefined {
  return getDefTemplateById(id);
}

/**
 * Get gallery templates by category
 */
export function loadGalleryTemplatesByCategory(category: string): NewFormTemplate[] {
  return getDefTemplatesByCategory(category);
}

/**
 * Get featured gallery templates
 */
export function loadFeaturedGalleryTemplates(limit?: number): NewFormTemplate[] {
  return getDefFeaturedTemplates(limit);
}

/**
 * Search gallery templates
 */
export function searchGalleryTemplates(query: string): NewFormTemplate[] {
  return searchDefTemplates(query);
}

/**
 * Get template counts by category
 */
export function getGalleryTemplateCounts(): Record<string, number> {
  return getDefTemplateCounts();
}

/**
 * Convert a gallery template to the legacy FormTemplate format
 * for use with existing components
 */
export function convertGalleryToLegacy(template: NewFormTemplate): FormTemplate {
  return {
    id: template.id,
    name: template.name,
    description: template.shortDescription,
    icon: template.icon,
    category: template.category,
    fields: template.fieldConfigs,
    tags: template.tags,
    complexity: template.complexity === 'moderate' ? 'moderate' : template.complexity,
    estimatedTime: `${template.estimatedTime} min`,
    previewImageUrl: template.previewImage,
    formType: template.formType === 'hybrid' ? 'both' : template.formType === 'conversational' ? 'conversational' : 'data-entry',
    conversationalConfig: template.conversationalConfig,
  };
}

// Re-export types and constants from definitions
export { TEMPLATE_CATEGORIES } from '@/types/formTemplate';
export type { NewFormTemplate };
