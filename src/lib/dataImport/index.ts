/**
 * Data Import Module
 *
 * This module provides functionality for importing data from various formats
 * (CSV, TSV, JSON, JSONL, Excel) into MongoDB collections.
 *
 * Features:
 * - Multi-format file parsing
 * - Schema inference from data
 * - Column mapping and transformation
 * - Batch import with progress tracking
 * - Form generation from imported data
 */

// Parser exports
export {
  parseData,
  parseDelimited,
  parseJSON,
  parseJSONL,
  parseExcel,
  detectFormat,
  detectDelimiter,
  getPreview,
  type ParsedRecord,
  type ParseResult,
  type ParseError,
  type ParseOptions,
} from './parser';

// Schema inference exports
export {
  inferSchema,
  generateDefaultMappings,
  validateMappings,
} from './schemaInference';

// Transformer exports
export {
  transformRecord,
  transformBatch,
  validateTransformResult,
  type TransformResult,
  type BatchTransformResult,
} from './transformer';

// Import service exports
export {
  ImportService,
  type ImportServiceConfig,
} from './importService';

// Connection helper exports
export {
  getTargetClient,
  createTargetClientGetter,
  closeClient,
  closeAllClients,
} from './connectionHelper';
