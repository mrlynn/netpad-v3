// ============================================
// Form Lifecycle & Mode
// ============================================

/**
 * Form mode determines runtime behavior:
 * - create: New document, defaults apply, no existing data
 * - edit: Existing document, editable, defaults don't re-apply
 * - view: Existing document, read-only display
 * - clone: Copy existing doc into create mode (new ID)
 * - search: Use form fields as query filters to find documents
 */
export type FormMode = 'create' | 'edit' | 'view' | 'clone' | 'search';

/**
 * Form type determines what the form does:
 * - data-entry: Standard form for inserting/editing documents
 * - search: Form for searching/filtering existing documents
 * - both: Form can switch between data entry and search modes
 */
export type FormType = 'data-entry' | 'search' | 'both';

/**
 * Search operator types for field queries
 */
export type SearchOperator =
  | 'equals'          // Exact match
  | 'notEquals'       // Not equal to
  | 'contains'        // String contains (case-insensitive)
  | 'startsWith'      // String starts with
  | 'endsWith'        // String ends with
  | 'greaterThan'     // > for numbers/dates
  | 'lessThan'        // < for numbers/dates
  | 'greaterOrEqual'  // >= for numbers/dates
  | 'lessOrEqual'     // <= for numbers/dates
  | 'between'         // Range query (requires two values)
  | 'in'              // Value in array
  | 'notIn'           // Value not in array
  | 'exists'          // Field exists
  | 'regex';          // Regular expression

/**
 * Configuration for a searchable field
 */
export interface SearchFieldConfig {
  enabled: boolean;              // Is this field searchable?
  operators: SearchOperator[];   // Allowed operators for this field
  defaultOperator: SearchOperator;
  showInResults: boolean;        // Show this field in search results
  resultOrder?: number;          // Order in results table (lower = earlier)
  // UI options
  placeholder?: string;          // Search input placeholder
  helpText?: string;             // Help text for search field
}

/**
 * Search results display configuration
 */
export interface SearchResultsConfig {
  layout: 'table' | 'cards' | 'list';
  pageSize: number;
  pageSizeOptions: number[];
  showPagination: boolean;
  // Actions available on results
  allowView: boolean;
  allowEdit: boolean;
  allowDelete: boolean;
  allowExport: boolean;
  // Sorting
  defaultSortField?: string;
  defaultSortDirection?: 'asc' | 'desc';
  allowSorting: boolean;
  // Selection
  allowSelection: boolean;
  allowBulkActions: boolean;
}

/**
 * Overall search configuration for a form
 */
export interface SearchConfig {
  enabled: boolean;
  // Which fields are searchable and how
  fields: Record<string, SearchFieldConfig>;
  // Results display
  results: SearchResultsConfig;
  // Connection override (if different from form's collection)
  connectionId?: string;         // Reference to saved connection
  // Query limits
  maxResults?: number;           // Maximum results to return
  defaultQuery?: Record<string, any>; // Default/base query to apply
}

// ============================================
// Field-Level Encryption (Queryable Encryption)
// ============================================

/**
 * Encryption algorithm types supported by MongoDB Queryable Encryption
 * - Indexed: Supports equality queries on encrypted data (recommended for most use cases)
 * - Unindexed: Maximum security, no query support
 * - Range: Supports range queries (MongoDB 7.0+, preview feature)
 */
export type EncryptionAlgorithm =
  | 'Indexed'      // Supports equality queries
  | 'Unindexed'    // No query support (maximum security)
  | 'Range';       // Supports range queries (MongoDB 7.0+)

/**
 * Query capabilities for encrypted fields
 */
export type EncryptedQueryType =
  | 'none'        // Field cannot be queried (maximum security)
  | 'equality'    // Supports exact match queries only
  | 'range';      // Supports range queries (>, <, between) - requires Range algorithm

/**
 * Sensitivity level for compliance categorization
 */
export type DataSensitivityLevel =
  | 'public'       // No encryption needed
  | 'internal'     // Low sensitivity, encryption optional
  | 'confidential' // Medium sensitivity, encryption recommended
  | 'restricted'   // High sensitivity (PII, PHI), encryption required
  | 'secret';      // Maximum sensitivity (financial, legal), mandatory encryption

/**
 * Compliance frameworks that may require encryption
 */
export type ComplianceFramework =
  | 'HIPAA'        // Health Insurance Portability and Accountability Act
  | 'PCI-DSS'      // Payment Card Industry Data Security Standard
  | 'GDPR'         // General Data Protection Regulation
  | 'SOC2'         // Service Organization Control 2
  | 'CCPA'         // California Consumer Privacy Act
  | 'FERPA';       // Family Educational Rights and Privacy Act

/**
 * KMS provider types for key management
 */
export type KMSProvider = 'local' | 'aws' | 'azure' | 'gcp';

