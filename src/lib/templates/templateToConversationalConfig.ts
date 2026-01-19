/**
 * Template to ConversationalFormConfig Adapter
 *
 * Converts a FormTemplate to a ConversationalFormConfig for use with
 * the ConversationalFormChat component, enabling AI-powered conversational
 * form filling demonstrations.
 */

import { FormTemplate } from '@/types/formTemplate';
import { FieldConfig } from '@/types/form';
import {
  ConversationalFormConfig,
  ConversationTopic,
  ExtractionSchema,
  ConversationPersona,
} from '@/types/conversational';

/**
 * Map field types to extraction schema types
 */
function mapFieldTypeToExtractionType(
  fieldType: string
): ExtractionSchema['type'] {
  switch (fieldType) {
    case 'number':
    case 'currency':
    case 'slider':
    case 'rating':
      return 'number';
    case 'checkbox':
    case 'toggle':
      return 'boolean';
    case 'select':
    case 'radio':
      return 'enum';
    case 'multiselect':
    case 'checkboxGroup':
    case 'tags':
      return 'array';
    case 'file':
    case 'fileUpload':
    case 'image':
      return 'file';
    default:
      return 'string';
  }
}

/**
 * Convert field to conversation topic
 */
function fieldToTopic(field: FieldConfig, index: number): ConversationTopic {
  // Determine priority based on required status
  const priority: ConversationTopic['priority'] = field.required
    ? 'required'
    : index < 5
      ? 'important'
      : 'optional';

  // Determine depth based on field type
  let depth: ConversationTopic['depth'] = 'surface';
  if (field.type === 'textarea' || field.type === 'richText') {
    depth = 'moderate';
  }

  return {
    id: field.path,
    name: field.label,
    description: field.placeholder || `Collect the ${field.label.toLowerCase()}`,
    priority,
    depth,
    extractionField: field.path,
  };
}

/**
 * Convert field to extraction schema
 */
function fieldToExtractionSchema(field: FieldConfig): ExtractionSchema {
  const type = mapFieldTypeToExtractionType(field.type);

  // Get options for enum types
  const options =
    type === 'enum' && field.validation?.options
      ? field.validation.options.map((opt) =>
          typeof opt === 'string' ? opt : opt.value.toString()
        )
      : undefined;

  return {
    field: field.path,
    type,
    required: field.required ?? false,
    description: field.placeholder || field.label,
    options,
    validation: field.validation
      ? {
          minLength: field.validation.minLength,
          maxLength: field.validation.maxLength,
          min: field.validation.min,
          max: field.validation.max,
          pattern: field.validation.pattern,
        }
      : undefined,
    topicId: field.path,
  };
}

/**
 * Generate a persona style based on the template category
 */
function getPersonaForCategory(
  category: FormTemplate['category']
): ConversationPersona {
  const categoryPersonas: Record<string, ConversationPersona> = {
    'healthcare-wellness': {
      style: 'empathetic',
      tone: 'warm, caring, and reassuring',
      behaviors: [
        'Be patient and understanding',
        'Use clear, non-technical language',
        'Acknowledge any concerns',
      ],
    },
    'customer-service': {
      style: 'friendly',
      tone: 'helpful, patient, and solution-oriented',
      behaviors: [
        'Focus on resolving issues',
        'Show empathy for frustrations',
        'Provide clear next steps',
      ],
    },
    'technology-it': {
      style: 'professional',
      tone: 'knowledgeable, clear, and efficient',
      behaviors: [
        'Ask clarifying technical questions',
        'Use appropriate technical terms',
        'Focus on troubleshooting',
      ],
    },
    'legal-compliance': {
      style: 'professional',
      tone: 'precise, thorough, and formal',
      behaviors: [
        'Be thorough with details',
        'Use clear, unambiguous language',
        'Document everything accurately',
      ],
    },
    'hr-recruitment': {
      style: 'friendly',
      tone: 'welcoming, professional, and encouraging',
      behaviors: [
        'Make candidates feel comfortable',
        'Ask follow-up questions naturally',
        'Be positive and supportive',
      ],
    },
    'education-training': {
      style: 'friendly',
      tone: 'encouraging, patient, and supportive',
      behaviors: [
        'Be welcoming to learners',
        'Use clear explanations',
        'Encourage questions',
      ],
    },
    'finance-accounting': {
      style: 'professional',
      tone: 'precise, detail-oriented, and trustworthy',
      behaviors: [
        'Be accurate with numbers',
        'Explain financial terms',
        'Maintain confidentiality',
      ],
    },
    default: {
      style: 'friendly',
      tone: 'helpful, conversational, and efficient',
      behaviors: [
        'Keep the conversation flowing naturally',
        'Ask one question at a time',
        'Confirm important information',
      ],
    },
  };

  return categoryPersonas[category] || categoryPersonas.default;
}

/**
 * Convert a FormTemplate to a ConversationalFormConfig for demo purposes
 */
export function templateToConversationalConfig(
  template: FormTemplate
): ConversationalFormConfig {
  // If template already has a conversational config, use it
  if (template.conversationalConfig) {
    return template.conversationalConfig;
  }

  // Filter to only data fields (exclude section headers, dividers, etc.)
  const dataFields = template.fieldConfigs.filter(
    (f) =>
      f.included &&
      !['sectionHeader', 'section-header', 'divider', 'spacer', 'description'].includes(
        f.type
      )
  );

  // Convert fields to topics and extraction schema
  const topics = dataFields.map(fieldToTopic);
  const extractionSchema = dataFields.map(fieldToExtractionSchema);

  // Get persona based on category
  const persona = getPersonaForCategory(template.category);

  // Generate objective based on template
  const objective = `I'll help you complete the ${template.name} form through a friendly conversation. I'll ask you questions one at a time to gather the information we need.`;

  // Context about the form
  const context = template.fullDescription || template.shortDescription;

  // Calculate reasonable limits based on field count
  const maxTurns = Math.max(10, Math.min(25, dataFields.length * 2 + 5));

  const config: ConversationalFormConfig = {
    formType: 'conversational',
    templateId: template.id,
    objective,
    context,
    persona,
    topics,
    extractionSchema,
    conversationLimits: {
      maxTurns,
      maxDuration: 15, // 15 minutes max
      minConfidence: 0.7,
    },
  };

  return config;
}

/**
 * Create a demo-specific config with adjusted settings for preview
 */
export function templateToDemoConversationalConfig(
  template: FormTemplate
): ConversationalFormConfig {
  const config = templateToConversationalConfig(template);

  // Adjust for demo purposes - shorter limits, more relaxed confidence
  return {
    ...config,
    objective: `Welcome! I'm here to show you how NetPad's conversational forms work. Let's walk through the "${template.name}" form together - just chat with me naturally!`,
    conversationLimits: {
      maxTurns: 15, // Shorter for demo
      maxDuration: 10, // 10 minutes for demo
      minConfidence: 0.6, // More relaxed for demo
    },
  };
}
