// ============================================
// Data Import Types
// ============================================

import { ObjectId } from 'mongodb';
import { FieldConfig } from './form';

// ============================================
// Import Source Types
// ============================================

/**
 * Supported file formats for data import
 */
export type ImportFileFormat = 'csv' | 'tsv' | 'json' | 'jsonl' | 'xlsx' | 'xls';

/**
 * Delimiter options for delimited files
 */
export type DelimiterType = ',' | '\t' | ';' | '|' | 'custom';

/**
 * Import source configuration
 */
export interface ImportSourceConfig {
  format: ImportFileFormat;
  // For CSV/TSV
  delimiter?: DelimiterType;
  customDelimiter?: string;
  hasHeader?: boolean;
  skipRows?: number;
  encoding?: 'utf-8' | 'utf-16' | 'iso-8859-1' | 'ascii';
  // For Excel
  sheetName?: string;
  sheetIndex?: number;
  // For JSON/JSONL
  rootPath?: string; // JSONPath to array of records
  // Date parsing
  dateFormats?: string[];
  timezone?: string;
}

// ============================================
// Schema Inference
// ============================================

/**
 * Inferred data types from sample data
 */
export type InferredDataType =
  | 'string'
  | 'number'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'time'
  | 'email'
  | 'url'
  | 'phone'
  | 'objectId'
  | 'array'
  | 'object'
  | 'null'
  | 'mixed';

/**
 * Field statistics from sample data
 */
export interface InferredFieldStats {
  totalValues: number;
  nullCount: number;
  uniqueCount: number;
  sampleValues: any[];
  // For numeric fields
  minValue?: number;
  maxValue?: number;
  avgValue?: number;
  // For string fields
  minLength?: number;
  maxLength?: number;
  avgLength?: number;
  // For arrays
  avgArrayLength?: number;
}

/**
 * Inferred field schema from data analysis
 */
export interface InferredField {
  originalName: string;       // Original column/field name in source
  suggestedPath: string;      // Suggested MongoDB field path
  suggestedLabel: string;     // Human-friendly label
  inferredType: InferredDataType;
  confidence: number;         // 0-1 confidence score
  stats: InferredFieldStats;
  // Type detection details
  typeBreakdown: Record<InferredDataType, number>; // Count per type
  isRequired: boolean;        // No null values found
  isUnique: boolean;          // All values unique (potential key)
  // Pattern detection
  detectedPatterns?: {
    pattern: string;
    matchPercentage: number;
  }[];
  // Suggestions
  suggestedValidation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];       // For enum/select fields
  };
}

/**
 * Complete inferred schema from data
 */
export interface InferredSchema {
  fields: InferredField[];
  sampleSize: number;
  totalRecords: number;
  suggestedCollection: string;
  warnings: SchemaWarning[];
}

