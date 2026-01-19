/**
 * Template Factory
 *
 * Factory function for creating consistent form templates.
 */

import type {
  FormTemplate,
  FormTemplateCategory,
  TemplateFormType,
  TemplateComplexity,
  FieldConfig,
  EnhancedTemplateContent,
} from '../types';
import { getThemeForCategory } from './themePresets';

const now = new Date().toISOString();

/**
 * Parse estimated time string to number (minutes)
 */
function parseEstimatedTime(time: string | number | undefined): number {
  if (typeof time === 'number') return time;
  if (!time) return 5;
  // Parse strings like "5-7 min" -> take average, or "10 min" -> 10
  const match = time.match(/(\d+)(?:\s*-\s*(\d+))?/);
  if (match) {
    const low = parseInt(match[1], 10);
    const high = match[2] ? parseInt(match[2], 10) : low;
    return Math.round((low + high) / 2);
  }
  return 5;
}

/**
 * Normalize complexity value
 */
function normalizeComplexity(complexity: string | undefined): TemplateComplexity {
  if (!complexity) return 'simple';
  if (complexity === 'intermediate') return 'moderate';
  if (complexity === 'simple' || complexity === 'moderate' || complexity === 'advanced') {
    return complexity;
  }
  return 'simple';
}

/**
 * Normalize form type value
 */
function normalizeFormType(formType: string | undefined): TemplateFormType {
  if (!formType) return 'traditional';
  if (formType === 'both') return 'hybrid';
  if (formType === 'traditional' || formType === 'conversational' || formType === 'hybrid') {
    return formType;
  }
  return 'traditional';
}

/**
 * Input type for createTemplate - more flexible than FormTemplate
 */
export interface CreateTemplateInput {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  fullDescription?: string;
  category: FormTemplateCategory;
  icon?: string;
  complexity?: string;
  estimatedTime?: string | number;
  formType?: string;
  featured?: boolean;
  isFeatured?: boolean;
  displayOrder?: number;
  fields?: FieldConfig[];
  fieldConfigs?: FieldConfig[];
  tags?: string[];
  useCases?: string[];
  features?: string[];
  enhanced?: EnhancedTemplateContent;
  [key: string]: unknown;
}

/**
 * Create a form template with defaults
 * Accepts flexible input format and normalizes to FormTemplate
 */
export function createTemplate(partial: CreateTemplateInput): FormTemplate {
  const theme = getThemeForCategory(partial.category);

  // Handle both 'fields' and 'fieldConfigs' property names
  const fieldConfigs = partial.fieldConfigs || partial.fields || [];

  // Handle both 'description' and 'shortDescription'
  const shortDescription = partial.shortDescription || partial.description || '';

  return {
    id: partial.id,
    name: partial.name,
    shortDescription,
    fullDescription: partial.fullDescription || shortDescription,
    category: partial.category,
    formType: normalizeFormType(partial.formType),
    complexity: normalizeComplexity(partial.complexity),
    estimatedTime: parseEstimatedTime(partial.estimatedTime),
    icon: partial.icon || 'FileText',
    tags: partial.tags || [],
    isFeatured: partial.isFeatured ?? partial.featured ?? false,
    displayOrder: partial.displayOrder ?? 99,
    useCases: partial.useCases || [],
    features: partial.features || [],
    fieldConfigs,
    theme,
    enhanced: partial.enhanced,
    version: '1.0.0',
    createdAt: now,
    updatedAt: now,
    author: 'netpad',
  };
}
