/**
 * Wizard Templates Registry
 *
 * Central export point for all wizard templates.
 * Add new templates here to make them available in the template selector.
 */

import { WizardTemplate, WizardTemplateCategory } from '@/types/wizardTemplates';
import { employeeOnboardingTemplate } from './employeeOnboarding';

/**
 * All available wizard templates
 */
export const wizardTemplates: WizardTemplate[] = [
  employeeOnboardingTemplate,
];

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): WizardTemplate | undefined {
  return wizardTemplates.find((t) => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: WizardTemplateCategory): WizardTemplate[] {
  return wizardTemplates.filter((t) => t.category === category);
}

/**
 * Get all unique categories that have templates
 */
export function getAvailableCategories(): WizardTemplateCategory[] {
  const categories = new Set(wizardTemplates.map((t) => t.category));
  return Array.from(categories);
}

/**
 * Search templates by name, description, or tags
 */
export function searchTemplates(query: string): WizardTemplate[] {
  const lowerQuery = query.toLowerCase();
  return wizardTemplates.filter((t) =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

// Re-export individual templates for direct import
export { employeeOnboardingTemplate };
