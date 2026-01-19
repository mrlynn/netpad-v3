/**
 * Field Configuration Types
 *
 * Core types for defining form fields in templates.
 * Self-contained with no external dependencies.
 */

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
  value?: any;
}

export interface ConditionalLogic {
  action: 'show' | 'hide';
  logicType: 'all' | 'any';
  conditions: FieldCondition[];
}

// ============================================
// Field References & Lookups
// ============================================

export interface LookupConfig {
  collection: string;
  displayField: string;
  valueField: string;
  filterField?: string;
  filterSourceField?: string;
  searchable?: boolean;
  multiple?: boolean;
  preloadOptions?: boolean;
}

export interface ComputedConfig {
  formula: string;
  dependencies: string[];
  outputType: 'string' | 'number' | 'boolean';
}

export interface RepeaterItemField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select';
  label: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

export interface RepeaterConfig {
  enabled: boolean;
  minItems: number;
  maxItems: number;
  itemSchema: RepeaterItemField[];
  allowDuplication: boolean;
  collapsible: boolean;
}

// ============================================
// URL Parameter Configuration
// ============================================

export interface URLParamConfig {
  paramName: string;
  defaultValue?: any;
  dataType: 'string' | 'number' | 'boolean' | 'json';
  hidden?: boolean;
  readonly?: boolean;
  fallbackField?: string;
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'none';
  validation?: {
    allowedValues?: string[];
    pattern?: string;
    required?: boolean;
  };
}

// ============================================
// Field Encryption (Queryable Encryption / CSFLE)
// ============================================

/**
 * Encryption algorithm for MongoDB Queryable Encryption
 * - 'Indexed': Allows equality queries on encrypted data (recommended for searchable fields)
 * - 'Unindexed': Maximum security, no query support (recommended for highly sensitive data)
 * - 'Range': Allows range queries (MongoDB 7.0+, for numeric/date fields)
 */
export type EncryptionAlgorithm = 'Indexed' | 'Unindexed' | 'Range';

/**
 * Query type allowed on encrypted fields
 */
export type EncryptedQueryType = 'none' | 'equality' | 'range';

/**
 * Data sensitivity classification for compliance
 */
export type DataSensitivityLevel =
  | 'public'       // No encryption needed
  | 'internal'     // Low sensitivity
  | 'confidential' // Medium sensitivity (encryption recommended)
  | 'restricted'   // High sensitivity - PII/PHI (encryption required)
  | 'secret';      // Maximum sensitivity - financial/legal (mandatory encryption)

/**
 * Compliance frameworks for encrypted data
 */
export type ComplianceFramework =
  | 'HIPAA'    // Healthcare data
  | 'PCI-DSS'  // Payment card industry
  | 'GDPR'     // EU data protection
  | 'SOC2'     // Security audit
  | 'CCPA'     // California privacy
  | 'FERPA';   // Educational records

/**
 * Field-level encryption configuration for MongoDB Queryable Encryption
 *
 * @example SSN field with indexed encryption for lookups
 * ```typescript
 * encryption: {
 *   enabled: true,
 *   algorithm: 'Indexed',
 *   queryType: 'equality',
 *   sensitivityLevel: 'secret',
 *   compliance: ['HIPAA', 'GDPR'],
 *   encryptionReason: 'PII - SSN required for identity verification'
 * }
 * ```
 *
 * @example Medical history with unindexed encryption (max security)
 * ```typescript
 * encryption: {
 *   enabled: true,
 *   algorithm: 'Unindexed',
 *   queryType: 'none',
 *   sensitivityLevel: 'restricted',
 *   compliance: ['HIPAA'],
 *   encryptionReason: 'PHI - Protected health information'
 * }
 * ```
 */
export interface FieldEncryptionConfig {
  /**
   * Whether encryption is enabled for this field
   */
  enabled: boolean;

  /**
   * Encryption algorithm to use
   * - 'Indexed': Allows equality queries on encrypted data (recommended)
   * - 'Unindexed': Maximum security, no query support
   * - 'Range': Allows range queries (MongoDB 7.0+)
   */
  algorithm: EncryptionAlgorithm;

  /**
   * What types of queries are allowed on this encrypted field
   */
  queryType: EncryptedQueryType;

