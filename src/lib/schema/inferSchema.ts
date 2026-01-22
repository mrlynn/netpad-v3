/**
 * Schema Inference Utility
 *
 * Infers JSON Schema from form field configurations.
 * This provides visibility into the data model that forms will create
 * in MongoDB without requiring users to manually define schemas.
 */

import { FieldConfig } from '@/types/form';

// ============================================
// Types
// ============================================

/**
 * JSON Schema property definition
 */
export interface JSONSchemaProperty {
  type: string | string[];
  description?: string;
  format?: string;
  enum?: any[];
  default?: any;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * Full JSON Schema definition
 */
export interface JSONSchema {
  $schema?: string;
  type: string;
  title?: string;
  description?: string;
  properties: Record<string, JSONSchemaProperty>;
  required: string[];
  additionalProperties?: boolean;
}

/**
 * Inferred schema for an application
 */
export interface InferredApplicationSchema {
  version: string;
  generatedAt: string;
  collections: {
    [collectionName: string]: {
      jsonSchema: JSONSchema;
      mongoDBValidation?: object;  // MongoDB JSON Schema validation format
      fieldCount: number;
      sourceFormIds: string[];     // Which forms contribute to this collection
      sourceFormNames: string[];   // Form names for display
    };
  };
  summary: {
    totalCollections: number;
    totalFields: number;
    forms: number;
  };
}

/**
 * Form with minimal fields needed for schema inference
 */
export interface FormForSchema {
  formId?: string;
  id?: string;
  name: string;
  collection?: string;
  database?: string;
  dataSource?: {
    collection?: string;
  };
  fieldConfigs: FieldConfig[];
}

// ============================================
// Field Type Mapping
// ============================================

/**
 * Maps NetPad field types to JSON Schema types
 */
function mapFieldTypeToJSONSchema(fieldType: string): { type: string | string[]; format?: string } {
  const typeMap: Record<string, { type: string | string[]; format?: string }> = {
    // Text types
    'text': { type: 'string' },
    'textarea': { type: 'string' },
    'richtext': { type: 'string' },
    'shorttext': { type: 'string' },
    'longtext': { type: 'string' },

    // Number types
    'number': { type: 'number' },
    'integer': { type: 'integer' },
    'decimal': { type: 'number' },
    'currency': { type: 'number' },
    'percentage': { type: 'number' },
    'rating': { type: 'integer' },
    'scale': { type: 'integer' },
    'slider': { type: 'number' },
    'nps': { type: 'integer' },
    'opinion-scale': { type: 'integer' },

    // Boolean types
    'boolean': { type: 'boolean' },
    'checkbox': { type: 'boolean' },
    'yesno': { type: 'boolean' },
    'switch': { type: 'boolean' },

    // Date/Time types
    'date': { type: 'string', format: 'date' },
    'datetime': { type: 'string', format: 'date-time' },
    'time': { type: 'string', format: 'time' },

    // Contact types
    'email': { type: 'string', format: 'email' },
    'phone': { type: 'string' },
    'url': { type: 'string', format: 'uri' },

    // Selection types (single value)
    'select': { type: 'string' },
    'dropdown': { type: 'string' },
    'radio': { type: 'string' },

    // Selection types (multiple values)
    'multiselect': { type: 'array' },
    'checkboxes': { type: 'array' },
    'tags': { type: 'array' },

    // File types
    'file': { type: ['string', 'object'] },
    'image': { type: ['string', 'object'] },
    'signature': { type: 'string' },

    // Complex types
    'address': { type: 'object' },
    'name': { type: 'object' },
    'object': { type: 'object' },
    'array': { type: 'array' },
    'repeater': { type: 'array' },
    'matrix': { type: 'object' },
    'ranking': { type: 'array' },

    // Special types
    'objectid': { type: 'string' },
    'hidden': { type: 'string' },
    'computed': { type: 'string' },
    'lookup': { type: ['string', 'object'] },
    'color': { type: 'string' },
  };

  return typeMap[fieldType.toLowerCase()] || { type: 'string' };
}

// ============================================
// Schema Generation
// ============================================

/**
 * Converts a single field config to JSON Schema property
 */
function fieldConfigToSchemaProperty(field: FieldConfig): JSONSchemaProperty {
  const { type, format } = mapFieldTypeToJSONSchema(field.type);

  const property: JSONSchemaProperty = {
    type,
    description: field.label,
  };

  if (format) {
    property.format = format;
  }

  // Add default value if present
  if (field.defaultValue !== undefined) {
    property.default = field.defaultValue;
  }

  // Add validation constraints
  if (field.validation) {
    const v = field.validation;

    // Number constraints
    if (v.min !== undefined) property.minimum = v.min;
    if (v.max !== undefined) property.maximum = v.max;

    // String constraints
    if (v.minLength !== undefined) property.minLength = v.minLength;
    if (v.maxLength !== undefined) property.maxLength = v.maxLength;
    if (v.pattern) property.pattern = v.pattern;

    // Enum options (for select/radio/etc)
    if (v.options && Array.isArray(v.options)) {
      property.enum = v.options.map(opt =>
        typeof opt === 'string' ? opt : opt.value
      );
    }
  }

  // Handle array types
  if (type === 'array') {
    property.items = { type: 'string' };

    // For repeater fields with nested structure
    if (field.repeater?.itemSchema && field.repeater.itemSchema.length > 0) {
      const nestedProperties: Record<string, JSONSchemaProperty> = {};
      const nestedRequired: string[] = [];

      field.repeater.itemSchema.forEach((nestedField) => {
        nestedProperties[nestedField.name] = {
          type: mapFieldTypeToJSONSchema(nestedField.type).type as string,
          description: nestedField.label,
        };
        if (nestedField.required) {
          nestedRequired.push(nestedField.name);
        }
      });

      property.items = {
        type: 'object',
        properties: nestedProperties,
        required: nestedRequired,
      };
    }
  }

  // Handle object types (address, name, etc)
  if (type === 'object') {
    if (field.type === 'address') {
      property.properties = {
        street1: { type: 'string', description: 'Street Address' },
        street2: { type: 'string', description: 'Street Address Line 2' },
        city: { type: 'string', description: 'City' },
        state: { type: 'string', description: 'State/Province' },
        postalCode: { type: 'string', description: 'Postal Code' },
        country: { type: 'string', description: 'Country' },
      };
    } else if (field.type === 'name') {
      property.properties = {
        first: { type: 'string', description: 'First Name' },
        last: { type: 'string', description: 'Last Name' },
        middle: { type: 'string', description: 'Middle Name' },
        prefix: { type: 'string', description: 'Prefix' },
        suffix: { type: 'string', description: 'Suffix' },
      };
    }
  }

  return property;
}

/**
 * Generates JSON Schema from an array of field configs
 */
export function generateJSONSchema(
  fieldConfigs: FieldConfig[],
  options: {
    title?: string;
    description?: string;
    includeMetadata?: boolean;
  } = {}
): JSONSchema {
  const properties: Record<string, JSONSchemaProperty> = {};
  const required: string[] = [];

  // Filter to only included fields that should be in the document
  const includedFields = fieldConfigs.filter(f =>
    f.included !== false &&
    f.includeInDocument !== false &&
    !f.layout  // Exclude layout-only fields
  );

  for (const field of includedFields) {
    const path = field.path;

    // Handle nested paths (e.g., "address.city")
    if (path.includes('.')) {
      // For now, we'll flatten nested paths to top-level
      // A more sophisticated approach would build nested objects
      properties[path] = fieldConfigToSchemaProperty(field);
    } else {
      properties[path] = fieldConfigToSchemaProperty(field);
    }

    if (field.required) {
      required.push(path);
    }
  }

  // Optionally add metadata fields
  if (options.includeMetadata) {
    properties['_id'] = { type: 'string', description: 'Document ID' };
    properties['createdAt'] = { type: 'string', format: 'date-time', description: 'Creation timestamp' };
    properties['updatedAt'] = { type: 'string', format: 'date-time', description: 'Last update timestamp' };
  }

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    title: options.title,
    description: options.description,
    properties,
    required,
    additionalProperties: true,  // Allow fields not in schema
  };
}