/**
 * Field-level encryption configuration
 * Enables MongoDB Queryable Encryption for sensitive form fields
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
   * If not specified, uses the collection's default key
   */
  keyId?: string;

  /**
   * Key alternative name for easier key management
   */
  keyAltName?: string;

  /**
   * Contention factor for indexed encrypted fields (1-8, default 4)
   * Higher values = better insert performance, lower query performance
   */
  contentionFactor?: number;

  /**
   * For range queries: minimum expected value
   */
  rangeMin?: number | string;

  /**
   * For range queries: maximum expected value
   */
  rangeMax?: number | string;

  /**
   * Human-readable reason for encryption (for audit purposes)
   */
  encryptionReason?: string;
}

/**
 * Collection-level encryption configuration
 */
export interface CollectionEncryptionConfig {
  /**
   * Whether queryable encryption is enabled for this collection
   */
  enabled: boolean;

  /**
   * KMS provider to use for key encryption
   */
  kmsProvider: KMSProvider;

  /**
   * Reference to the encryption key vault namespace
   * Format: "database.__keyVault"
   */
  keyVaultNamespace?: string;

  /**
   * Data Encryption Key (DEK) ID for this collection
   */
  dataKeyId?: string;

  /**
   * AWS KMS configuration (when kmsProvider is 'aws')
   */
  awsKms?: {
    keyArn: string;
    region: string;
  };

  /**
   * Azure Key Vault configuration (when kmsProvider is 'azure')
   */
  azureKms?: {
    keyVaultEndpoint: string;
    keyName: string;
  };

  /**
   * GCP Cloud KMS configuration (when kmsProvider is 'gcp')
   */
  gcpKms?: {
    projectId: string;
    location: string;
    keyRing: string;
    keyName: string;
  };
}

/**
 * Form runtime state - unified state object for all modes
 */
export interface FormState {
  values: Record<string, any>;        // Current field values
  initialValues: Record<string, any>; // Original values (for dirty checking)
  errors: Record<string, string>;     // Validation errors by field path
  touched: Record<string, boolean>;   // Fields that have been interacted with
  meta: FormMeta;                     // Mode, document info, status
  derived: Record<string, any>;       // Computed/derived values
}

/**
 * Form metadata - not field values, but form-level info
 */
export interface FormMeta {
  mode: FormMode;
  isNew: boolean;                     // true in create/clone mode
  documentId?: string;                // ObjectId in edit/view mode
  isSubmitting: boolean;
  isValidating: boolean;
  isDirty: boolean;                   // values !== initialValues
  submitCount: number;
  lastSaved?: string;                 // ISO timestamp
}

// ============================================
// Submission & Action Configuration
// ============================================

/**
 * What happens on successful action
 */
export interface ActionSuccessConfig {
  action: 'navigate' | 'toast' | 'refresh' | 'close' | 'callback';
  target?: string;                    // URL for navigate, message for toast
  message?: string;
}

/**
 * What happens on action error
 */
export interface ActionErrorConfig {
  action: 'toast' | 'inline' | 'modal';
  message?: string;                   // Custom error message (uses API error if not set)
}

/**
 * Form submission configuration - declarative, not code
 */
export interface SubmitConfig {
  mode: 'insert' | 'update' | 'upsert' | 'custom';
  collection?: string;                // Override form's collection
  // Field transformations before submit
  transforms?: {
    omitFields?: string[];            // Fields to exclude from document
    renameFields?: Record<string, string>; // path -> newPath
    addFields?: Record<string, any>;  // Static fields to add
  };
  // Webhook for custom mode
  webhook?: {
    url: string;
    method: 'POST' | 'PUT' | 'PATCH';
    headers?: Record<string, string>;
  };
  // Declarative success/error handling
  success: ActionSuccessConfig;
  error: ActionErrorConfig;
}

/**
 * Delete action configuration
 */
export interface DeleteConfig {
  enabled: boolean;
  confirm: {
    title: string;
    message: string;
    confirmLabel?: string;            // "Delete" by default
    cancelLabel?: string;             // "Cancel" by default
  };
  // Soft delete vs hard delete
  softDelete?: {
    enabled: boolean;
    field: string;                    // e.g., "deletedAt" or "isDeleted"
    value: any;                       // e.g., new Date() or true
  };
  success: ActionSuccessConfig;
  error: ActionErrorConfig;
}

/**
 * Form lifecycle configuration - behavior per mode
 */
export interface FormLifecycle {
  create?: {
    defaults?: Record<string, any>;   // Default values for new documents
    onSubmit: SubmitConfig;
  };
  edit?: {
    onSubmit: SubmitConfig;
    onDelete?: DeleteConfig;
    // Fields that cannot be edited (read-only in edit mode)
    immutableFields?: string[];
  };
  view?: {
    // Actions available in view mode
    actions?: FormViewAction[];
  };
  clone?: {
    // Fields to clear when cloning
    clearFields?: string[];
    onSubmit: SubmitConfig;
  };
}

/**
 * Actions available in view mode
 */
export interface FormViewAction {
  id: string;
  label: string;
  icon?: string;
  action: 'edit' | 'clone' | 'delete' | 'navigate' | 'custom';
  target?: string;                    // URL for navigate
  condition?: string;                 // Formula to show/hide action
}

