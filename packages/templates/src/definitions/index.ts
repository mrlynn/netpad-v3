/**
 * Template Definitions Index
 *
 * Central export for all 100+ form templates organized by category.
 */

import type { FormTemplate } from '../types';

// Import all category templates
import { businessSalesTemplates } from './businessSales';
import { hrRecruitmentTemplates } from './hrRecruitment';
import { customerServiceTemplates } from './customerService';
import { marketingResearchTemplates } from './marketingResearch';
import { educationTrainingTemplates } from './educationTraining';
import { healthcareWellnessTemplates } from './healthcareWellness';
import { realEstateTemplates } from './realEstate';
import { legalComplianceTemplates } from './legalCompliance';
import { nonprofitCommunityTemplates } from './nonprofitCommunity';
import { eventsHospitalityTemplates } from './eventsHospitality';
import { technologyItTemplates } from './technologyIt';
import { financeAccountingTemplates } from './financeAccounting';
import { sportsFitnessTemplates } from './sportsFitness';
import { travelTourismTemplates } from './travelTourism';
import { governmentPublicTemplates } from './governmentPublic';

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
};

/**
 * All form templates combined
 */
export const ALL_TEMPLATES: FormTemplate[] = [
  ...businessSalesTemplates,
  ...hrRecruitmentTemplates,
  ...customerServiceTemplates,
  ...marketingResearchTemplates,
  ...educationTrainingTemplates,
  ...healthcareWellnessTemplates,
  ...realEstateTemplates,
  ...legalComplianceTemplates,
  ...nonprofitCommunityTemplates,
  ...eventsHospitalityTemplates,
  ...technologyItTemplates,
  ...financeAccountingTemplates,
  ...sportsFitnessTemplates,
  ...travelTourismTemplates,
  ...governmentPublicTemplates,
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): FormTemplate | undefined {
  return ALL_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): FormTemplate[] {
  return ALL_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get featured templates
 */
export function getFeaturedTemplates(limit?: number): FormTemplate[] {
  const featured = ALL_TEMPLATES.filter(t => t.isFeatured);
  return limit ? featured.slice(0, limit) : featured;
}

/**
 * Search templates by query
 */
export function searchTemplates(query: string): FormTemplate[] {
  const lowerQuery = query.toLowerCase();
  return ALL_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.shortDescription.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get template count by category
 */
export function getTemplateCounts(): Record<string, number> {
  return ALL_TEMPLATES.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Filter templates with multiple criteria
 */
export function filterTemplates(options: {
  category?: string;
  formType?: string;
  complexity?: string;
  search?: string;
  featured?: boolean;
  tags?: string[];
}): FormTemplate[] {
  let results = ALL_TEMPLATES;

  if (options.category && options.category !== 'all') {
    results = results.filter(t => t.category === options.category);
  }

  if (options.formType) {
    results = results.filter(t => t.formType === options.formType);
  }

  if (options.complexity) {
    results = results.filter(t => t.complexity === options.complexity);
  }

  if (options.featured !== undefined) {
    results = results.filter(t => t.isFeatured === options.featured);
  }

  if (options.tags && options.tags.length > 0) {
    results = results.filter(t =>
      options.tags!.some(tag => t.tags.includes(tag))
    );
  }

  if (options.search) {
    const lowerQuery = options.search.toLowerCase();
    results = results.filter(t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.shortDescription.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  return results;
}
