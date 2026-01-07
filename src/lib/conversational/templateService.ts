/**
 * Conversational Template Service
 *
 * Business logic for managing conversational form templates.
 * Handles CRUD operations, cloning, and template validation.
 */

import { nanoid } from 'nanoid';
import { getConversationalTemplatesCollection } from '@/lib/platform/db';
import {
  StoredTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateListItem,
  StoredTemplateQueryOptions,
  CloneTemplateResult,
  TemplateCategory,
  TemplateStatus,
} from '@/types/conversational';

/**
 * Generate a unique template ID
 */
function generateTemplateId(): string {
  return `tpl_${nanoid(12)}`;
}

/**
 * Create a new conversational template
 */
export async function createTemplate(
  orgId: string,
  userId: string,
  request: CreateTemplateRequest
): Promise<StoredTemplate> {
  const collection = await getConversationalTemplatesCollection(orgId);

  const now = new Date();
  const template: StoredTemplate = {
    templateId: generateTemplateId(),
    organizationId: orgId,
    name: request.name,
    description: request.description,
    category: request.category,
    icon: request.icon,
    version: '1.0.0',
    status: 'draft',
    scope: request.scope || 'organization',
    priority: request.priority ?? 50,
    enabled: true,
    promptConfig: request.promptConfig,
    defaultConfig: request.defaultConfig,
    topics: request.topics,
    extractionSchema: request.extractionSchema,
    metadata: {
      previewDescription: request.metadata?.previewDescription,
      useCases: request.metadata?.useCases || [],
      tags: request.metadata?.tags || [],
      estimatedDuration: request.metadata?.estimatedDuration,
      author: request.metadata?.author || 'Organization',
    },
    createdBy: userId,
    createdAt: now,
    updatedBy: userId,
    updatedAt: now,
  };

  await collection.insertOne(template);

  console.log(
    `[TemplateService] Created template ${template.templateId} for org ${orgId}`
  );

  return template;
}

/**
 * Get a template by ID
 */
export async function getTemplate(
  orgId: string,
  templateId: string
): Promise<StoredTemplate | null> {
  const collection = await getConversationalTemplatesCollection(orgId);

  const template = await collection.findOne({
    templateId,
    organizationId: orgId,
  });

  return template;
}

/**
 * List templates with filtering and pagination
 */
export async function listTemplates(
  orgId: string,
  options: StoredTemplateQueryOptions = {}
): Promise<{ templates: TemplateListItem[]; total: number }> {
  const collection = await getConversationalTemplatesCollection(orgId);

  // Build query filter
  const filter: Record<string, unknown> = {
    organizationId: orgId,
  };

  if (options.category) {
    filter.category = options.category;
  }

  if (options.status) {
    filter.status = options.status;
  }

  if (options.scope) {
    filter.scope = options.scope;
  }

  if (!options.includeDisabled) {
    filter.enabled = true;
  }

  if (options.tags && options.tags.length > 0) {
    filter['metadata.tags'] = { $in: options.tags };
  }

  if (options.search) {
    filter.$text = { $search: options.search };
  }

  // Build sort
  const sortField = options.sortBy || 'priority';
  const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
  const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

  // Get total count
  const total = await collection.countDocuments(filter);

  // Get paginated results
  const offset = options.offset || 0;
  const limit = options.limit || 50;

  const templates = await collection
    .find(filter)
    .sort(sort)
    .skip(offset)
    .limit(limit)
    .toArray();

  // Map to list items
  const listItems: TemplateListItem[] = templates.map((t) => ({
    templateId: t.templateId,
    name: t.name,
    description: t.description,
    category: t.category,
    icon: t.icon,
    status: t.status,
    scope: t.scope,
    enabled: t.enabled,
    priority: t.priority,
    topicCount: t.topics.length,
    fieldCount: t.extractionSchema.length,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    createdBy: t.createdBy,
  }));

  return { templates: listItems, total };
}

/**
 * Update a template
 */