/**
 * Field behavior overrides per mode
 */
export interface FieldModeConfig {
  // Per-mode visibility
  visibleIn?: FormMode[];             // e.g., ['create', 'edit'] - hidden in view
  // Per-mode editability
  editableIn?: FormMode[];            // e.g., ['create'] - readonly in edit
  // Per-mode requirement
  requiredIn?: FormMode[];            // e.g., ['create', 'edit'] - optional in view
}

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
  field: string;           // Path of the field to check
  operator: ConditionOperator;
  value?: any;             // Value to compare against (not needed for isEmpty/isNotEmpty/isTrue/isFalse)
}

export interface ConditionalLogic {
  action: 'show' | 'hide';
  logicType: 'all' | 'any';  // all = AND, any = OR
  conditions: FieldCondition[];
}

// Lookup field configuration for cross-collection references
export interface LookupConfig {
  collection: string;           // Source collection to fetch options from
  displayField: string;         // Field to display in dropdown (e.g., "name")
  valueField: string;           // Field to store as value (e.g., "_id")
  filterField?: string;         // Optional: field to filter by (for cascading)
  filterSourceField?: string;   // Optional: field in current form that provides filter value
  searchable?: boolean;         // Enable search/autocomplete
  multiple?: boolean;           // Allow multiple selections
  preloadOptions?: boolean;     // Load all options upfront vs. search-on-type
}

// Computed field configuration for formula-based fields
export interface ComputedConfig {
  formula: string;              // Formula expression (e.g., "price * quantity")
  dependencies: string[];       // Field paths this computation depends on
  outputType: 'string' | 'number' | 'boolean';
}

// Repeater field schema definition
export interface RepeaterItemField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select';
  label: string;
  required?: boolean;
  options?: string[];           // For select type
  placeholder?: string;
}

// Repeater/Sub-form configuration for array fields
export interface RepeaterConfig {
  enabled: boolean;
  minItems: number;
  maxItems: number;
  itemSchema: RepeaterItemField[];
  allowDuplication: boolean;
  collapsible: boolean;
}

// URL Parameter configuration for pre-filling form fields from URL query parameters
export interface URLParamConfig {
  paramName: string;              // URL parameter name to read (e.g., "ref", "source", "userId")
  defaultValue?: any;             // Default value if parameter not present
  dataType: 'string' | 'number' | 'boolean' | 'json';  // How to parse the value
  hidden?: boolean;               // If true, field is not visible but value is captured
  readonly?: boolean;             // If true, user cannot modify the pre-filled value
  fallbackField?: string;         // Another field path to use as fallback value
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'none';  // Transform the value
  validation?: {
    allowedValues?: string[];     // Only accept specific values
    pattern?: string;             // Regex pattern to validate
    required?: boolean;           // Whether parameter must be present
  };
}

// ============================================
// MongoDB Data Modeling Patterns
// ============================================

/**
 * Array pattern types for better UX rendering
 * - key-value: Attribute Pattern - array of {key, value} pairs
 * - tags: Simple string array rendered as tags/chips
 * - references: Extended Reference Pattern - array of {_id, displayField}
 * - custom-objects: Generic array of objects with defined schema
 */
export type ArrayPattern = 'key-value' | 'tags' | 'references' | 'custom-objects' | 'primitive';

/**
 * Configuration for array pattern rendering
 */
export interface ArrayPatternConfig {
  pattern: ArrayPattern;
  // For key-value pattern
  keyField?: string;           // Field name for key (default: 'key')
  valueField?: string;         // Field name for value (default: 'value')
  keyLabel?: string;           // Display label for key column
  valueLabel?: string;         // Display label for value column
  valueType?: 'string' | 'number' | 'boolean' | 'mixed';  // Type of values
  // For tags pattern
  suggestions?: string[];      // Suggested tags for autocomplete
  allowCustom?: boolean;       // Allow custom tags not in suggestions
  // For references pattern
  displayFields?: string[];    // Fields to show from referenced doc
  // For custom-objects pattern
  objectSchema?: RepeaterItemField[];  // Schema for object fields
}

// Field source - whether from schema or custom-created
export type FieldSource = 'schema' | 'custom' | 'variable';

// ============================================
// Layout Fields (Non-Data Display Elements)
// ============================================

/**
 * Layout field types - display-only, no data binding
 * Similar to Google Forms section headers, descriptions, etc.
 */
export type LayoutFieldType =
  | 'section-header'  // Title + description to organize sections
  | 'description'     // Text block for instructions/info
  | 'divider'         // Visual separator line
  | 'image'           // Display an image
  | 'spacer';         // Empty space

/**
 * Configuration for layout fields
 */
