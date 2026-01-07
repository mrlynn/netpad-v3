/**
 * Data Extraction Pipeline for Conversational Forms
 * 
 * Extracts structured data from conversations using AI-based extraction
 * with confidence scoring and validation.
 */

import { Message } from '@/lib/ai/providers/base';
import { ExtractionSchema, ExtractedData } from '@/lib/ai/providers/base';
import { createDefaultProvider } from '@/lib/ai/providers';
import { ConversationState } from '@/types/conversational';

/**
 * Extract structured data from a conversation
 * 
 * Uses the LLM provider to extract structured data based on the extraction schema.
 * Includes confidence scoring and validation.
 */
export async function extractDataFromConversation(
  conversation: Message[],
  schema: ExtractionSchema[]
): Promise<ExtractedData> {
  const provider = createDefaultProvider();
  if (!provider) {
    throw new Error('AI provider is not configured');
  }

  // Use provider's extraction method
  return await provider.extractStructuredData(conversation, schema);
}

/**
 * Extract data from conversation state
 * 
 * Convenience function that extracts from ConversationState
 */
export async function extractDataFromState(
  state: ConversationState,
  schema: ExtractionSchema[]
): Promise<ExtractedData> {
  return await extractDataFromConversation(state.messages, schema);
}

/**
 * Validate extracted data against schema
 * 
 * Checks that required fields are present and values match validation rules
 */
export function validateExtractedData(
  extracted: ExtractedData,
  schema: ExtractionSchema[]
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  for (const fieldSchema of schema) {
    if (fieldSchema.required) {
      const value = extracted.data[fieldSchema.field];
      if (value === undefined || value === null || value === '') {
        errors.push(`Required field '${fieldSchema.field}' is missing`);
      }
    }
  }

  // Validate field values
  for (const fieldSchema of schema) {
    const value = extracted.data[fieldSchema.field];
    if (value === undefined || value === null) {
      continue; // Skip missing optional fields
    }

    // Type validation
    switch (fieldSchema.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`Field '${fieldSchema.field}' must be a string`);
        } else {
          // String validation rules
          if (fieldSchema.validation) {
            if (fieldSchema.validation.minLength && value.length < fieldSchema.validation.minLength) {
              errors.push(
                `Field '${fieldSchema.field}' must be at least ${fieldSchema.validation.minLength} characters`
              );
            }
            if (fieldSchema.validation.maxLength && value.length > fieldSchema.validation.maxLength) {
              errors.push(
                `Field '${fieldSchema.field}' must be at most ${fieldSchema.validation.maxLength} characters`
              );
            }
            if (fieldSchema.validation.pattern) {
              const regex = new RegExp(fieldSchema.validation.pattern);
              if (!regex.test(value)) {
                errors.push(`Field '${fieldSchema.field}' does not match required pattern`);
              }
            }
          }
        }
        break;

      case 'number':
        if (typeof value !== 'number') {
          errors.push(`Field '${fieldSchema.field}' must be a number`);
        } else {
          // Number validation rules
          if (fieldSchema.validation) {
            if (fieldSchema.validation.min !== undefined && value < fieldSchema.validation.min) {
              errors.push(
                `Field '${fieldSchema.field}' must be at least ${fieldSchema.validation.min}`
              );
            }
            if (fieldSchema.validation.max !== undefined && value > fieldSchema.validation.max) {
              errors.push(
                `Field '${fieldSchema.field}' must be at most ${fieldSchema.validation.max}`
              );
            }
          }
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Field '${fieldSchema.field}' must be a boolean`);
        }
        break;

      case 'enum':
        if (!fieldSchema.options) {
          errors.push(`Field '${fieldSchema.field}' is enum type but has no options defined`);
        } else if (!fieldSchema.options.includes(value)) {
          errors.push(
            `Field '${fieldSchema.field}' must be one of: ${fieldSchema.options.join(', ')}`
          );
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`Field '${fieldSchema.field}' must be an array`);
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push(`Field '${fieldSchema.field}' must be an object`);
        }
        break;
    }

    // Confidence warnings
    const confidence = extracted.confidence[fieldSchema.field];
    if (confidence !== undefined && confidence < 0.7) {
      warnings.push(
        `Low confidence (${Math.round(confidence * 100)}%) for field '${fieldSchema.field}'`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [...warnings, ...(extracted.warnings || [])],
  };
}

/**
 * Calculate overall confidence from field confidences
 * 
 * Uses weighted average based on field importance (required fields weighted higher)
 */
export function calculateOverallConfidence(
  fieldConfidences: Record<string, number>,
  schema: ExtractionSchema[]
): number {
  if (Object.keys(fieldConfidences).length === 0) {
    return 0;
  }

  let totalWeight = 0;
  let weightedSum = 0;

  for (const fieldSchema of schema) {
    const confidence = fieldConfidences[fieldSchema.field];
    if (confidence !== undefined) {
      // Required fields have weight 2, optional fields have weight 1
      const weight = fieldSchema.required ? 2 : 1;
      weightedSum += confidence * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Merge partial extractions with new extraction
 * 
 * Combines partial extractions from conversation state with final extraction,
 * preferring higher confidence values
 */
export function mergeExtractions(
  partialExtractions: Record<string, any>,
  finalExtraction: ExtractedData
): ExtractedData {
  const merged: Record<string, any> = { ...partialExtractions };
  const mergedConfidence: Record<string, number> = {};

  // Add final extraction values (they override partials)
  for (const [field, value] of Object.entries(finalExtraction.data)) {
    merged[field] = value;
    mergedConfidence[field] = finalExtraction.confidence[field] || 0.5;
  }

  // Keep partial extractions that weren't in final extraction
  for (const [field, value] of Object.entries(partialExtractions)) {
    if (!(field in finalExtraction.data)) {
      merged[field] = value;
      // Lower confidence for partials
      mergedConfidence[field] = 0.5;
    }
  }

  // Calculate overall confidence
  const overallConfidence = Object.values(mergedConfidence).length > 0
    ? Object.values(mergedConfidence).reduce((a, b) => a + b, 0) / Object.values(mergedConfidence).length
    : 0;

  return {
    data: merged,
    confidence: mergedConfidence,
    overallConfidence,
    missingFields: finalExtraction.missingFields,
    warnings: finalExtraction.warnings,
  };
}
