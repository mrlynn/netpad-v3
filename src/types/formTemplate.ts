/**
 * Form Template Types
 *
 * Re-exports types from @netpad/templates package for backward compatibility.
 * All template types are now defined in the @netpad/templates package.
 *
 * @deprecated Import directly from '@netpad/templates' instead
 */

// Re-export all types from the package
export type {
  FormTemplateCategory,
  TemplateCategoryMeta,
  TemplateFormType,
  TemplateComplexity,
  FormTemplate,
  TemplateStats,
  TemplateListItem,
  TemplatesByCategory,
  TemplateFilters,
  EnhancedLongDescription,
  EnhancedUseCase,
  EnhancedCustomizationTip,
  EnhancedWorkflowPairing,
  EnhancedDeveloperNotes,
  EnhancedSEO,
  EnhancedTemplateContent,
} from '@netpad/templates';

// Re-export constants and functions
export {
  TEMPLATE_CATEGORIES,
  getCategoryMeta,
  getAllCategoryIds,
  formatComplexity,
  formatFormType,
  getComplexityColor,
} from '@netpad/templates';