export interface LayoutConfig {
  type: LayoutFieldType;
  // For section-header
  title?: string;
  subtitle?: string;
  // For description
  content?: string;        // Markdown or plain text
  contentType?: 'text' | 'markdown' | 'html';
  // For image
  imageUrl?: string;
  imageAlt?: string;
  imageWidth?: number | 'full' | 'auto';
  imageAlignment?: 'left' | 'center' | 'right';
  // For spacer
  height?: number;         // Height in pixels
  // Styling
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  padding?: number;
}

// Field width options for multi-field row layouts
export type FieldWidth = 'full' | 'half' | 'third' | 'quarter';

export interface FieldConfig {
  path: string;
  label: string;
  type: string;
  included: boolean;
  required: boolean;
  defaultValue?: any;
  placeholder?: string;
  source?: FieldSource;         // Where this field came from (default: 'schema')
  includeInDocument?: boolean;  // Whether to include in final document (default: true for schema, configurable for custom)
  fieldWidth?: FieldWidth;      // Width of field in form layout (default: 'full')
  validation?: {
    // Number validation
    min?: number;
    max?: number;
    decimalsAllowed?: boolean;
    // Text validation
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    // Scale/Rating specific
    lowLabel?: string;           // Label for minimum value (e.g., "Not at all likely")
    highLabel?: string;          // Label for maximum value (e.g., "Extremely likely")
    ratingStyle?: 'stars' | 'hearts' | 'thumbs' | 'emojis' | 'numbers';
    scaleDisplayStyle?: 'buttons' | 'slider' | 'radio';  // How to display scale/rating
    showValue?: boolean;         // Show the current value for sliders
    showLabels?: boolean;        // Show min/max labels
    step?: number;               // Step increment for slider
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
    allowedTypes?: string[];     // MIME types allowed (e.g., ['image/jpeg', 'image/png'])
    maxSize?: number;            // Maximum file size in MB
    multiple?: boolean;          // Allow multiple file uploads
    maxFiles?: number;           // Maximum number of files (when multiple is true)
    // Color picker settings
    colorFormat?: 'hex' | 'rgb' | 'hsl';
    showAlpha?: boolean;         // Allow alpha/opacity selection
    presetColors?: string[];     // Preset color swatches
    presetsOnly?: boolean;       // Only allow preset colors
    pickerStyle?: 'chrome' | 'sketch' | 'compact' | 'block' | 'swatches';
    // Email settings
    allowMultipleEmails?: boolean;  // Allow comma-separated emails
    blockDisposable?: boolean;      // Block disposable email domains
    allowedDomains?: string[];      // Whitelist of allowed domains
    blockedDomains?: string[];      // Blacklist of blocked domains
    confirmEmail?: boolean;         // Require email confirmation field
    // URL settings
    requireHttps?: boolean;         // Require HTTPS protocol
    allowedProtocols?: string[];    // Allowed protocols (http, https, ftp, etc.)
    showUrlPreview?: boolean;       // Show link preview
    // Phone settings
    defaultCountry?: string;        // Default country code (e.g., 'US')
    phoneFormat?: 'national' | 'international' | 'e164';
    showCountrySelector?: boolean;  // Show country dropdown
    allowedCountries?: string[];    // Restrict to specific countries
    // Time settings
    timeFormat?: '12h' | '24h';
    minuteStep?: number;            // Minute interval (e.g., 15 for quarter hours)
    minTime?: string;               // Earliest allowed time
    maxTime?: string;               // Latest allowed time
    showSeconds?: boolean;          // Include seconds in picker
    // Signature settings
    strokeColor?: string;           // Pen color
    strokeWidth?: number;           // Pen thickness
    canvasWidth?: number;           // Canvas width in pixels
    canvasHeight?: number;          // Canvas height in pixels
    backgroundColor?: string;       // Canvas background
    allowTypedSignature?: boolean;  // Allow typing name as signature
    outputFormat?: 'png' | 'svg' | 'base64';
    // Tags settings
    tagSuggestions?: string[];      // Auto-complete suggestions
    allowCustomTags?: boolean;      // Allow creating new tags
    minTags?: number;               // Minimum required tags
    maxTags?: number;               // Maximum allowed tags
    maxTagLength?: number;          // Max characters per tag
    tagCaseHandling?: 'preserve' | 'lowercase' | 'uppercase';
    createTagOnEnter?: boolean;     // Create tag on Enter key
    createTagOnComma?: boolean;     // Create tag on comma
    // Slider specific settings
    showTicks?: boolean;            // Show tick marks
    tickInterval?: number;          // Interval between ticks
    valuePosition?: 'above' | 'below' | 'tooltip';  // Where to show value
    showMinMax?: boolean;           // Show min/max labels
    sliderMarks?: Array<{ value: number; label: string }>;  // Custom marks
    trackColor?: string;            // Slider track color
    rangeSelection?: boolean;       // Enable range (two handles)
    // Opinion scale settings
    scaleType?: 'agreement' | 'satisfaction' | 'frequency' | 'importance' | 'likelihood' | 'custom';
    showNeutral?: boolean;          // Show neutral option
    neutralLabel?: string;          // Label for neutral option
    opinionDisplayStyle?: 'buttons' | 'emojis' | 'icons' | 'radio';
    // Multiple choice / Checkboxes settings
    choiceLayout?: 'vertical' | 'horizontal' | 'grid';
    choiceColumns?: number;         // Number of columns for grid layout
    randomizeOptions?: boolean;     // Randomize option order
    allowOther?: boolean;           // Allow "Other" option with text input
    otherLabel?: string;            // Label for "Other" option
    showImages?: boolean;           // Show images with options
    imageSize?: 'small' | 'medium' | 'large';
    minSelections?: number;         // Minimum selections (checkboxes)
    maxSelections?: number;         // Maximum selections (checkboxes)
    showSelectAll?: boolean;        // Show "Select All" option
    // Dropdown / Select / Multiple Choice settings
    options?: Array<string | { value: any; label: string }>;  // Static options for select/radio/checkbox fields
    searchable?: boolean;           // Enable search/filter
    allowCreate?: boolean;          // Allow creating new options
    clearable?: boolean;            // Show clear button
    groupedOptions?: boolean;       // Group options by category
    // Image upload specific
    enableCrop?: boolean;           // Enable image cropping
    cropAspectRatio?: number;       // Aspect ratio for cropping
    minImageWidth?: number;         // Minimum image width
    minImageHeight?: number;        // Minimum image height
    maxImageWidth?: number;         // Maximum image width
    maxImageHeight?: number;        // Maximum image height
    enableCompression?: boolean;    // Compress images
    compressionQuality?: number;    // 0-1 compression quality
    // Matrix settings
    matrixRows?: Array<{ id: string; label: string }>;
    matrixColumns?: Array<{ id: string; label: string; value?: any }>;
    matrixCellType?: 'radio' | 'checkbox' | 'dropdown' | 'text' | 'number';
    requireAllRows?: boolean;       // Require all rows to be answered
    onePerColumn?: boolean;         // Only one selection per column
    randomizeRows?: boolean;
    randomizeColumns?: boolean;
    // Ranking settings
    rankingItems?: Array<{ id: string; label: string; imageUrl?: string }>;
    minRank?: number;               // Minimum items to rank
    maxRank?: number;               // Maximum items to rank
    showRankNumbers?: boolean;
    dragStyle?: 'list' | 'cards' | 'grid';
    allowTies?: boolean;            // Allow same rank for multiple items
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
  };
  conditionalLogic?: ConditionalLogic;
  lookup?: LookupConfig;        // For lookup/reference fields
  computed?: ComputedConfig;    // For computed/formula fields
  repeater?: RepeaterConfig;    // For repeater/sub-form fields
  modeConfig?: FieldModeConfig; // Per-mode behavior overrides
  arrayPattern?: ArrayPatternConfig;  // MongoDB data pattern for array fields
  layout?: LayoutConfig;        // Layout field configuration (non-data display elements)
  urlParam?: URLParamConfig;    // URL parameter configuration for pre-filling fields
  encryption?: FieldEncryptionConfig;  // Field-level encryption (Queryable Encryption)
}

