/**
 * Conversational Form Templates
 *
 * Central entry point for the template system.
 * Registers all built-in templates and exports the registry.
 */

// Export types
export * from './types';

// Export registry
export * from './registry';

// Export individual templates for direct access
export { itHelpdeskTemplate } from './it-helpdesk.template';
export { customerFeedbackTemplate } from './customer-feedback.template';
export { patientIntakeTemplate } from './patient-intake.template';
export { generalIntakeTemplate } from './general-intake.template';

// Import for registration
import { templateRegistry } from './registry';
import { itHelpdeskTemplate } from './it-helpdesk.template';
import { customerFeedbackTemplate } from './customer-feedback.template';
import { patientIntakeTemplate } from './patient-intake.template';
import { generalIntakeTemplate } from './general-intake.template';

/**
 * Initialize built-in templates
 *
 * This function registers all built-in templates with the registry.
 * It is safe to call multiple times (idempotent).
 */
export function initializeBuiltInTemplates(): void {
  if (templateRegistry.isInitialized()) {
    return;
  }

  // Register templates with priorities (higher = shown first)
  templateRegistry.register(itHelpdeskTemplate, 100);
  templateRegistry.register(customerFeedbackTemplate, 90);
  templateRegistry.register(patientIntakeTemplate, 80);
  templateRegistry.register(generalIntakeTemplate, 70);

  templateRegistry.markInitialized();

  console.log(
    `[Templates] Initialized ${templateRegistry.enabledCount} built-in templates`
  );
}

/**
 * Ensure templates are initialized
 *
 * Call this before accessing templates to ensure they're registered.
 */
export function ensureTemplatesInitialized(): void {
  if (!templateRegistry.isInitialized()) {
    initializeBuiltInTemplates();
  }
}

/**
 * Get a template by ID (with auto-initialization)
 */
export function getTemplateById(templateId: string) {
  ensureTemplatesInitialized();
  return templateRegistry.get(templateId);
}

/**
 * Get all templates (with auto-initialization)
 */
export function getTemplates(options?: Parameters<typeof templateRegistry.getAll>[0]) {
  ensureTemplatesInitialized();
  return templateRegistry.getAll(options);
}

/**
 * Apply a template by ID (with auto-initialization)
 */
export function applyTemplateById(
  templateId: string,
  overrides?: Parameters<typeof templateRegistry.applyTemplate>[1]
) {
  ensureTemplatesInitialized();
  return templateRegistry.applyTemplate(templateId, overrides);
}

// Auto-initialize on module load (for convenience)
// This ensures templates are always available when this module is imported
if (typeof window !== 'undefined' || typeof process !== 'undefined') {
  initializeBuiltInTemplates();
}