  /**
   * Data sensitivity classification for compliance
   */
  sensitivityLevel: DataSensitivityLevel;

  /**
   * Compliance frameworks this field falls under
   */
  compliance?: ComplianceFramework[];

  /**
   * Custom key ID for field-specific encryption keys
   */
  keyId?: string;

  /**
   * Alternative name for the encryption key (for key management)
   */
  keyAltName?: string;

  /**
   * Contention factor for Indexed algorithm (1-8, default 4)
   * Higher = faster inserts, slower queries
   * Lower = slower inserts, faster queries
   */
  contentionFactor?: number;

  /**
   * Minimum value for Range queries (numeric or date string)
   */
  rangeMin?: number | string;

  /**
   * Maximum value for Range queries (numeric or date string)
   */
  rangeMax?: number | string;

  /**
   * Reason for encryption (for audit trail)
   */
  encryptionReason?: string;
}

// ============================================
// MongoDB Array Patterns
// ============================================

export type ArrayPattern = 'key-value' | 'tags' | 'references' | 'custom-objects' | 'primitive';

export interface ArrayPatternConfig {
  pattern: ArrayPattern;
  keyField?: string;
  valueField?: string;
  keyLabel?: string;
  valueLabel?: string;
  valueType?: 'string' | 'number' | 'boolean' | 'mixed';
  suggestions?: string[];
  allowCustom?: boolean;
  displayFields?: string[];
  objectSchema?: RepeaterItemField[];
}

// ============================================
// Layout Fields
// ============================================

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
  contentType?: 'text' | 'markdown' | 'html';
  imageUrl?: string;
  imageAlt?: string;
  imageWidth?: number | 'full' | 'auto';
  imageAlignment?: 'left' | 'center' | 'right';
  height?: number;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  padding?: number;
}

// ============================================
// Field Mode Configuration
// ============================================

export type FormMode = 'create' | 'edit' | 'view' | 'clone' | 'search';

export interface FieldModeConfig {
  visibleIn?: FormMode[];
  editableIn?: FormMode[];
  requiredIn?: FormMode[];
}

// ============================================
// Field Width
// ============================================

export type FieldWidth = 'full' | 'half' | 'third' | 'quarter';

// ============================================
// Field Source
// ============================================

export type FieldSource = 'schema' | 'custom' | 'variable';

// ============================================
// Field Configuration
// ============================================

export interface FieldConfig {
  path: string;
  label: string;
  type: string;
  included: boolean;
  required: boolean;
  defaultValue?: any;
  placeholder?: string;
  source?: FieldSource;
  includeInDocument?: boolean;
  fieldWidth?: FieldWidth;
  validation?: FieldValidation;
  conditionalLogic?: ConditionalLogic;
  lookup?: LookupConfig;
  computed?: ComputedConfig;
  repeater?: RepeaterConfig;
  modeConfig?: FieldModeConfig;
  arrayPattern?: ArrayPatternConfig;
  layout?: LayoutConfig;
  urlParam?: URLParamConfig;
  /**
   * Field-level encryption configuration (MongoDB Queryable Encryption)
   * Use for PII, PHI, financial data, and compliance-sensitive fields
   */
  encryption?: FieldEncryptionConfig;
}

// ============================================
// Field Validation
// ============================================

