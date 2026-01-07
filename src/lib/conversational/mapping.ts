/**
 * Data Mapping Utilities for Conversational Forms
 * 
 * Maps extracted data from conversations to form field structure
 * with flexible matching strategies.
 */

import { ExtractionSchema } from '@/types/conversational';
import { FieldConfig } from '@/types/form';

/**
 * Convert string to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '')
    .replace(/[-_]/g, '');
}

/**
 * Convert string to snake_case
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/[- ]/g, '_')
    .replace(/^_/, '');
}

/**
 * Find matching form field for extraction schema field
 * Uses multiple matching strategies:
 * 1. Exact match (field === path)
 * 2. Case-insensitive match
 * 3. CamelCase conversion
 * 4. Snake_case conversion
 */
function findMatchingFormField(
  extractionField: string,
  formFieldConfigs: FieldConfig[]
): FieldConfig | null {
  // Strategy 1: Exact match
  let match = formFieldConfigs.find(f => f.path === extractionField);
  if (match) return match;

  // Strategy 2: Case-insensitive match
  const extractionFieldLower = extractionField.toLowerCase();
  match = formFieldConfigs.find(f => f.path.toLowerCase() === extractionFieldLower);
  if (match) return match;

  // Strategy 3: CamelCase conversion
  const camelCase = toCamelCase(extractionField);
  match = formFieldConfigs.find(f => f.path === camelCase);
  if (match) return match;

  // Strategy 4: Snake_case conversion
  const snakeCase = toSnakeCase(extractionField);
  match = formFieldConfigs.find(f => f.path === snakeCase);
  if (match) return match;

  // Also try matching against field label (case-insensitive)
  match = formFieldConfigs.find(f => 
    f.label?.toLowerCase() === extractionFieldLower ||
    f.label?.toLowerCase().replace(/\s+/g, '') === extractionFieldLower.replace(/\s+/g, '')
  );
  if (match) return match;

  return null;
}

/**
 * Set nested value in object using dot notation path
 */
function setNestedValue(obj: Record<string, any>, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  let target = obj;

  for (const key of keys) {
    if (!target[key] || typeof target[key] !== 'object') {
      target[key] = {};
    }
    target = target[key];
  }

  target[lastKey] = value;
}

/**
 * Map extracted data from conversation to form field structure
 * 
 * @param extractedData - Data extracted from conversation
 * @param extractionSchema - Schema used for extraction
 * @param formFieldConfigs - Form field configurations
 * @returns Mapped data with _unmappedFields for fields that couldn't be matched
 */
export function mapExtractedDataToFormFields(
  extractedData: Record<string, any>,
  extractionSchema: ExtractionSchema[],
  formFieldConfigs: FieldConfig[]
): {
  mappedData: Record<string, any>;
  unmappedFields: Record<string, any>;
  mappingReport: Array<{
    extractionField: string;
    formFieldPath: string | null;
    matched: boolean;
    strategy?: string;
  }>;
} {
  const mappedData: Record<string, any> = {};
  const unmappedFields: Record<string, any> = {};
  const mappingReport: Array<{
    extractionField: string;
    formFieldPath: string | null;
    matched: boolean;
    strategy?: string;
  }> = [];

  for (const schemaField of extractionSchema) {
    const extractionField = schemaField.field;
    const value = extractedData[extractionField];

    // Skip if value is undefined or null
    if (value === undefined || value === null) {
      continue;
    }

    // Find matching form field
    const formField = findMatchingFormField(extractionField, formFieldConfigs);

    if (formField) {
      // Map to form field path (supports nested paths)
      setNestedValue(mappedData, formField.path, value);
      
      mappingReport.push({
        extractionField,
        formFieldPath: formField.path,
        matched: true,
        strategy: formField.path === extractionField 
          ? 'exact' 
          : formField.path.toLowerCase() === extractionField.toLowerCase()
          ? 'case-insensitive'
          : formField.path === toCamelCase(extractionField) || formField.path === toSnakeCase(extractionField)
          ? 'case-conversion'
          : 'label-match',
      });
    } else {
      // Store in unmapped fields
      unmappedFields[extractionField] = value;
      
      mappingReport.push({
        extractionField,
        formFieldPath: null,
        matched: false,
      });
    }
  }

  // Add unmapped fields to mapped data if any
  if (Object.keys(unmappedFields).length > 0) {
    mappedData._unmappedFields = unmappedFields;
  }

  return {
    mappedData,
    unmappedFields,
    mappingReport,
  };
}

/**
 * Validate mapped data against form field requirements
 * 
 * @param mappedData - Mapped form data
 * @param formFieldConfigs - Form field configurations
 * @returns Validation warnings for missing required fields
 */
export function validateMappedData(
  mappedData: Record<string, any>,
  formFieldConfigs: FieldConfig[]
): {
  warnings: string[];
  missingRequiredFields: string[];
} {
  const warnings: string[] = [];
  const missingRequiredFields: string[] = [];

  for (const field of formFieldConfigs) {
    if (!field.required || field.included === false) {
      continue;
    }

    // Check if field is present in mapped data
    const keys = field.path.split('.');
    let value: any = mappedData;
    
    for (const key of keys) {
      if (value === undefined || value === null || typeof value !== 'object') {
        value = undefined;
        break;
      }
      value = value[key];
    }

    // Check if value is missing or empty
    if (value === undefined || value === null || (typeof value === 'string' && value === '')) {
      missingRequiredFields.push(field.path);
      warnings.push(`Required field '${field.label || field.path}' is missing`);
    }
  }

  return {
    warnings,
    missingRequiredFields,
  };
}