// Form variable definition - for state management
export interface FormVariable {
  name: string;                 // Variable name (e.g., "selectedCategory")
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  defaultValue?: any;
  description?: string;
  // How the variable gets its value
  valueSource?: {
    type: 'static' | 'field' | 'lookup' | 'formula' | 'url-param';
    fieldPath?: string;         // For 'field' type - which field to watch
    formula?: string;           // For 'formula' type
    lookupConfig?: LookupConfig; // For 'lookup' type
    paramName?: string;         // For 'url-param' type
  };
}

// Event action - what happens when an event occurs
export interface FormAction {
  type: 'set-variable' | 'set-field' | 'show-message' | 'navigate' | 'api-call';
  target?: string;              // Variable name or field path
  value?: any;                  // Static value or formula
  formula?: string;             // Dynamic value calculation
  message?: string;             // For show-message
  url?: string;                 // For navigate or api-call
}

// Event trigger configuration
export interface FormEvent {
  trigger: 'field-change' | 'form-load' | 'form-submit' | 'button-click' | 'variable-change';
  sourceField?: string;         // For field-change trigger
  sourceVariable?: string;      // For variable-change trigger
  condition?: string;           // Optional condition formula
  actions: FormAction[];
}

// ============================================
// Form Data Source (Secure Connection Reference)
// ============================================

/**
 * Secure reference to a MongoDB connection.
 * The actual connection string is stored encrypted in the Connection Vault.
 * Forms only store the vaultId reference - never the connection string itself.
 */
export interface FormDataSource {
  vaultId: string;                    // Reference to ConnectionVault entry
  collection: string;                 // Target collection for submissions
}

// ============================================
// Form Access Control
// ============================================

/**
 * Authentication methods supported for form access
 */
export type FormAuthMethod = 'google' | 'github' | 'magic-link' | 'passkey';

/**
 * Access control type for published forms
 */
export type FormAccessType = 'public' | 'authenticated' | 'restricted';

/**
 * Controls who can access and submit a published form
 */