export interface FieldValidation {
  // Number validation
  min?: number;
  max?: number;
  decimalsAllowed?: boolean;
  // Text validation
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  // Scale/Rating specific
  lowLabel?: string;
  highLabel?: string;
  ratingStyle?: 'stars' | 'hearts' | 'thumbs' | 'emojis' | 'numbers';
  scaleDisplayStyle?: 'buttons' | 'slider' | 'radio';
  showValue?: boolean;
  showLabels?: boolean;
  step?: number;
  // Date validation
  minDate?: string;
  maxDate?: string;
  allowPastDates?: boolean;
  allowFutureDates?: boolean;
  // Yes/No settings
  yesLabel?: string;
  noLabel?: string;
  displayStyle?: 'switch' | 'buttons' | 'checkbox';
  // File/Image upload settings
  allowedTypes?: string[];
  maxSize?: number;
  multiple?: boolean;
  maxFiles?: number;
  // Color picker settings
  colorFormat?: 'hex' | 'rgb' | 'hsl';
  showAlpha?: boolean;
  presetColors?: string[];
  presetsOnly?: boolean;
  pickerStyle?: 'chrome' | 'sketch' | 'compact' | 'block' | 'swatches';
  // Email settings
  allowMultipleEmails?: boolean;
  blockDisposable?: boolean;
  allowedDomains?: string[];
  blockedDomains?: string[];
  confirmEmail?: boolean;
  // URL settings
  requireHttps?: boolean;
  allowedProtocols?: string[];
  showUrlPreview?: boolean;
  // Phone settings
  defaultCountry?: string;
  phoneFormat?: 'national' | 'international' | 'e164';
  showCountrySelector?: boolean;
  allowedCountries?: string[];
  // Time settings
  timeFormat?: '12h' | '24h';
  minuteStep?: number;
  minTime?: string;
  maxTime?: string;
  showSeconds?: boolean;
  // Signature settings
  strokeColor?: string;
  strokeWidth?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundColor?: string;
  allowTypedSignature?: boolean;
  outputFormat?: 'png' | 'svg' | 'base64';
  // Tags settings
  tagSuggestions?: string[];
  allowCustomTags?: boolean;
  minTags?: number;
  maxTags?: number;
  maxTagLength?: number;
  tagCaseHandling?: 'preserve' | 'lowercase' | 'uppercase';
  createTagOnEnter?: boolean;
  createTagOnComma?: boolean;
  // Slider specific settings
  showTicks?: boolean;
  tickInterval?: number;
  valuePosition?: 'above' | 'below' | 'tooltip';
  showMinMax?: boolean;
  sliderMarks?: Array<{ value: number; label: string }>;
  trackColor?: string;
  rangeSelection?: boolean;
  // Opinion scale settings
  scaleType?: 'agreement' | 'satisfaction' | 'frequency' | 'importance' | 'likelihood' | 'custom';
  showNeutral?: boolean;
  neutralLabel?: string;
  opinionDisplayStyle?: 'buttons' | 'emojis' | 'icons' | 'radio';
  // Multiple choice / Checkboxes settings
  choiceLayout?: 'vertical' | 'horizontal' | 'grid';
  choiceColumns?: number;
  randomizeOptions?: boolean;
  allowOther?: boolean;
  otherLabel?: string;
  showImages?: boolean;
  imageSize?: 'small' | 'medium' | 'large';
  minSelections?: number;
  maxSelections?: number;
  showSelectAll?: boolean;
  // Dropdown / Select / Multiple Choice settings
  options?: Array<string | { value: any; label: string }>;
  searchable?: boolean;
  allowCreate?: boolean;
  clearable?: boolean;
  groupedOptions?: boolean;
  // Image upload specific
  enableCrop?: boolean;
  cropAspectRatio?: number;
  minImageWidth?: number;
  minImageHeight?: number;
  maxImageWidth?: number;
  maxImageHeight?: number;
  enableCompression?: boolean;
  compressionQuality?: number;
  // Matrix settings
  matrixRows?: Array<{ id: string; label: string }>;
  matrixColumns?: Array<{ id: string; label: string; value?: any }>;
  matrixCellType?: 'radio' | 'checkbox' | 'dropdown' | 'text' | 'number';
  requireAllRows?: boolean;
  onePerColumn?: boolean;
  randomizeRows?: boolean;
  randomizeColumns?: boolean;
  // Ranking settings
  rankingItems?: Array<{ id: string; label: string; imageUrl?: string }>;
  minRank?: number;
  maxRank?: number;
  showRankNumbers?: boolean;
  dragStyle?: 'list' | 'cards' | 'grid';
  allowTies?: boolean;
  // Address settings
  addressComponents?: Array<'street1' | 'street2' | 'city' | 'state' | 'postalCode' | 'country'>;
  addressDefaultCountry?: string;
  enableAutocomplete?: boolean;
  autocompleteProvider?: 'google' | 'mapbox' | 'here';
  showMap?: boolean;
  requireAllComponents?: boolean;
  addressDisplayMode?: 'single' | 'multi';
  // DateTime combined settings
  dateTimeTimezone?: 'local' | 'utc' | 'custom';
  customTimezone?: string;
  showTimezoneSelector?: boolean;
}