export interface SchemaWarning {
  type: 'duplicate_column' | 'empty_column' | 'mixed_types' | 'encoding_issue' | 'date_parse_failure';
  field?: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

// ============================================
// Column Mapping
// ============================================

/**
 * How to handle a source column during import
 */
export type ColumnAction = 'import' | 'skip' | 'merge' | 'split';

/**
 * Data transformation to apply during import
 */
export interface ColumnTransform {
  type:
    | 'trim'
    | 'uppercase'
    | 'lowercase'
    | 'titlecase'
    | 'parseNumber'
    | 'parseDate'
    | 'parseBoolean'
    | 'parseJSON'
    | 'splitToArray'
    | 'joinFromArray'
    | 'regex'
    | 'template'
    | 'default'
    | 'nullIfEmpty'
    | 'objectId';
  // For regex
  pattern?: string;
  replacement?: string;
  // For split/join
  separator?: string;
  // For template
  template?: string;           // e.g., "{{firstName}} {{lastName}}"
  // For default
  defaultValue?: any;
  // For parseDate
  inputFormat?: string;
  outputFormat?: string;
  // For parseBoolean
  trueValues?: string[];       // e.g., ['yes', 'true', '1', 'Y']
  falseValues?: string[];      // e.g., ['no', 'false', '0', 'N']
}

/**
 * Mapping configuration for a single column
 */
export interface ColumnMapping {
  sourceColumn: string;        // Original column name
  action: ColumnAction;
  // For 'import' action
  targetPath?: string;         // MongoDB field path
  targetType?: string;         // Form field type
  transforms?: ColumnTransform[];
  // For 'merge' action
  mergeWith?: string[];        // Other columns to merge with
  mergeSeparator?: string;
  // For 'split' action
  splitInto?: {
    targetPath: string;
    extractPattern: string;    // Regex group or index
  }[];
  // Validation
  required?: boolean;
  skipIfEmpty?: boolean;
}

/**
 * Complete mapping configuration for an import job
 */
export interface ImportMappingConfig {
  mappings: ColumnMapping[];
  // Global settings
  skipDuplicates?: boolean;
  duplicateKey?: string[];     // Fields that define uniqueness
  upsertOnDuplicate?: boolean;
  // Computed fields (fields not in source)
  computedFields?: {
    targetPath: string;
    expression: string;        // Template or formula
    type: string;
  }[];
  // Static fields (same value for all records)
  staticFields?: {
    targetPath: string;
    value: any;
  }[];
}

// ============================================
// Import Job
// ============================================

/**
 * Import job status
 */
export type ImportJobStatus =
  | 'pending'      // Awaiting start
  | 'uploading'    // File being uploaded
  | 'analyzing'    // Schema inference in progress
  | 'mapping'      // Waiting for user to confirm mapping
  | 'validating'   // Validating data against mapping
  | 'importing'    // Import in progress
  | 'completed'    // Successfully completed
  | 'failed'       // Failed with errors
  | 'cancelled'    // Cancelled by user
  | 'paused';      // Paused (can be resumed)

/**
 * Validation error for a single row
 */
export interface ImportRowError {
  rowNumber: number;
  column?: string;
  value?: any;
  error: string;
  errorCode:
    | 'TYPE_MISMATCH'
    | 'REQUIRED_MISSING'
    | 'VALIDATION_FAILED'
    | 'DUPLICATE'
    | 'TRANSFORM_FAILED'
    | 'UNKNOWN';
}

/**
 * Import progress tracking
 */
export interface ImportProgress {
  phase: 'upload' | 'analyze' | 'validate' | 'import';
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  skipCount: number;
  percentComplete: number;
  currentBatch?: number;
  totalBatches?: number;
  estimatedTimeRemaining?: number; // seconds
}

/**
 * Import job record (stored in database)
 */
export interface ImportJob {
  _id?: ObjectId;
  importId: string;             // "import_abc123"
  organizationId: string;
  createdBy: string;            // userId

  // Source info
  sourceFile: {
    name: string;
    size: number;
    mimeType: string;
    blobUrl?: string;           // Vercel Blob URL
    checksum?: string;          // MD5 for integrity
  };
  sourceConfig: ImportSourceConfig;

  // Target info
  targetVaultId: string;        // Connection vault reference
  targetDatabase: string;
  targetCollection: string;
  createCollection?: boolean;   // Create if doesn't exist

  // Schema & Mapping
  inferredSchema?: InferredSchema;
  mappingConfig?: ImportMappingConfig;
  generatedFieldConfigs?: FieldConfig[];  // For form generation

  // Status & Progress
  status: ImportJobStatus;
  progress: ImportProgress;

  // Results
  results?: {
    totalProcessed: number;
    inserted: number;
    updated: number;
    skipped: number;
    failed: number;
    errors: ImportRowError[];   // First N errors
    errorCount: number;         // Total error count
    sampleInserted?: any[];     // First few inserted docs
  };

  // Error handling
  errorHandling: {
    strategy: 'stop' | 'skip' | 'log';  // What to do on error
    maxErrors?: number;         // Stop after N errors
    errorLogUrl?: string;       // Full error log file
  };