/**
 * Converts JSON Schema to MongoDB JSON Schema validation format
 */
export function toMongoDBValidation(schema: JSONSchema): object {
  return {
    $jsonSchema: {
      bsonType: 'object',
      title: schema.title,
      description: schema.description,
      required: schema.required,
      properties: Object.fromEntries(
        Object.entries(schema.properties).map(([key, prop]) => {
          const mongoProp: any = {
            description: prop.description,
          };

          // Map JSON Schema types to BSON types
          if (Array.isArray(prop.type)) {
            mongoProp.bsonType = prop.type.map(t =>
              t === 'integer' ? 'int' : t
            );
          } else {
            mongoProp.bsonType = prop.type === 'integer' ? 'int' : prop.type;
          }

          // Copy constraints
          if (prop.minimum !== undefined) mongoProp.minimum = prop.minimum;
          if (prop.maximum !== undefined) mongoProp.maximum = prop.maximum;
          if (prop.minLength !== undefined) mongoProp.minLength = prop.minLength;
          if (prop.maxLength !== undefined) mongoProp.maxLength = prop.maxLength;
          if (prop.pattern) mongoProp.pattern = prop.pattern;
          if (prop.enum) mongoProp.enum = prop.enum;

          return [key, mongoProp];
        })
      ),
    },
  };
}

