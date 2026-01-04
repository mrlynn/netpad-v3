import { FIELD_TYPES, OPERATORS } from './constants.js';

// Types
interface FieldConfig {
  path: string;
  label: string;
  type: string;
  included: boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  helpText?: string;
  fieldWidth?: 'full' | 'half' | 'third' | 'quarter';
  defaultValue?: unknown;
  options?: Array<{ label: string; value: string | number }>;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    errorMessage?: string;
  };
  conditionalLogic?: ConditionalLogic;
  computed?: ComputedConfig;
  layout?: LayoutConfig;
}

interface ConditionalLogic {
  action: 'show' | 'hide';
  logicType: 'all' | 'any';
  conditions: FieldCondition[];
}

interface FieldCondition {
  field: string;
  operator: string;
  value?: string | number | boolean;
}

interface ComputedConfig {
  formula: string;
  dependencies: string[];
  outputType?: 'string' | 'number' | 'boolean' | 'date';
}

interface LayoutConfig {
  type: string;
  title?: string;
  subtitle?: string;
  content?: string;
  imageUrl?: string;
  height?: number;
  alignment?: 'left' | 'center' | 'right';
}

interface FormPage {
  id: string;
  title: string;
  description?: string;
  fields: string[];
}

interface MultiPageConfig {
  enabled: boolean;
  pages: FormPage[];
  showProgressBar?: boolean;
  showPageTitles?: boolean;
  allowSkip?: boolean;
  showReview?: boolean;
}

interface FormTheme {
  primaryColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  errorColor?: string;
  successColor?: string;
  borderRadius?: number;
  spacing?: 'compact' | 'comfortable' | 'spacious';
  inputStyle?: 'outlined' | 'filled' | 'standard';
  mode?: 'light' | 'dark';
}

interface FormConfiguration {
  name: string;
  description?: string;
  fieldConfigs: FieldConfig[];
  multiPage?: MultiPageConfig;
  theme?: FormTheme;
  submitButtonText?: string;
  successMessage?: string;
}

interface GenerateFormOptions {
  multiPage?: boolean;
  theme?: boolean;
}

// Field type inference from description keywords
const FIELD_TYPE_KEYWORDS: Record<string, string[]> = {
  email: ['email', 'e-mail', 'email address'],
  phone: ['phone', 'telephone', 'mobile', 'cell', 'contact number'],
  url: ['url', 'website', 'link', 'webpage'],
  long_text: ['message', 'description', 'comments', 'notes', 'feedback', 'bio', 'biography', 'details', 'textarea', 'multiline'],
  number: ['number', 'amount', 'quantity', 'count', 'age', 'price', 'cost', 'total', 'score'],
  date: ['date', 'birthday', 'birth date', 'dob', 'when', 'start date', 'end date', 'due date'],
  time: ['time', 'hour', 'schedule'],
  datetime: ['datetime', 'appointment', 'meeting time'],
  dropdown: ['select', 'choose', 'dropdown', 'pick', 'country', 'state', 'category'],
  radio: ['choose one', 'single choice', 'radio', 'option'],
  checkboxes: ['multiple choice', 'select multiple', 'check all', 'interests', 'features'],
  checkbox: ['agree', 'accept', 'terms', 'subscribe', 'opt-in', 'consent'],
  switch: ['toggle', 'enable', 'disable', 'on/off', 'switch'],
  yes_no: ['yes/no', 'yes or no', 'boolean'],
  rating: ['rating', 'stars', 'rate', 'review'],
  nps: ['nps', 'recommend', 'likelihood', 'net promoter'],
  autocomplete: ['search', 'autocomplete', 'typeahead'],
  tags: ['tags', 'keywords', 'labels'],
};

// Infer field type from label/description
function inferFieldType(label: string, description?: string): string {
  const text = `${label} ${description || ''}`.toLowerCase();

  for (const [fieldType, keywords] of Object.entries(FIELD_TYPE_KEYWORDS)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return fieldType;
    }
  }

  return 'short_text';
}