export interface FormAccessControl {
  type: FormAccessType;

  // For authenticated/restricted forms - which auth methods are allowed
  authMethods?: FormAuthMethod[];

  // For restricted forms only - who can access
  allowedDomains?: string[];          // Email domains (e.g., ["acme.com", "partner.org"])
  allowedUsers?: string[];            // Specific user IDs
  allowedEmails?: string[];           // Specific email addresses
}

export interface FormConfiguration {
  id?: string;
  name: string;
  description?: string;
  collection: string;
  database: string;
  fieldConfigs: FieldConfig[];
  variables?: FormVariable[];     // Form-level variables for state management
  events?: FormEvent[];           // Event handlers for form interactions
  createdAt?: string;
  updatedAt?: string;
  // Form type and search configuration
  formType?: FormType;            // What kind of form this is (default: 'data-entry')
  searchConfig?: SearchConfig;    // Search/filter configuration for search forms
  // Publishing configuration
  slug?: string;                  // URL-friendly identifier for public access
  isPublished?: boolean;          // Whether the form is publicly accessible
  publishedAt?: string;           // When the form was first published

  // ============================================
  // NEW: Secure Data Source (Production)
  // ============================================
  // Use dataSource instead of connectionString for production deployments.
  // dataSource references an encrypted connection in the vault.
  dataSource?: FormDataSource;

  // NEW: Access control for published forms
  accessControl?: FormAccessControl;

  // NEW: Organization ownership
  organizationId?: string;        // Which org owns this form
  createdBy?: string;             // User who created the form

  // ============================================
  // LEGACY: Direct connection (Development only)
  // ============================================
  // @deprecated Use dataSource instead. This field is for backward compatibility
  // and local development only. In production, use the Connection Vault.
  connectionString?: string;      // MongoDB connection for submissions

  // Styling options
  theme?: FormTheme;
  branding?: FormBranding;
  // Multi-page form configuration
  multiPage?: MultiPageConfig;
  // Versioning
  currentVersion?: number;        // Current version number
  versions?: FormVersion[];       // Version history (stored separately in production)
  // Form lifecycle - submission, delete, mode-specific behavior
  lifecycle?: FormLifecycle;
  // Response permissions
  responsePermissions?: {
    whoCanView: 'owner' | 'team' | 'public';
    whoCanExport: 'owner' | 'team';
    whoCanDelete: 'owner' | 'team';
  };
  // Team collaboration (legacy - use permissions in platform for production)
  collaborators?: Array<{
    userId: string;
    role: 'viewer' | 'editor' | 'analyst' | 'owner';
  }>;

  // ============================================
  // Bot Protection & Drafts (Competitive Features)
  // ============================================

  // Bot/spam protection for public forms
  botProtection?: BotProtectionConfig;

  // Auto-save and draft recovery settings
  draftSettings?: DraftSettings;

  // ============================================
  // Queryable Encryption (Ultra-sensitive Data)
  // ============================================

  // Collection-level encryption configuration
  // Enables MongoDB Queryable Encryption for forms with sensitive data
  collectionEncryption?: CollectionEncryptionConfig;

  // ============================================
  // Form Automation & Hooks (Actions & Automation)
  // ============================================

  // User-friendly automation configuration
  // Pre-fill, post-submit actions, webhooks, redirects
  hooks?: import('./formHooks').FormHooksConfig;
}

// Form header configuration (Google Forms-style header image and colors)
export interface FormHeader {
  // Header type
  type: 'none' | 'color' | 'gradient' | 'image';
  // Solid color or gradient start color
  color?: string;
  // Gradient end color (only for gradient type)
  gradientEndColor?: string;
  // Gradient direction
  gradientDirection?: 'to-right' | 'to-bottom' | 'to-bottom-right' | 'to-bottom-left';
  // Image URL (only for image type)
  imageUrl?: string;
  // Image position/fit
  imageFit?: 'cover' | 'contain' | 'fill';
  imagePosition?: 'center' | 'top' | 'bottom';
  // Header height
  height?: number; // in pixels, default 200
  // Corner radius
  borderRadius?: number; // in pixels, default 8
  // Overlay for image headers (to improve text readability)
  overlay?: boolean;
  overlayColor?: string;
  overlayOpacity?: number; // 0-1
  // Text styling on header
  showTitle?: boolean;
  showDescription?: boolean;
  titleColor?: string;
  descriptionColor?: string;
}