export async function updateTemplate(
  orgId: string,
  templateId: string,
  userId: string,
  updates: UpdateTemplateRequest
): Promise<StoredTemplate | null> {
  const collection = await getConversationalTemplatesCollection(orgId);

  // Build update document
  const updateDoc: Record<string, unknown> = {
    updatedBy: userId,
    updatedAt: new Date(),
  };

  if (updates.name !== undefined) updateDoc.name = updates.name;
  if (updates.description !== undefined)
    updateDoc.description = updates.description;
  if (updates.category !== undefined) updateDoc.category = updates.category;
  if (updates.icon !== undefined) updateDoc.icon = updates.icon;
  if (updates.status !== undefined) updateDoc.status = updates.status;
  if (updates.priority !== undefined) updateDoc.priority = updates.priority;
  if (updates.enabled !== undefined) updateDoc.enabled = updates.enabled;
  if (updates.promptConfig !== undefined)
    updateDoc.promptConfig = updates.promptConfig;
  if (updates.defaultConfig !== undefined)
    updateDoc.defaultConfig = updates.defaultConfig;
  if (updates.topics !== undefined) updateDoc.topics = updates.topics;
  if (updates.extractionSchema !== undefined)
    updateDoc.extractionSchema = updates.extractionSchema;
  if (updates.metadata !== undefined) {
    // Merge metadata instead of replacing
    const existing = await collection.findOne({
      templateId,
      organizationId: orgId,
    });
    if (existing) {
      updateDoc.metadata = { ...existing.metadata, ...updates.metadata };
    }
  }

  const result = await collection.findOneAndUpdate(
    { templateId, organizationId: orgId },
    { $set: updateDoc },
    { returnDocument: 'after' }
  );

  if (result) {
    console.log(
      `[TemplateService] Updated template ${templateId} for org ${orgId}`
    );
  }

  return result;
}

/**
 * Delete a template
 */
export async function deleteTemplate(
  orgId: string,
  templateId: string
): Promise<boolean> {
  const collection = await getConversationalTemplatesCollection(orgId);

  const result = await collection.deleteOne({
    templateId,
    organizationId: orgId,
  });

  if (result.deletedCount > 0) {
    console.log(
      `[TemplateService] Deleted template ${templateId} from org ${orgId}`
    );
    return true;
  }

  return false;
}

/**
 * Clone a template
 */
export async function cloneTemplate(
  orgId: string,
  templateId: string,
  userId: string,
  newName?: string
): Promise<CloneTemplateResult | null> {
  const collection = await getConversationalTemplatesCollection(orgId);

  // Get source template
  const source = await collection.findOne({
    templateId,
    organizationId: orgId,
  });

  if (!source) {
    return null;
  }

  const now = new Date();
  const clonedTemplate: StoredTemplate = {
    ...source,
    templateId: generateTemplateId(),
    name: newName || `${source.name} (Copy)`,
    status: 'draft',
    clonedFrom: templateId,
    createdBy: userId,
    createdAt: now,
    updatedBy: userId,
    updatedAt: now,
  };

  await collection.insertOne(clonedTemplate);

  console.log(
    `[TemplateService] Cloned template ${templateId} to ${clonedTemplate.templateId} for org ${orgId}`
  );

  return {
    template: clonedTemplate,
    sourceTemplateId: templateId,
  };
}

/**
 * Publish a template (change status from draft to published)
 */
export async function publishTemplate(
  orgId: string,
  templateId: string,
  userId: string
): Promise<StoredTemplate | null> {
  return updateTemplate(orgId, templateId, userId, { status: 'published' });
}

/**
 * Archive a template
 */
export async function archiveTemplate(
  orgId: string,
  templateId: string,
  userId: string
): Promise<StoredTemplate | null> {
  return updateTemplate(orgId, templateId, userId, {
    status: 'archived',
    enabled: false,
  });
}

/**
 * Get templates for use in form builder (enabled, published only)
 */
export async function getActiveTemplates(
  orgId: string
): Promise<StoredTemplate[]> {
  const collection = await getConversationalTemplatesCollection(orgId);

  const templates = await collection
    .find({
      organizationId: orgId,
      status: 'published',
      enabled: true,
    })
    .sort({ priority: -1 })
    .toArray();

  return templates;
}

/**
 * Validate template data before save
 */