// Extract field references from a formula
function extractFieldReferences(formula: string): string[] {
  // Match word characters that could be field names (not function names or operators)
  const functionNames = ['sum', 'avg', 'min', 'max', 'round', 'floor', 'ceil', 'abs', 'sqrt', 'pow', 'concat', 'length', 'upper', 'lower', 'trim', 'if', 'coalesce', 'now', 'today', 'year', 'month', 'day'];
  const matches = formula.match(/[a-zA-Z_][a-zA-Z0-9_.]*(?!\s*\()/g) || [];

  return [...new Set(matches.filter(m => !functionNames.includes(m.toLowerCase())))];
}

// Generate a form schema from natural language description
export function generateFormSchema(
  description: string,
  formName: string,
  options: GenerateFormOptions = {}
): FormConfiguration {
  // Parse description to extract fields
  const fields = parseFieldsFromDescription(description);

  const config: FormConfiguration = {
    name: formName,
    description: description,
    fieldConfigs: fields,
    submitButtonText: 'Submit',
    successMessage: 'Thank you for your submission!',
  };

  if (options.multiPage && fields.length > 5) {
    config.multiPage = generateMultiPageFromFields(fields);
  }

  if (options.theme) {
    config.theme = {
      primaryColor: '#1976d2',
      spacing: 'comfortable',
      inputStyle: 'outlined',
      borderRadius: 8,
      mode: 'light',
    };
  }

  return config;
}

// Parse fields from natural language description
function parseFieldsFromDescription(description: string): FieldConfig[] {
  const fields: FieldConfig[] = [];
  const lines = description.split(/[\n,;]/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Try to extract field info from the line
    const field = parseFieldLine(line);
    if (field) {
      fields.push(field);
    }
  }

  // If no fields were parsed, create some basic ones based on keywords
  if (fields.length === 0) {
    const keywords = description.toLowerCase();

    if (keywords.includes('contact') || keywords.includes('form')) {
      fields.push(
        { path: 'name', label: 'Name', type: 'short_text', included: true, required: true },
        { path: 'email', label: 'Email', type: 'email', included: true, required: true },
        { path: 'message', label: 'Message', type: 'long_text', included: true },
      );
    }
  }

  return fields;
}

// Parse a single line to extract field configuration
function parseFieldLine(line: string): FieldConfig | null {
  // Skip lines that are clearly not field definitions
  if (line.length < 3 || /^(page|section|step|part)\s+\d+/i.test(line)) {
    return null;
  }

  // Try to extract field name and properties
  // Patterns like: "Name (required)", "Email address - required", "Message (optional, multiline)"
  const match = line.match(/^[-*•]?\s*(.+?)(?:\s*[-–—]\s*|\s*\(([^)]+)\))?$/);

  if (!match) return null;

  const labelPart = match[1].trim();
  const modifiersPart = match[2] || '';

  // Clean up the label
  const label = labelPart
    .replace(/^[-*•]\s*/, '')
    .replace(/\s*\(required\)\s*/gi, '')
    .replace(/\s*\(optional\)\s*/gi, '')
    .trim();

  if (!label) return null;

  // Generate path from label
  const path = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  // Check modifiers for required/optional
  const modifiers = modifiersPart.toLowerCase();
  const isRequired = modifiers.includes('required') || line.toLowerCase().includes('required');

  // Infer field type
  const type = inferFieldType(label, line);

  const field: FieldConfig = {
    path,
    label,
    type,
    included: true,
  };

  if (isRequired) {
    field.required = true;
  }

  // Add type-specific defaults
  if (type === 'email') {
    field.placeholder = 'Enter your email address';
  } else if (type === 'phone') {
    field.placeholder = 'Enter your phone number';
  } else if (type === 'long_text') {
    field.placeholder = `Enter ${label.toLowerCase()}`;
  }

  return field;
}

// Generate multi-page config from fields
function generateMultiPageFromFields(fields: FieldConfig[]): MultiPageConfig {
  // Group fields into pages of ~5 fields each
  const pageSize = 5;
  const pages: FormPage[] = [];

  for (let i = 0; i < fields.length; i += pageSize) {
    const pageFields = fields.slice(i, i + pageSize);
    const pageNum = Math.floor(i / pageSize) + 1;

    pages.push({
      id: `page${pageNum}`,
      title: `Step ${pageNum}`,
      fields: pageFields.map(f => f.path),
    });
  }

  return {
    enabled: true,
    pages,
    showProgressBar: true,
    showPageTitles: true,
  };
}

