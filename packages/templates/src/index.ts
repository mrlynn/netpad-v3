/**
 * @netpad/templates
 *
 * 100+ production-ready form templates for NetPad applications.
 * Organized by industry categories with full type safety.
 *
 * @example
 * ```typescript
 * // Get all templates
 * import { allTemplates, getTemplateById } from '@netpad/templates';
 *
 * // Get specific category
 * import { healthcareWellnessTemplates } from '@netpad/templates';
 *
 * // Types only
 * import type { FormTemplate, FieldConfig } from '@netpad/templates';
 *
 * // Helpers for custom templates
 * import { createTemplate, textField, emailField } from '@netpad/templates/helpers';
 * ```
 *
 * @packageDocumentation
 */

// Re-export all types
export * from './types';

// Re-export helpers
export * from './helpers';

// Re-export definitions and utilities
export {
  // All templates
  ALL_TEMPLATES,
  ALL_TEMPLATES as allTemplates,

  // Category exports
  businessSalesTemplates,
  hrRecruitmentTemplates,
  customerServiceTemplates,
  marketingResearchTemplates,
  educationTrainingTemplates,
  healthcareWellnessTemplates,
  realEstateTemplates,
  legalComplianceTemplates,
  nonprofitCommunityTemplates,
  eventsHospitalityTemplates,
  technologyItTemplates,
  financeAccountingTemplates,
  sportsFitnessTemplates,
  travelTourismTemplates,
  governmentPublicTemplates,

  // Utility functions
  getTemplateById,
  getTemplatesByCategory,
  getFeaturedTemplates,
  searchTemplates,
  getTemplateCounts,
  filterTemplates,
} from './definitions';