// Theme configuration for published forms
export interface FormTheme {
  // Preset theme ID (optional - if set, uses preset values)
  preset?: string;
  // Header configuration (Google Forms-style)
  header?: FormHeader;
  // Page background (full page behind the form)
  pageBackgroundColor?: string;
  pageBackgroundGradient?: string;  // CSS gradient string, e.g., "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  pageBackgroundImage?: string;     // URL to background image
  pageBackgroundSize?: 'cover' | 'contain' | 'auto';
  pageBackgroundPosition?: string;  // e.g., "center center"
  // Colors (form card)
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;         // Form card background
  surfaceColor?: string;
  textColor?: string;
  textSecondaryColor?: string;
  errorColor?: string;
  successColor?: string;
  // Typography
  fontFamily?: string;
  headingFontFamily?: string;
  fontSize?: 'small' | 'medium' | 'large';
  // Layout
  borderRadius?: number;
  spacing?: 'compact' | 'comfortable' | 'spacious';
  maxWidth?: number;
  // Input styling
  inputStyle?: 'outlined' | 'filled' | 'standard';
  inputBorderRadius?: number;
  // Buttons
  buttonStyle?: 'contained' | 'outlined' | 'text';
  buttonBorderRadius?: number;
  // Effects
  elevation?: 0 | 1 | 2 | 3 | 4;
  glassmorphism?: boolean;
  // Dark mode
  mode?: 'light' | 'dark' | 'auto';
}

// Preset theme definition
export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  category: 'professional' | 'creative' | 'minimal' | 'bold' | 'nature' | 'tech';
  theme: FormTheme;
  preview?: {
    gradient?: string;
    accent?: string;
  };
}

// Branding for published forms
export interface FormBranding {
  logoUrl?: string;
  companyName?: string;
  showPoweredBy?: boolean;
  customCss?: string;
}

// Form submission record
export interface FormSubmission {
  id: string;
  formId: string;
  formName: string;
  formVersion?: number;
  data: Record<string, any>;
  status: 'submitted' | 'draft' | 'incomplete';
  submittedAt: string;
  startedAt?: string;
  completedAt?: string;
  completionTime?: number; // seconds
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    deviceType?: 'mobile' | 'desktop' | 'tablet';
    browser?: string;
    os?: string;
    geolocation?: { lat: number; lng: number };
  };
  customMetadata?: Record<string, any>;
}

// Extended response storage schema for MongoDB
export interface FormResponse {
  _id?: string;
  formId: string;
  formVersion: number;
  data: Record<string, any>;
  status: 'submitted' | 'draft' | 'incomplete';
  submittedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  completionTime?: number; // seconds
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    deviceType?: 'mobile' | 'desktop' | 'tablet';
    browser?: string;
    os?: string;
    referrer?: string;
    geolocation?: { lat: number; lng: number };
  };
  customMetadata?: Record<string, any>;
}

// Analytics response schema
export interface FormAnalytics {
  formId: string;
  totalResponses: number;
  completionRate: number;
  averageCompletionTime: number;
  responseTrend: Array<{ date: string; count: number }>;
  fieldStats: Record<string, FieldStatistics>;
  deviceBreakdown: Record<string, number>;
  timeRange: { start: Date; end: Date };
  calculatedAt: Date;
}

// Field-level statistics
export interface FieldStatistics {
  fieldPath: string;
  fieldType: string;
  totalResponses: number;
  completionRate: number;
  // Type-specific stats
  textStats?: {
    averageLength: number;
    wordCount: number;
    commonWords?: Array<{ word: string; count: number }>;
  };
  numberStats?: {
    min: number;
    max: number;
    average: number;
    median: number;
    distribution?: Array<{ range: string; count: number }>;
  };
  choiceStats?: {
    options?: Array<{ value: string; count: number; percentage: number }>;
    distribution?: Record<string, number>;
    percentages?: Record<string, number>;
  };
  dateStats?: {
    earliest: Date;
    latest: Date;
    mostCommon?: Array<{ date: string; count: number }>;
  };
  booleanStats?: {
    trueCount: number;
    falseCount: number;
    truePercentage: number;
    falsePercentage: number;
  };
  // Drop-off analytics (populated when field interactions are tracked)
  dropOff?: FieldDropOffStats;
}

// ============================================
// Form Versioning
// ============================================

export interface FormVersion {
  id: string;
  formId: string;
  version: number;
  name: string;
  description?: string;
  fieldConfigs: FieldConfig[];
  pages?: FormPage[];
  variables?: FormVariable[];
  events?: FormEvent[];
  createdAt: string;
  createdBy?: string;
  changeNotes?: string;
  // Snapshot of key settings at time of version
  isPublished?: boolean;
}

// ============================================
// Multi-Page Forms
// ============================================

export interface FormPage {
  id: string;
  title: string;
  description?: string;
  fields: string[];              // Array of field paths that belong to this page
  order: number;
  // Navigation settings
  showInNavigation?: boolean;    // Show in step indicator
  // Conditional page visibility
  conditionalLogic?: ConditionalLogic;
  // Custom navigation button labels
  nextLabel?: string;
  prevLabel?: string;
}

export interface MultiPageConfig {
  enabled: boolean;
  pages: FormPage[];
  // Navigation style
  showStepIndicator?: boolean;
  stepIndicatorStyle?: 'dots' | 'numbers' | 'progress' | 'tabs';
  // Allow jumping between pages
  allowJumpToPage?: boolean;
  // Validate each page before proceeding
  validateOnPageChange?: boolean;
  // Show page titles
  showPageTitles?: boolean;
  // Completion settings
  submitButtonLabel?: string;
  showReviewPage?: boolean;
}

