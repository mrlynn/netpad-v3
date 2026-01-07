/**
 * Server-side Template Loading
 *
 * This file contains database-dependent template operations.
 * It should only be imported in server components or API routes.
 *
 * For client-side template operations, use the main registry.ts
 */

import 'server-only';

import {
  ConversationTemplate,
  TemplateQueryOptions,
} from './types';
import {
  StoredTemplate,
  TemplatePromptConfig,
  ConversationalFormConfig,
} from '@/types/conversational';
import {
  PromptStrategy,
  DefaultPromptStrategy,
  ITHelpdeskPromptStrategy,
  buildPersonaSection,
} from '../strategies/prompt';
import { templateRegistry } from './registry';
import { getActiveTemplates } from '../templateService';

/**
 * Create a PromptStrategy from a TemplatePromptConfig
 *
 * This converts stored prompt configuration into an executable strategy.
 */
export function createPromptStrategyFromConfig(
  config: TemplatePromptConfig
): PromptStrategy {
  // Use built-in strategies for known types
  switch (config.strategyType) {
    case 'it-helpdesk':
      return new ITHelpdeskPromptStrategy();
    case 'default':
      return new DefaultPromptStrategy();
    case 'custom':
      // Create a custom strategy using the templates
      return createCustomPromptStrategyFromTemplates(config);
    default:
      return new DefaultPromptStrategy();
  }
}

/**
 * Create a custom prompt strategy from template strings
 *
 * Supports mustache-style variable interpolation: {{variable}}
 */
function createCustomPromptStrategyFromTemplates(
  config: TemplatePromptConfig
): PromptStrategy {
  const baseStrategy = new DefaultPromptStrategy();

  // Helper to interpolate variables in a template string
  const interpolate = (
    template: string,
    formConfig: ConversationalFormConfig
  ): string => {
    let result = template;

    // Built-in variables
    const variables: Record<string, string> = {
      objective: formConfig.objective || '',
      context: formConfig.context || '',
      persona: buildPersonaSection(formConfig.persona),
      topics: formConfig.topics
        .map(
          (t) =>
            `- **${t.name}** (${t.priority} priority, ${t.depth} depth): ${t.description}`
        )
        .join('\n'),
      ...config.templateVariables,
    };

    // Replace {{variable}} patterns
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return result;
  };

  return {
    id: 'custom',

    buildSystemPrompt(formConfig: ConversationalFormConfig): string {
      if (config.systemPromptTemplate) {
        return interpolate(config.systemPromptTemplate, formConfig);
      }
      return baseStrategy.buildSystemPrompt(formConfig);
    },

    buildConversationContext(state, formConfig): string {
      if (config.contextPromptTemplate) {
        // For context, we'd need state interpolation too
        // For now, fall back to base strategy as context is dynamic
        return baseStrategy.buildConversationContext(state, formConfig);
      }
      return baseStrategy.buildConversationContext(state, formConfig);
    },

    getNextTopicGuidance(state, formConfig) {
      return baseStrategy.getNextTopicGuidance(state, formConfig);
    },

    buildWrapUpPrompt(state, formConfig): string {
      if (config.wrapUpPromptTemplate) {
        return interpolate(config.wrapUpPromptTemplate, formConfig);
      }
      return baseStrategy.buildWrapUpPrompt(state, formConfig);
    },

    buildExtractionGuidance(topic, formConfig): string {
      return baseStrategy.buildExtractionGuidance(topic, formConfig);
    },
  };
}

/**
 * Convert a StoredTemplate from the database to a ConversationTemplate
 *
 * This allows database templates to be used seamlessly with the registry.
 */
export function storedTemplateToConversationTemplate(
  stored: StoredTemplate
): ConversationTemplate {
  return {
    id: stored.templateId,
    name: stored.name,
    description: stored.description,
    category: stored.category,
    icon: stored.icon,
    version: stored.version,
    isBuiltIn: false, // Database templates are never built-in

    promptStrategy: createPromptStrategyFromConfig(stored.promptConfig),

    defaultConfig: {
      objective: stored.defaultConfig.objective,
      context: stored.defaultConfig.context,
      persona: stored.defaultConfig.persona,
      conversationLimits: stored.defaultConfig.conversationLimits,
    },

    defaultTopics: stored.topics,
    defaultSchema: stored.extractionSchema,

    metadata: {
      previewDescription: stored.metadata.previewDescription,
      useCases: stored.metadata.useCases,
      tags: stored.metadata.tags,
      estimatedDuration: stored.metadata.estimatedDuration,
      author: stored.metadata.author,
      updatedAt: stored.updatedAt,
    },
  };
}

/**
 * Load organization templates from the database and register them
 *
 * This is called to add org-specific templates to the registry.
 * Built-in templates take precedence over database templates with the same ID.
 */
export async function loadOrgTemplates(orgId: string): Promise<number> {
  try {
    const storedTemplates = await getActiveTemplates(orgId);
    let loadedCount = 0;

    for (const stored of storedTemplates) {
      // Skip if a built-in template already exists with this ID
      const existing = templateRegistry.get(stored.templateId);
      if (existing?.isBuiltIn) {
        console.log(
          `[TemplateRegistry] Skipping DB template "${stored.templateId}" - built-in exists`
        );
        continue;
      }

      // Convert and register
      const template = storedTemplateToConversationTemplate(stored);
      templateRegistry.register(template, stored.priority, stored.enabled);
      loadedCount++;
    }

    if (loadedCount > 0) {
      console.log(
        `[TemplateRegistry] Loaded ${loadedCount} templates from org ${orgId}`
      );
    }

    return loadedCount;
  } catch (error) {
    console.error(
      `[TemplateRegistry] Failed to load templates for org ${orgId}:`,
      error
    );
    return 0;
  }
}

/**
 * Get all templates including org-specific ones
 *
 * This combines built-in templates with database templates for an organization.
 */
export async function getAllTemplatesWithOrg(
  orgId: string,
  options?: TemplateQueryOptions
): Promise<ConversationTemplate[]> {
  // Load org templates first
  await loadOrgTemplates(orgId);

  // Then get all templates from registry
  return templateRegistry.getAll(options);
}

/**
 * Unload organization templates from the registry
 *
 * Call this when switching organizations or cleaning up.
 */
export function unloadOrgTemplates(): void {
  // Remove all non-built-in templates
  const toRemove: string[] = [];

  // Access the private templates map via type assertion
  const registry = templateRegistry as unknown as {
    templates: Map<string, { template: ConversationTemplate }>;
  };

  for (const [id, registration] of registry.templates.entries()) {
    if (!registration.template.isBuiltIn) {
      toRemove.push(id);
    }
  }

  for (const id of toRemove) {
    templateRegistry.unregister(id);
  }

  if (toRemove.length > 0) {
    console.log(
      `[TemplateRegistry] Unloaded ${toRemove.length} organization templates`
    );
  }
}