  // Timestamps
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  updatedAt: Date;
}

// ============================================
// Data Collection Management
// ============================================

/**
 * Collection info from MongoDB
 */
export interface CollectionInfo {
  name: string;
  database: string;
  type: 'collection' | 'view' | 'timeseries';
  documentCount: number;
  storageSize: number;
  avgDocSize: number;
  indexes: IndexInfo[];
  // Schema info (if available)
  sampleSchema?: InferredSchema;
  jsonSchema?: Record<string, any>;
  // Metadata
  createdAt?: Date;
  lastModified?: Date;
}

export interface IndexInfo {
  name: string;
  key: Record<string, 1 | -1 | 'text' | '2dsphere'>;
  unique?: boolean;
  sparse?: boolean;
  expireAfterSeconds?: number;
}

/**
 * Database overview for an organization
 */
export interface DatabaseOverview {
  vaultId: string;
  name: string;
  collections: CollectionInfo[];
  totalDocuments: number;
  totalSize: number;
  lastScanned: Date;
}

// ============================================
// Form Generation from Data
// ============================================

/**
 * Options for generating a form from imported data
 */
export interface FormGenerationOptions {
  includeAllFields: boolean;
  fieldTypeOverrides?: Record<string, string>;
  excludeFields?: string[];
  formName?: string;
  formDescription?: string;
  formType?: 'data-entry' | 'search' | 'both';
  generateSearchConfig?: boolean;
  generateValidation?: boolean;
}

/**
 * Generated form configuration from import
 */
export interface GeneratedFormConfig {
  name: string;
  description: string;
  collection: string;
  database: string;
  fieldConfigs: FieldConfig[];
  dataSource: {
    vaultId: string;
    collection: string;
  };
  // Metadata
  generatedFrom: {
    importId: string;
    sourceFile: string;
    generatedAt: string;
  };
}

// ============================================
// Sample Data for Demo
// ============================================

/**
 * Sample database definition for demo
 */
export interface SampleDatabase {
  id: string;
  name: string;
  description: string;
  collections: SampleCollection[];
}

/**
 * Sample collection with data
 */
export interface SampleCollection {
  name: string;
  description: string;
  documentCount: number;
  schema: InferredField[];
  sampleDocuments: Record<string, any>[];
  suggestedForms: {
    type: 'data-entry' | 'search' | 'both';
    name: string;
    description: string;
  }[];
}

// ============================================
// API Types
// ============================================

export interface StartImportRequest {
  organizationId: string;
  vaultId: string;
  database: string;
  collection: string;
  createCollection?: boolean;
  sourceConfig: ImportSourceConfig;
}

export interface StartImportResponse {
  importId: string;
  uploadUrl: string;          // Presigned URL for file upload
  expiresAt: string;
}

export interface AnalyzeDataRequest {
  importId: string;
  sampleSize?: number;        // How many rows to analyze
}

export interface AnalyzeDataResponse {
  inferredSchema: InferredSchema;
  suggestedMappings: ColumnMapping[];
  preview: {
    headers: string[];
    rows: any[][];
    totalRows: number;
  };
}

export interface ConfigureMappingRequest {
  importId: string;
  mappingConfig: ImportMappingConfig;
  generateForm?: boolean;
  formOptions?: FormGenerationOptions;
}

export interface ConfigureMappingResponse {
  validationResult: {
    valid: boolean;
    errors: ImportRowError[];
    warnings: string[];
    sampleOutput: any[];      // Preview of transformed data
  };
}

export interface ExecuteImportRequest {
  importId: string;
  batchSize?: number;
  dryRun?: boolean;
}

export interface ExecuteImportResponse {
  status: ImportJobStatus;
  progress: ImportProgress;
  jobId: string;
}

export interface ImportStatusResponse {
  job: ImportJob;
  canResume: boolean;
  canCancel: boolean;
}