// ============================================
// Bot Protection
// ============================================

/**
 * Bot protection configuration for published forms.
 * Combines multiple layers: honeypot fields, timing validation,
 * and optional Cloudflare Turnstile for enterprise-grade protection.
 */
export interface BotProtectionConfig {
  enabled: boolean;

  // Honeypot field - invisible field that bots fill but humans don't
  honeypot?: {
    enabled: boolean;
    fieldName?: string;           // Custom field name (randomized if not set)
  };

  // Timing validation - detect instant submissions
  timing?: {
    enabled: boolean;
    minSubmitTime?: number;       // Minimum seconds before submit allowed (default: 3)
    maxSubmitTime?: number;       // Maximum seconds (detect stale/copy-paste, default: 3600)
  };

  // Cloudflare Turnstile - modern, privacy-focused CAPTCHA alternative
  turnstile?: {
    enabled: boolean;
    siteKey: string;              // Cloudflare Turnstile site key
    appearance?: 'always' | 'execute' | 'interaction-only';
    theme?: 'light' | 'dark' | 'auto';
    action?: string;              // Custom action name for analytics
  };
}

// ============================================
// Auto-save Drafts
// ============================================

/**
 * Draft/auto-save configuration for forms.
 * Enables partial submission capture and form recovery.
 */
export interface DraftSettings {
  enabled: boolean;
  autoSaveInterval: number;       // Seconds between auto-saves (default: 30)
  storageType: 'local' | 'server' | 'both';  // Where to store drafts
  showRecoveryPrompt: boolean;    // Prompt user to restore draft on return
  draftTTL: number;               // Days to keep drafts before expiry (default: 7)
  showSaveIndicator?: boolean;    // Show "Saved" indicator in UI
}

/**
 * Form draft record - stored in localStorage or server.
 * Captures partial form progress for recovery.
 */
export interface FormDraft {
  id: string;                     // Unique draft ID
  formId: string;                 // Which form this draft is for
  formVersion?: number;           // Version of the form
  data: Record<string, any>;      // Current field values
  currentPage: number;            // Current page index (for multi-page forms)
  fieldInteractions: Record<string, FieldInteractionData>;  // For drop-off tracking
  startedAt: string;              // ISO timestamp when form was started
  lastSavedAt: string;            // ISO timestamp of last save
  expiresAt: string;              // ISO timestamp when draft expires
  sessionId?: string;             // Session ID for server-side matching
  fingerprint?: string;           // Browser fingerprint for anonymous identification
}

/**
 * Field interaction tracking data for a single field.
 * Used for drop-off analytics and draft recovery.
 */
export interface FieldInteractionData {
  firstViewedAt?: number;         // Timestamp when field came into view
  firstFocusAt?: number;          // Timestamp when field was first focused
  lastBlurAt?: number;            // Timestamp when field lost focus
  totalFocusTime?: number;        // Total milliseconds spent focused
  changeCount?: number;           // Number of times value changed
  completed?: boolean;            // Whether field has a valid value
}

// ============================================
// Field Drop-off Analytics
// ============================================

/**
 * Drop-off statistics for a single field.
 * Shows where users abandon the form.
 */
export interface FieldDropOffStats {
  viewCount: number;              // Users who saw this field
  interactionCount: number;       // Users who focused/clicked on this field
  completionCount: number;        // Users who filled in this field
  abandonmentCount: number;       // Users who abandoned at this field
  abandonmentRate: number;        // Percentage of users who abandoned here
  averageTimeSpent: number;       // Average seconds spent on this field
  errorCount?: number;            // Validation errors encountered
}

/**
 * Field interaction event record.
 * Sent to analytics endpoint on submit or abandon.
 */
export interface FieldInteractionEvent {
  formId: string;
  sessionId: string;              // Anonymous session ID
  fieldPath: string;
  eventType: 'view' | 'focus' | 'blur' | 'change' | 'error' | 'complete';
  timestamp: string;              // ISO timestamp
  value?: {
    isEmpty: boolean;             // Whether field is empty (not the actual value for privacy)
    isValid: boolean;             // Whether validation passed
  };
  metadata?: {
    pageIndex?: number;           // For multi-page forms
    timeOnField?: number;         // Milliseconds spent on this field
  };
}

/**
 * Aggregated analytics for form field drop-off.
 */
export interface FormDropOffAnalytics {
  formId: string;
  totalSessions: number;          // Total form sessions started
  completedSessions: number;      // Sessions that submitted successfully
  abandonedSessions: number;      // Sessions that abandoned
  averageCompletionTime: number;  // Seconds for completed submissions
  fieldDropOff: Record<string, FieldDropOffStats>;  // Per-field stats
  dropOffByPage?: Record<number, {  // Per-page stats for multi-page forms
    pageIndex: number;
    pageTitle: string;
    abandonmentCount: number;
    abandonmentRate: number;
  }>;
  calculatedAt: string;           // ISO timestamp
}

