/**
 * Form Template Definitions Index
 *
 * Re-exports templates from @netpad/templates package for backward compatibility.
 * All templates are now defined in the @netpad/templates package.
 *
 * @deprecated Import directly from '@netpad/templates' instead
 */

// Re-export category arrays
export {
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
} from '@netpad/templates';

// Re-export all templates and utilities
export {
  ALL_TEMPLATES,
  getTemplateById,
  getTemplatesByCategory,
  getFeaturedTemplates,
  searchTemplates,
  getTemplateCounts,
  filterTemplates,
} from '@netpad/templates';
