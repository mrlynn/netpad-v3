/**
 * AI Form Generator Service
 *
 * Generates form configurations from natural language descriptions using OpenAI.
 */

import OpenAI from 'openai';
import { FormConfiguration, FieldConfig } from '@/types/form';
import { QuestionTypeId } from '@/types/questionTypes';
import {
  GenerateFormRequest,
  GenerateFormResponse,
  FieldSuggestionRequest,
  FieldSuggestionResponse,
  FieldSuggestion,
  AIServiceConfig,
  AIGenerationMetadata,
} from './types';
import {
  SYSTEM_PROMPTS,
  buildFormGenerationPrompt,
  buildFieldSuggestionPrompt,
  suggestFieldType,
} from './prompts';
import { sortFieldsByPriority } from './fieldOrdering';

// ============================================
// Service Configuration
// ============================================

const DEFAULT_CONFIG: Partial<AIServiceConfig> = {
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 4000,
};

// ============================================
// Form Generator Class
// ============================================

export class FormGenerator {
  private client: OpenAI;
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
    });
  }

  /**
   * Generate a form from a natural language description
   */
  async generateForm(request: GenerateFormRequest): Promise<GenerateFormResponse> {
    try {
      const prompt = buildFormGenerationPrompt(request.prompt, {
        industry: request.context?.industry,
        audience: request.context?.audience,
        schema: request.context?.schema,
        maxFields: request.options?.maxFields,
      });

      const completion = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.formGenerator },
          { role: 'user', content: prompt },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        return {
          success: false,
          confidence: 0,
          error: 'No response from AI model',
        };
      }

      // Parse the generated form
      const generatedForm = JSON.parse(responseText);

      // Validate and normalize the form configuration
      const normalizedForm = this.normalizeFormConfiguration(generatedForm);

      // Add AI generation metadata
      const metadata: AIGenerationMetadata = {
        generatedFrom: 'natural_language',
        provider: 'openai',
        model: this.config.model || 'gpt-4o-mini',
        promptUsed: request.prompt,
        generatedAt: new Date().toISOString(),
        confidence: this.calculateConfidence(normalizedForm),
      };

      return {
        success: true,
        form: {
          ...normalizedForm,
          // Store metadata in a way that doesn't break the type
        },
        confidence: metadata.confidence,
        suggestions: this.generateSuggestions(normalizedForm),
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('Form generation error:', error);
      return {
        success: false,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error during form generation',
      };
    }
  }

  /**
   * Generate form from MongoDB schema
   */
  async generateFromSchema(
    schema: Record<string, any>,
    options?: {
      formName?: string;
      includeAllFields?: boolean;
    }
  ): Promise<GenerateFormResponse> {
    const prompt = `Generate a form configuration from this MongoDB collection schema:

${JSON.stringify(schema, null, 2)}

${options?.formName ? `Form name: ${options.formName}` : ''}
${options?.includeAllFields ? 'Include all fields from the schema.' : 'Include only commonly used fields.'}

Create appropriate labels, field types, and validation based on the schema field names and types.`;

    return this.generateForm({
      prompt,
      context: { schema },
      options: {
        includeValidation: true,
      },
    });
  }

  /**
   * Suggest additional fields for an existing form
   */
  async suggestFields(request: FieldSuggestionRequest): Promise<FieldSuggestionResponse> {
    try {
      const currentFields = (request.currentForm.fieldConfigs || []).map((f) => ({
        path: f.path,
        label: f.label,
        type: f.type,
      }));

      const prompt = buildFieldSuggestionPrompt(
        currentFields,
        {
          name: request.currentForm.name,
          description: request.currentForm.description,
        },
        request.limit || 5
      );

      const completion = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.fieldSuggester },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        return {
          success: false,
          suggestions: [],
          error: 'No response from AI model',
        };
      }

      const parsed = JSON.parse(responseText);
      const suggestions: FieldSuggestion[] = (parsed.suggestions || []).map((s: any) =>
        this.normalizeFieldSuggestion(s)
      );

      return {
        success: true,
        suggestions,
      };
    } catch (error) {
      console.error('Field suggestion error:', error);
      return {
        success: false,
        suggestions: [],
        error: error instanceof Error ? error.message : 'Unknown error during field suggestion',
      };
    }
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Normalize and validate the generated form configuration
   */
  private normalizeFormConfiguration(generated: any): Partial<FormConfiguration> {
    const form: Partial<FormConfiguration> = {
      name: generated.name || 'Generated Form',
      description: generated.description || '',
      collection: generated.collection || 'submissions',
      database: generated.database || 'formbuilder',
      fieldConfigs: [],
    };

    // Normalize each field
    if (Array.isArray(generated.fieldConfigs)) {
      form.fieldConfigs = generated.fieldConfigs.map((field: any) =>
        this.normalizeFieldConfig(field)
      );
    } else if (Array.isArray(generated.fields)) {
      // Handle alternate schema format
      form.fieldConfigs = generated.fields.map((field: any) => this.normalizeFieldConfig(field));
    }

    // Sort fields by priority (contact info first, metadata last)
    if (form.fieldConfigs && form.fieldConfigs.length > 0) {
      form.fieldConfigs = sortFieldsByPriority(form.fieldConfigs);
    }

    return form;
  }

  /**
   * Normalize a single field configuration
   */
  private normalizeFieldConfig(field: any): FieldConfig {
    // Map common AI-generated type names to our type system
    const typeMapping: Record<string, QuestionTypeId> = {
      text: 'short_text',
      string: 'short_text',
      textarea: 'long_text',
      paragraph: 'long_text',
      int: 'number',
      integer: 'number',
      float: 'number',
      decimal: 'number',
      boolean: 'yes_no',
      bool: 'yes_no',
      radio: 'multiple_choice',
      select: 'dropdown',
      multi_select: 'checkboxes',
      multiselect: 'checkboxes',
      star_rating: 'rating',
      stars: 'rating',
      likert: 'scale',
      file: 'file_upload',
      upload: 'file_upload',
      image: 'image_upload',
      photo: 'image_upload',
    };

    let fieldType = field.type?.toLowerCase() || 'short_text';
    if (typeMapping[fieldType]) {
      fieldType = typeMapping[fieldType];
    }

    // If type is still not valid, try to infer from field name
    if (!this.isValidFieldType(fieldType)) {
      fieldType = suggestFieldType(field.label || field.path || '');
    }

    const normalized: FieldConfig = {
      path: field.path || field.name || this.generateFieldPath(field.label),
      label: field.label || field.name || 'Untitled Field',
      type: fieldType,
      included: true,
      required: field.required ?? false,
      placeholder: field.placeholder,
      defaultValue: field.defaultValue,
      source: 'custom',
      includeInDocument: true,
    };

    // Add validation if present
    if (field.validation) {
      normalized.validation = {
        min: field.validation.min,
        max: field.validation.max,
        minLength: field.validation.minLength,
        maxLength: field.validation.maxLength,
        pattern: field.validation.pattern,
      };
    }

    // Add conditional logic if present
    if (field.conditionalLogic) {
      normalized.conditionalLogic = field.conditionalLogic;
    }

    return normalized;
  }

  /**
   * Normalize a field suggestion from AI response
   */
  private normalizeFieldSuggestion(suggestion: any): FieldSuggestion {
    return {
      field: this.normalizeFieldConfig(suggestion.field || suggestion),
      reason: suggestion.reason || 'Commonly used in similar forms',
      confidence: suggestion.confidence ?? 0.7,
      popularity: suggestion.popularity,
    };
  }

  /**
   * Check if a field type is valid
   */
  private isValidFieldType(type: string): boolean {
    const validTypes: QuestionTypeId[] = [
      'short_text',
      'long_text',
      'number',
      'email',
      'phone',
      'url',
      'multiple_choice',
      'checkboxes',
      'dropdown',
      'yes_no',
      'rating',
      'scale',
      'slider',
      'nps',
      'date',
      'time',
      'datetime',
      'file_upload',
      'image_upload',
      'signature',
      'matrix',
      'ranking',
      'address',
      'tags',
      'color_picker',
      'payment',
      'opinion_scale',
    ];
    return validTypes.includes(type as QuestionTypeId);
  }

  /**
   * Generate a field path from a label
   */
  private generateFieldPath(label: string): string {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Calculate confidence score for generated form
   */
  private calculateConfidence(form: Partial<FormConfiguration>): number {
    let score = 0.5; // Base score

    // More fields = higher confidence (up to a point)
    const fieldCount = form.fieldConfigs?.length || 0;
    if (fieldCount >= 3 && fieldCount <= 20) {
      score += 0.2;
    } else if (fieldCount > 0) {
      score += 0.1;
    }

    // Has name and description
    if (form.name && form.name !== 'Generated Form') {
      score += 0.1;
    }
    if (form.description) {
      score += 0.1;
    }

    // All fields have labels
    const allHaveLabels = form.fieldConfigs?.every((f) => f.label) ?? false;
    if (allHaveLabels) {
      score += 0.1;
    }

    return Math.min(score, 1);
  }

  /**
   * Generate suggestions for improving the form
   */
  private generateSuggestions(form: Partial<FormConfiguration>): string[] {
    const suggestions: string[] = [];

    const fields = form.fieldConfigs || [];

    // Check for email field without validation
    const emailFields = fields.filter((f) => f.type === 'email');
    if (emailFields.length === 0 && fields.length > 3) {
      suggestions.push('Consider adding an email field for follow-up communication.');
    }

    // Check for long forms without sections
    if (fields.length > 10) {
      suggestions.push(
        'This form has many fields. Consider organizing them into sections using layout fields.'
      );
    }

    // Check for all required fields
    const requiredCount = fields.filter((f) => f.required).length;
    if (requiredCount === fields.length && fields.length > 5) {
      suggestions.push('Consider making some fields optional to reduce form abandonment.');
    }

    // Check for missing placeholders on text fields
    const textFieldsWithoutPlaceholder = fields.filter(
      (f) => ['short_text', 'long_text', 'email', 'phone'].includes(f.type) && !f.placeholder
    );
    if (textFieldsWithoutPlaceholder.length > 0) {
      suggestions.push('Adding placeholder text to input fields can improve user experience.');
    }

    return suggestions;
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a FormGenerator instance with default configuration
 */
export function createFormGenerator(apiKey?: string): FormGenerator {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
  }

  return new FormGenerator({ apiKey: key });
}
