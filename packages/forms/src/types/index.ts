/**
 * @netpad/forms - Type Definitions
 *
 * Core types for rendering NetPad forms in React applications.
 */

// ============================================
// Form Mode & Type
// ============================================

/**
 * Form mode determines runtime behavior:
 * - create: New document, defaults apply
 * - edit: Existing document, editable
 * - view: Read-only display
 */
export type FormMode = 'create' | 'edit' | 'view';

/**
 * Field width options for layout
 */
export type FieldWidth = 'full' | 'half' | 'third' | 'quarter';

// ============================================
// Conditional Logic
// ============================================

export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'greaterThan'
  | 'lessThan'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'isTrue'
  | 'isFalse';

export interface FieldCondition {
  field: string;
  operator: ConditionOperator;
  value?: string | number | boolean;
}

export interface ConditionalLogic {
  action: 'show' | 'hide';
  logicType: 'all' | 'any';
  conditions: FieldCondition[];
}

// ============================================
// Field Configuration
// ============================================

export interface LookupConfig {
  connectionId: string;
  database: string;
  collection: string;
  valueField: string;
  labelField: string;
  searchFields?: string[];
  filter?: Record<string, unknown>;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface ComputedConfig {
  formula: string;
  dependencies: string[];
  outputType?: 'string' | 'number' | 'boolean' | 'date';
}

export interface RepeaterConfig {
  minItems?: number;
  maxItems?: number;
  itemLabel?: string;
  addButtonLabel?: string;
  fields: FieldConfig[];
}

export type LayoutFieldType =
  | 'section-header'
  | 'description'
  | 'divider'
  | 'image'
  | 'spacer';

export interface LayoutConfig {
  type: LayoutFieldType;
  title?: string;
  subtitle?: string;
  content?: string;
  imageUrl?: string;
  height?: number;
  alignment?: 'left' | 'center' | 'right';
}

/**
 * Field configuration - the core building block of forms
 */
export interface FieldConfig {
  // Identity
  path: string;
  label: string;
  type: string;

  // State
  included: boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;

  // Display
  placeholder?: string;
  helpText?: string;
  fieldWidth?: FieldWidth;
  displayStyle?: string;

  // Values
  defaultValue?: unknown;
  options?: Array<{ label: string; value: string | number }>;

  // Validation
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    errorMessage?: string;
  };

  // Advanced
  conditionalLogic?: ConditionalLogic;
  lookup?: LookupConfig;
  computed?: ComputedConfig;
  repeater?: RepeaterConfig;
  layout?: LayoutConfig;

  // Metadata
  source?: 'schema' | 'custom';
}

// ============================================
// Multi-Page Forms
// ============================================

export type PageType = 'form' | 'info' | 'summary' | 'complete';

export interface PageCallout {
  type: 'info' | 'warning' | 'success' | 'error';
  title?: string;
  message: string;
}

export interface FormPage {
  id: string;
  title: string;
  description?: string;
  pageType?: PageType;
  fields: string[];
  icon?: string;
  callout?: PageCallout;
}

export interface MultiPageConfig {
  enabled: boolean;
  pages: FormPage[];
  showProgressBar?: boolean;
  showPageTitles?: boolean;
  allowSkip?: boolean;
  showReview?: boolean;
}

// ============================================
// Form Theme
// ============================================

export interface FormTheme {
  preset?: string;
  primaryColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  textSecondaryColor?: string;
  errorColor?: string;
  successColor?: string;
  borderRadius?: number;
  inputBorderRadius?: number;
  buttonBorderRadius?: number;
  fontFamily?: string;
  spacing?: 'compact' | 'comfortable' | 'spacious';
  inputStyle?: 'outlined' | 'filled' | 'standard';
  mode?: 'light' | 'dark';
}

export interface FormHeader {
  enabled?: boolean;
  type?: 'color' | 'gradient' | 'image';
  color?: string;
  gradientStart?: string;
  gradientEnd?: string;
  gradientDirection?: number;
  imageUrl?: string;
  height?: number;
  showTitle?: boolean;
  showDescription?: boolean;
  textColor?: string;
  textShadow?: boolean;
}

// ============================================
// Form Configuration
// ============================================

/**
 * Complete form configuration - the main structure for defining a form
 */
export interface FormConfiguration {
  // Identity
  formId?: string;
  name: string;
  description?: string;
  slug?: string;

  // Data target (for submissions)
  database?: string;
  collection?: string;

  // Fields
  fieldConfigs: FieldConfig[];

  // Multi-page
  multiPage?: MultiPageConfig;

  // Appearance
  theme?: FormTheme;
  header?: FormHeader;

  // Submit behavior
  submitButtonText?: string;
  successMessage?: string;
  redirectUrl?: string;

  // Status
  status?: 'draft' | 'published';

  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================
// Form Renderer Props
// ============================================

/**
 * Props for the FormRenderer component
 */
export interface FormRendererProps {
  /**
   * Form configuration defining fields, pages, and behavior
   */
  config: FormConfiguration;

  /**
   * Initial form data (for edit mode)
   */
  initialData?: Record<string, unknown>;

  /**
   * Form mode: create, edit, or view
   */
  mode?: FormMode;

  /**
   * Theme overrides
   */
  theme?: FormTheme;

  /**
   * Called when form is submitted successfully
   */
  onSubmit?: (data: Record<string, unknown>) => Promise<void> | void;

  /**
   * Called when form data changes
   */
  onChange?: (data: Record<string, unknown>) => void;

  /**
   * Called on validation errors
   */
  onError?: (errors: Record<string, string>) => void;

  /**
   * Custom submit button text
   */
  submitButtonText?: string;

  /**
   * Show submit button (default: true)
   */
  showSubmitButton?: boolean;

  /**
   * Enable draft auto-save (default: false)
   */
  enableDrafts?: boolean;

  /**
   * Lookup data fetcher for dynamic field options
   */
  onLookup?: (config: LookupConfig, search?: string) => Promise<Array<{ label: string; value: unknown }>>;

  /**
   * Custom class name for the form container
   */
  className?: string;

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Disabled state
   */
  disabled?: boolean;
}

// ============================================
// Submission Types
// ============================================

export interface FormSubmissionMetadata {
  submittedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  completionTimeSeconds?: number;
}

export interface FormSubmissionResult {
  success: boolean;
  submissionId?: string;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================
// API Types (for NetPad integration)
// ============================================

/**
 * Form schema returned from NetPad API
 */
export interface NetPadFormSchema {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  status: 'draft' | 'published';
  fields: FieldConfig[];
  settings?: {
    submitButtonText?: string;
    successMessage?: string;
    redirectUrl?: string;
  };
  theme?: FormTheme;
  multiPage?: MultiPageConfig;
}

/**
 * Submission payload for NetPad API
 */
export interface NetPadSubmissionPayload {
  data: Record<string, unknown>;
  metadata?: {
    referrer?: string;
    customFields?: Record<string, unknown>;
  };
}

/**
 * Submission response from NetPad API
 */
export interface NetPadSubmissionResponse {
  success: boolean;
  submissionId?: string;
  formId?: string;
  submittedAt?: string;
  error?: string;
}
