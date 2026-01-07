/**
 * Template Registry
 *
 * Central registry for conversational form templates.
 * Templates register themselves here and can be queried by consumers.
 *
 * This file is safe for client-side use.
 * For server-only database operations, see ./server.ts
 */

import {
  ConversationTemplate,
  TemplateRegistration,
  TemplateQueryOptions,
  TemplateCategory,
  AppliedTemplate,
} from './types';
import { ConversationalFormConfig } from '@/types/conversational';

/**
 * Template Registry Class
 *
 * Manages registration and lookup of conversation templates.
 */
class TemplateRegistry {
  private templates: Map<string, TemplateRegistration> = new Map();
  private initialized = false;

  /**
   * Register a template
   * @param template Template to register
   * @param priority Registration priority (higher = shown first)
   * @param enabled Whether template is enabled
   */
  register(
    template: ConversationTemplate,
    priority: number = 0,
    enabled: boolean = true
  ): void {
    if (this.templates.has(template.id)) {
      console.warn(
        `[TemplateRegistry] Template "${template.id}" is already registered. Overwriting.`
      );
    }

    this.templates.set(template.id, {
      template,
      priority,
      enabled,
    });
  }

  /**
   * Unregister a template
   * @param templateId Template ID to remove
   */
  unregister(templateId: string): boolean {
    return this.templates.delete(templateId);
  }

  /**
   * Get a template by ID
   * @param templateId Template ID
   * @returns Template or undefined if not found
   */
  get(templateId: string): ConversationTemplate | undefined {
    const registration = this.templates.get(templateId);
    if (!registration || !registration.enabled) {
      return undefined;
    }
    return registration.template;
  }

  /**
   * Check if a template exists
   * @param templateId Template ID
   */
  has(templateId: string): boolean {
    const registration = this.templates.get(templateId);
    return !!registration && registration.enabled;
  }

  /**
   * Get all templates matching query options
   * @param options Query options for filtering
   * @returns Array of templates sorted by priority
   */
  getAll(options: TemplateQueryOptions = {}): ConversationTemplate[] {
    const results: TemplateRegistration[] = [];

    for (const registration of this.templates.values()) {
      // Skip disabled unless requested
      if (!registration.enabled && !options.includeDisabled) {
        continue;
      }

      const template = registration.template;

      // Filter by category
      if (options.category && template.category !== options.category) {
        continue;
      }

      // Filter by built-in only
      if (options.builtInOnly && !template.isBuiltIn) {
        continue;
      }

      // Filter by tags
      if (options.tags && options.tags.length > 0) {
        const templateTags = template.metadata?.tags || [];
        const hasMatchingTag = options.tags.some((tag) =>
          templateTags.includes(tag)
        );
        if (!hasMatchingTag) {
          continue;
        }
      }

      results.push(registration);
    }

    // Sort by priority (higher first)
    results.sort((a, b) => b.priority - a.priority);

    return results.map((r) => r.template);
  }

  /**
   * Get templates grouped by category
   * @param options Query options for filtering
   * @returns Map of category to templates
   */
  getByCategory(
    options: TemplateQueryOptions = {}
  ): Map<TemplateCategory, ConversationTemplate[]> {
    const templates = this.getAll(options);
    const grouped = new Map<TemplateCategory, ConversationTemplate[]>();

    for (const template of templates) {
      const category = template.category;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(template);
    }

    return grouped;
  }

  /**
   * Apply a template to create form configuration
   * @param templateId Template ID to apply
   * @param overrides Optional config overrides
   * @returns Applied template result or null if template not found
   */
  applyTemplate(
    templateId: string,
    overrides?: Partial<ConversationalFormConfig>
  ): AppliedTemplate | null {
    const template = this.get(templateId);
    if (!template) {
      return null;
    }

    // Build base config from template
    const config: ConversationalFormConfig = {
      formType: 'conversational',
      templateId: template.id,
      objective: template.defaultConfig.objective,
      context: template.defaultConfig.context,
      persona: { ...template.defaultConfig.persona },
      conversationLimits: { ...template.defaultConfig.conversationLimits },
      topics: template.defaultTopics.map((t) => ({ ...t })),
      extractionSchema: template.defaultSchema.map((s) => ({ ...s })),
    };

    // Apply overrides
    const hasCustomizations = !!overrides && Object.keys(overrides).length > 0;
    if (overrides) {
      Object.assign(config, overrides);
    }

    return {
      templateId: template.id,
      config,
      hasCustomizations,
    };
  }

  /**
   * Get count of registered templates
   */
  get count(): number {
    return this.templates.size;
  }

  /**
   * Get count of enabled templates
   */
  get enabledCount(): number {
    let count = 0;
    for (const registration of this.templates.values()) {
      if (registration.enabled) {
        count++;
      }
    }
    return count;
  }

  /**
   * Enable or disable a template
   * @param templateId Template ID
   * @param enabled Whether to enable or disable
   */
  setEnabled(templateId: string, enabled: boolean): boolean {
    const registration = this.templates.get(templateId);
    if (!registration) {
      return false;
    }
    registration.enabled = enabled;
    return true;
  }

  /**
   * Clear all templates (useful for testing)
   */
  clear(): void {
    this.templates.clear();
    this.initialized = false;
  }

  /**
   * Check if registry has been initialized with built-in templates
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Mark registry as initialized
   */
  markInitialized(): void {
    this.initialized = true;
  }
}

// Singleton instance
export const templateRegistry = new TemplateRegistry();

/**
 * Register a template with the global registry
 */
export function registerTemplate(
  template: ConversationTemplate,
  priority: number = 0
): void {
  templateRegistry.register(template, priority, true);
}

/**
 * Get a template from the global registry
 */
export function getTemplate(templateId: string): ConversationTemplate | undefined {
  return templateRegistry.get(templateId);
}

/**
 * Get all templates from the global registry
 */
export function getAllTemplates(
  options?: TemplateQueryOptions
): ConversationTemplate[] {
  return templateRegistry.getAll(options);
}

/**
 * Apply a template from the global registry
 */
export function applyTemplate(
  templateId: string,
  overrides?: Partial<ConversationalFormConfig>
): AppliedTemplate | null {
  return templateRegistry.applyTemplate(templateId, overrides);
}

/**
 * Check if a template exists in the global registry
 */
export function hasTemplate(templateId: string): boolean {
  return templateRegistry.has(templateId);
}

// Note: Server-only database operations (loadOrgTemplates, getAllTemplatesWithOrg, etc.)
// have been moved to ./server.ts to prevent client-side bundling of MongoDB code.