// Generate a single field configuration
export function generateFieldConfig(params: {
  path: string;
  label: string;
  type: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  helpText?: string;
  fieldWidth?: 'full' | 'half' | 'third' | 'quarter';
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    errorMessage?: string;
  };
}): FieldConfig {
  const field: FieldConfig = {
    path: params.path,
    label: params.label,
    type: params.type,
    included: true,
  };

  if (params.required) field.required = true;
  if (params.placeholder) field.placeholder = params.placeholder;
  if (params.helpText) field.helpText = params.helpText;
  if (params.fieldWidth) field.fieldWidth = params.fieldWidth;
  if (params.options) field.options = params.options;
  if (params.validation) field.validation = params.validation;

  return field;
}

// Generate conditional logic configuration
export function generateConditionalLogic(
  action: 'show' | 'hide',
  logicType: 'all' | 'any',
  conditions: Array<{ field: string; operator: string; value?: string | number | boolean }>
): ConditionalLogic {
  // Validate operators
  const validOperators = OPERATORS.map(o => o.operator);

  const validatedConditions = conditions.map(c => {
    if (!validOperators.includes(c.operator)) {
      throw new Error(`Invalid operator: ${c.operator}. Valid operators: ${validOperators.join(', ')}`);
    }

    const opInfo = OPERATORS.find(o => o.operator === c.operator);
    if (opInfo?.requiresValue && c.value === undefined) {
      throw new Error(`Operator ${c.operator} requires a value`);
    }

    const condition: FieldCondition = {
      field: c.field,
      operator: c.operator,
    };

    if (c.value !== undefined) {
      condition.value = c.value;
    }

    return condition;
  });

  return {
    action,
    logicType,
    conditions: validatedConditions,
  };
}

// Generate computed field configuration
export function generateComputedField(
  path: string,
  label: string,
  formula: string,
  outputType?: 'string' | 'number' | 'boolean' | 'date'
): FieldConfig {
  const dependencies = extractFieldReferences(formula);

  const field: FieldConfig = {
    path,
    label,
    type: outputType === 'number' ? 'number' : 'short_text',
    included: true,
    disabled: true, // Computed fields are typically read-only
    computed: {
      formula,
      dependencies,
    },
  };

  if (outputType) {
    field.computed!.outputType = outputType;
  }

  return field;
}

// Generate multi-page configuration
export function generateMultiPageConfig(
  pages: Array<{
    id: string;
    title: string;
    description?: string;
    fields: string[];
  }>,
  options: {
    showProgressBar?: boolean;
    showPageTitles?: boolean;
    allowSkip?: boolean;
    showReview?: boolean;
  } = {}
): MultiPageConfig {
  return {
    enabled: true,
    pages: pages.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      fields: p.fields,
    })),
    showProgressBar: options.showProgressBar ?? true,
    showPageTitles: options.showPageTitles ?? true,
    allowSkip: options.allowSkip ?? false,
    showReview: options.showReview ?? false,
  };
}