/**
 * Infers the complete schema for an application from its forms
 */
export function inferApplicationSchema(
  forms: FormForSchema[],
  applicationName?: string
): InferredApplicationSchema {
  const collections: InferredApplicationSchema['collections'] = {};
  let totalFields = 0;

  for (const form of forms) {
    // Determine target collection
    const collectionName =
      form.dataSource?.collection ||
      form.collection ||
      'submissions';

    const formId = form.formId || form.id || 'unknown';
    const formName = form.name;

    // Filter valid field configs
    const validFields = (form.fieldConfigs || []).filter(f =>
      f.included !== false &&
      f.includeInDocument !== false &&
      !f.layout
    );

    if (validFields.length === 0) continue;

    // If collection already exists, merge fields
    if (collections[collectionName]) {
      const existing = collections[collectionName];
      const existingSchema = existing.jsonSchema;

      // Generate schema for this form
      const formSchema = generateJSONSchema(validFields, {
        title: `${applicationName || 'Application'} - ${collectionName}`,
      });

      // Merge properties (later forms can add fields)
      existingSchema.properties = {
        ...existingSchema.properties,
        ...formSchema.properties,
      };

      // Merge required (union of all required fields)
      const requiredSet = new Set([
        ...existingSchema.required,
        ...formSchema.required,
      ]);
      existingSchema.required = Array.from(requiredSet);

      // Track source forms
      existing.sourceFormIds.push(formId);
      existing.sourceFormNames.push(formName);
      existing.fieldCount = Object.keys(existingSchema.properties).length;
    } else {
      // Create new collection entry
      const schema = generateJSONSchema(validFields, {
        title: `${applicationName || 'Application'} - ${collectionName}`,
        description: `Schema inferred from form: ${formName}`,
      });

      collections[collectionName] = {
        jsonSchema: schema,
        mongoDBValidation: toMongoDBValidation(schema),
        fieldCount: Object.keys(schema.properties).length,
        sourceFormIds: [formId],
        sourceFormNames: [formName],
      };
    }

    totalFields += validFields.length;
  }

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    collections,
    summary: {
      totalCollections: Object.keys(collections).length,
      totalFields,
      forms: forms.length,
    },
  };
}

/**
 * Generates a human-readable schema summary
 */
export function getSchemaDescription(schema: JSONSchema): string {
  const lines: string[] = [];

  if (schema.title) {
    lines.push(`# ${schema.title}`);
  }

  if (schema.description) {
    lines.push(schema.description);
  }

  lines.push('');
  lines.push('## Fields');
  lines.push('');

  for (const [path, prop] of Object.entries(schema.properties)) {
    const typeStr = Array.isArray(prop.type) ? prop.type.join(' | ') : prop.type;
    const requiredStr = schema.required.includes(path) ? ' (required)' : '';
    const formatStr = prop.format ? ` [${prop.format}]` : '';

    lines.push(`- **${path}**: ${typeStr}${formatStr}${requiredStr}`);
    if (prop.description && prop.description !== path) {
      lines.push(`  - ${prop.description}`);
    }
  }

  return lines.join('\n');
}