export function validateTemplate(
  request: CreateTemplateRequest | UpdateTemplateRequest
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // For create requests, name and description are required
  if ('name' in request && request.name !== undefined) {
    if (!request.name || request.name.trim().length === 0) {
      errors.push('Name is required');
    }
    if (request.name && request.name.length > 100) {
      errors.push('Name must be 100 characters or less');
    }
  }

  if ('description' in request && request.description !== undefined) {
    if (request.description && request.description.length > 500) {
      errors.push('Description must be 500 characters or less');
    }
  }

  // Validate topics if provided
  if ('topics' in request && request.topics) {
    if (request.topics.length === 0) {
      errors.push('At least one topic is required');
    }

    const topicIds = new Set<string>();
    for (const topic of request.topics) {
      if (!topic.id || !topic.name) {
        errors.push('Each topic must have an id and name');
      }
      if (topicIds.has(topic.id)) {
        errors.push(`Duplicate topic ID: ${topic.id}`);
      }
      topicIds.add(topic.id);
    }
  }

  // Validate extraction schema if provided
  if ('extractionSchema' in request && request.extractionSchema) {
    const fieldNames = new Set<string>();
    for (const field of request.extractionSchema) {
      if (!field.field || !field.type) {
        errors.push('Each extraction field must have a field name and type');
      }
      if (fieldNames.has(field.field)) {
        errors.push(`Duplicate field name: ${field.field}`);
      }
      fieldNames.add(field.field);
    }
  }

  // Validate prompt config if provided
  if ('promptConfig' in request && request.promptConfig) {
    const validStrategies = ['default', 'it-helpdesk', 'custom'];
    if (!validStrategies.includes(request.promptConfig.strategyType)) {
      errors.push(
        `Invalid strategy type: ${request.promptConfig.strategyType}`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Clone from a built-in template
 *
 * Creates a new custom template based on a built-in template's configuration.
 */
export async function cloneFromBuiltIn(
  orgId: string,
  userId: string,
  builtInTemplateId: string,
  builtInConfig: {
    name: string;
    description: string;
    category: TemplateCategory;
    icon?: string;
    objective: string;
    context?: string;
    persona: {
      style: 'professional' | 'friendly' | 'casual' | 'empathetic' | 'custom';
      tone?: string;
      behaviors?: string[];
      restrictions?: string[];
    };
    conversationLimits: {
      maxTurns: number;
      maxDuration: number;
      minConfidence: number;
    };
    topics: Array<{
      id: string;
      name: string;
      description: string;
      priority: 'required' | 'important' | 'optional';
      depth: 'surface' | 'moderate' | 'deep';
    }>;
    extractionSchema: Array<{
      field: string;
      type: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object';
      required: boolean;
      description: string;
      options?: string[];
    }>;
    metadata?: {
      previewDescription?: string;
      useCases?: string[];
      tags?: string[];
      estimatedDuration?: number;
    };
  },
  newName?: string
): Promise<StoredTemplate> {
  const collection = await getConversationalTemplatesCollection(orgId);

  const now = new Date();
  const template: StoredTemplate = {
    templateId: generateTemplateId(),
    organizationId: orgId,
    name: newName || `${builtInConfig.name} (Copy)`,
    description: builtInConfig.description,
    category: builtInConfig.category,
    icon: builtInConfig.icon,
    version: '1.0.0',
    status: 'draft',
    scope: 'organization',
    priority: 50,
    enabled: true,
    promptConfig: {
      strategyType: 'default',
    },
    defaultConfig: {
      objective: builtInConfig.objective,
      context: builtInConfig.context,
      persona: builtInConfig.persona,
      conversationLimits: builtInConfig.conversationLimits,
    },
    topics: builtInConfig.topics,
    extractionSchema: builtInConfig.extractionSchema,
    metadata: {
      previewDescription: builtInConfig.metadata?.previewDescription,
      useCases: builtInConfig.metadata?.useCases || [],
      tags: builtInConfig.metadata?.tags || [],
      estimatedDuration: builtInConfig.metadata?.estimatedDuration,
      author: 'Cloned from built-in',
    },
    createdBy: userId,
    createdAt: now,
    updatedBy: userId,
    updatedAt: now,
    clonedFrom: `builtin:${builtInTemplateId}`,
  };

  await collection.insertOne(template);

  console.log(
    `[TemplateService] Cloned built-in template ${builtInTemplateId} to ${template.templateId} for org ${orgId}`
  );

  return template;
}

/**
 * Get template categories with counts
 */
export async function getTemplateCategoryCounts(
  orgId: string
): Promise<Record<TemplateCategory, number>> {
  const collection = await getConversationalTemplatesCollection(orgId);

  const pipeline = [
    { $match: { organizationId: orgId, enabled: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ];

  const results = await collection.aggregate(pipeline).toArray();

  const counts: Record<TemplateCategory, number> = {
    support: 0,
    feedback: 0,
    intake: 0,
    application: 0,
    general: 0,
  };

  for (const result of results) {
    const category = result._id as TemplateCategory;
    if (category in counts) {
      counts[category] = result.count;
    }
  }

  return counts;
}