// Validate a form configuration
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateFormConfig(config: unknown): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (!config || typeof config !== 'object') {
    result.valid = false;
    result.errors.push('Configuration must be an object');
    return result;
  }

  const form = config as Record<string, unknown>;

  // Check required fields
  if (!form.name || typeof form.name !== 'string') {
    result.valid = false;
    result.errors.push('Form must have a "name" property (string)');
  }

  if (!form.fieldConfigs || !Array.isArray(form.fieldConfigs)) {
    result.valid = false;
    result.errors.push('Form must have a "fieldConfigs" array');
    return result;
  }

  const validFieldTypes = FIELD_TYPES.map(t => t.type);
  const fieldPaths = new Set<string>();

  // Validate each field
  for (let i = 0; i < form.fieldConfigs.length; i++) {
    const field = form.fieldConfigs[i] as Record<string, unknown>;
    const prefix = `Field ${i + 1}`;

    // Check required field properties
    if (!field.path || typeof field.path !== 'string') {
      result.valid = false;
      result.errors.push(`${prefix}: missing or invalid "path" property`);
    } else {
      if (fieldPaths.has(field.path as string)) {
        result.valid = false;
        result.errors.push(`${prefix}: duplicate path "${field.path}"`);
      }
      fieldPaths.add(field.path as string);
    }

    if (!field.label || typeof field.label !== 'string') {
      result.valid = false;
      result.errors.push(`${prefix} (${field.path || 'unknown'}): missing or invalid "label" property`);
    }

    if (!field.type || typeof field.type !== 'string') {
      result.valid = false;
      result.errors.push(`${prefix} (${field.path || 'unknown'}): missing or invalid "type" property`);
    } else if (!validFieldTypes.includes(field.type as string)) {
      result.warnings.push(`${prefix} (${field.path}): unknown field type "${field.type}". Valid types: ${validFieldTypes.slice(0, 10).join(', ')}...`);
    }

    if (field.included === undefined) {
      result.warnings.push(`${prefix} (${field.path}): missing "included" property, defaulting to true`);
    }

    // Validate options for selection fields
    const selectionTypes = ['dropdown', 'select', 'radio', 'multiple_choice', 'checkboxes', 'checkbox-group'];
    if (selectionTypes.includes(field.type as string) && (!field.options || !Array.isArray(field.options))) {
      result.warnings.push(`${prefix} (${field.path}): selection field without options array`);
    }

    // Validate conditional logic
    if (field.conditionalLogic) {
      const logic = field.conditionalLogic as Record<string, unknown>;
      if (!['show', 'hide'].includes(logic.action as string)) {
        result.errors.push(`${prefix} (${field.path}): conditionalLogic.action must be "show" or "hide"`);
      }
      if (!['all', 'any'].includes(logic.logicType as string)) {
        result.errors.push(`${prefix} (${field.path}): conditionalLogic.logicType must be "all" or "any"`);
      }
      if (!Array.isArray(logic.conditions) || logic.conditions.length === 0) {
        result.errors.push(`${prefix} (${field.path}): conditionalLogic.conditions must be a non-empty array`);
      }
    }

    // Validate computed field
    if (field.computed) {
      const computed = field.computed as Record<string, unknown>;
      if (!computed.formula || typeof computed.formula !== 'string') {
        result.errors.push(`${prefix} (${field.path}): computed.formula must be a non-empty string`);
      }
      if (!Array.isArray(computed.dependencies)) {
        result.warnings.push(`${prefix} (${field.path}): computed field missing dependencies array`);
      }
    }
  }

  // Validate multi-page configuration
  if (form.multiPage) {
    const mp = form.multiPage as Record<string, unknown>;
    if (mp.enabled && (!Array.isArray(mp.pages) || mp.pages.length === 0)) {
      result.errors.push('multiPage.pages must be a non-empty array when enabled');
    }

    if (Array.isArray(mp.pages)) {
      const allPageFields = new Set<string>();
      for (const page of mp.pages as Array<Record<string, unknown>>) {
        if (!page.id || typeof page.id !== 'string') {
          result.errors.push('Each page must have an "id" property');
        }
        if (!page.title || typeof page.title !== 'string') {
          result.errors.push(`Page ${page.id || 'unknown'}: missing "title" property`);
        }
        if (!Array.isArray(page.fields)) {
          result.errors.push(`Page ${page.id || 'unknown'}: missing "fields" array`);
        } else {
          for (const fieldPath of page.fields as string[]) {
            if (!fieldPaths.has(fieldPath)) {
              result.warnings.push(`Page ${page.id}: references unknown field "${fieldPath}"`);
            }
            allPageFields.add(fieldPath);
          }
        }
      }

      // Check for fields not assigned to any page
      for (const path of fieldPaths) {
        if (!allPageFields.has(path)) {
          result.warnings.push(`Field "${path}" is not assigned to any page`);
        }
      }
    }
  }

  return result;
}
