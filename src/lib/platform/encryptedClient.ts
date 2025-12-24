/**
 * MongoDB Encrypted Client Factory
 *
 * Creates MongoClient instances configured for automatic field-level encryption
 * based on form field configurations. Supports MongoDB Queryable Encryption (QE)
 * for transparent encryption/decryption of sensitive form data.
 *
 * Usage:
 * 1. Configure encryption on fields in the form builder
 * 2. The submission handler will automatically use this factory
 * 3. Encrypted fields are stored as Binary data in MongoDB
 * 4. Queries on indexed encrypted fields work transparently
 */

import { MongoClient, AutoEncryptionOptions, ClientEncryption, Binary } from 'mongodb';
import { FormConfiguration, FieldConfig, FieldEncryptionConfig } from '@/types/form';
import {
  getKMSProviderCredentials,
  getKeyVaultNamespace,
  getOrCreateFormKey,
  getOrCreateFieldKey,
  getConfiguredKMSProvider,
  isQueryableEncryptionConfigured,
  createClientEncryption,
} from './encryptionKeys';

// ============================================
// Types
// ============================================

export interface EncryptedClientOptions {
  connectionString: string;
  organizationId: string;
  database: string;
  collection: string;
  // Either provide formConfig OR encryptedFields + formId
  formConfig?: FormConfiguration;
  // Alternative: provide stored encryption config for background sync
  encryptedFields?: Record<string, FieldEncryptionConfig>;
  collectionEncryption?: FormConfiguration['collectionEncryption'];
  formId?: string;
}

export interface EncryptionSchema {
  [namespace: string]: {
    bsonType: string;
    encryptMetadata?: {
      keyId: any[];
    };
    properties: Record<string, any>;
  };
}

export interface EncryptedFieldsMap {
  [namespace: string]: {
    fields: Array<{
      path: string;
      bsonType: string;
      keyId?: any;
      queries?: Array<{
        queryType: string;
        contention?: number;
        min?: any;
        max?: any;
      }>;
    }>;
  };
}

// ============================================
// Client Factory
// ============================================

/**
 * Create a MongoDB client configured for automatic field-level encryption
 */
export async function createEncryptedClient(
  options: EncryptedClientOptions
): Promise<MongoClient> {
  const { connectionString, organizationId, database, collection } = options;

  // Check if encryption is configured
  if (!isQueryableEncryptionConfigured()) {
    console.warn('[EncryptedClient] Queryable Encryption not configured, returning standard client');
    return new MongoClient(connectionString);
  }

  // Get encrypted fields - support both formConfig and stored encryptedFields
  let encryptedFieldsList: FieldConfig[];
  let effectiveFormId: string;
  let effectiveCollectionEncryption: FormConfiguration['collectionEncryption'];

  if (options.formConfig) {
    // Using full form config
    encryptedFieldsList = getEncryptedFields(options.formConfig.fieldConfigs);
    effectiveFormId = options.formConfig.id || 'default';
    effectiveCollectionEncryption = options.formConfig.collectionEncryption;
  } else if (options.encryptedFields) {
    // Using stored encryption config (from background sync)
    // Create minimal FieldConfig objects for encryption processing
    encryptedFieldsList = Object.entries(options.encryptedFields).map(([path, encryption]) => ({
      path,
      type: 'string' as const, // Default type, actual type not used for encryption config
      name: path,
      label: path, // Required field
      included: true, // Required field
      required: false, // Required field
      encryption,
    }));
    effectiveFormId = options.formId || 'default';
    effectiveCollectionEncryption = options.collectionEncryption;
  } else {
    // No encryption config provided
    console.warn('[EncryptedClient] No encryption config provided, returning standard client');
    return new MongoClient(connectionString);
  }

  if (encryptedFieldsList.length === 0) {
    // No encrypted fields, return standard client
    return new MongoClient(connectionString);
  }

  // Create a temporary client to set up keys
  const setupClient = new MongoClient(connectionString);
  await setupClient.connect();

  try {
    // Get or create the form's encryption key
    const formKeyId = await getOrCreateFormKey(
      setupClient,
      organizationId,
      effectiveFormId,
      effectiveCollectionEncryption
    );

    // Build field-specific keys if needed
    const fieldKeys: Record<string, any> = {};
    for (const field of encryptedFieldsList) {
      if (field.encryption?.keyId) {
        // Use specified key
        fieldKeys[field.path] = field.encryption.keyId;
      } else if (field.encryption?.keyAltName) {
        // Get key by alt name
        const fieldKey = await getOrCreateFieldKey(
          setupClient,
          organizationId,
          effectiveFormId,
          field.path,
          effectiveCollectionEncryption
        );
        fieldKeys[field.path] = fieldKey;
      } else {
        // Use form's default key
        fieldKeys[field.path] = formKeyId;
      }
    }

    await setupClient.close();

    // Build encryption configuration
    const namespace = `${database}.${collection}`;
    const kmsProviders = getKMSProviderCredentials();
    const keyVaultNamespace = getKeyVaultNamespace();

    // Build encrypted fields map for Queryable Encryption
    const encryptedFieldsMap = buildEncryptedFieldsMap(
      namespace,
      encryptedFieldsList,
      fieldKeys,
      formKeyId
    );

    console.log('[EncryptedClient] Encrypted fields map:', JSON.stringify(encryptedFieldsMap, null, 2));
    console.log('[EncryptedClient] Key vault namespace:', keyVaultNamespace);

    const autoEncryptionOptions: AutoEncryptionOptions = {
      keyVaultNamespace,
      kmsProviders,
      encryptedFieldsMap,
      // Bypass query analysis for faster inserts (we're using explicit schema)
      bypassQueryAnalysis: true,
      // Use crypt_shared library - bypass spawning mongocryptd process
      extraOptions: {
        cryptSharedLibRequired: false,
        // Bypass mongocryptd - use crypt_shared library only
        mongocryptdBypassSpawn: true,
      },
    };

    const client = new MongoClient(connectionString, {
      autoEncryption: autoEncryptionOptions,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    // Connect the encrypted client
    await client.connect();

    console.log(
      `[EncryptedClient] Created and connected encrypted client for ${namespace} with ${encryptedFieldsList.length} encrypted fields`
    );

    return client;
  } catch (error) {
    await setupClient.close();
    throw error;
  }
}

/**
 * Encrypt specific fields in a document using explicit encryption
 * This is more reliable than auto-encryption for dynamic schemas
 */
export async function encryptDocumentFields(
  client: MongoClient,
  document: Record<string, unknown>,
  encryptedFields: Record<string, FieldEncryptionConfig>,
  keyId: any
): Promise<Record<string, unknown>> {
  const clientEncryption = await createClientEncryption(client);
  const encryptedDoc = { ...document };

  for (const [fieldPath, encryptionConfig] of Object.entries(encryptedFields)) {
    const value = getNestedValue(document, fieldPath);
    if (value === undefined || value === null) {
      continue;
    }

    // Declare variables outside try block for error logging
    let algorithm: 'Indexed' | 'Unindexed' = 'Unindexed';
    let encryptOptions: any = {};

    try {
      // Determine algorithm based on config
      // MongoDB driver encrypt() supports: 'Indexed' (for equality queries) or 'Unindexed' (no queries)
      // Note: 'Range' algorithm is not directly supported by encrypt() - it requires schema configuration
      if (encryptionConfig.algorithm === 'Range') {
        // Range queries require schema-level configuration, not explicit encryption with Range algorithm
        // For explicit encryption, we treat Range as Unindexed (no contentionFactor)
        algorithm = 'Unindexed';
      } else if (encryptionConfig.algorithm === 'Indexed' || encryptionConfig.queryType === 'equality') {
        algorithm = 'Indexed';
      } else {
        algorithm = 'Unindexed';
      }

      // #region agent log - detailed encryption config
      console.log(`[DEBUG] Encrypting field "${fieldPath}":`, {
        algorithm,
        configAlgorithm: encryptionConfig.algorithm,
        queryType: encryptionConfig.queryType,
        hasContentionFactor: encryptionConfig.contentionFactor !== undefined,
        contentionFactorValue: encryptionConfig.contentionFactor,
      });
      fetch('http://127.0.0.1:7243/ingest/dfcee207-b55f-409a-a46d-5a6c88d8a47c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'post-fix',
          hypothesisId: 'H1',
          location: 'encryptedClient.ts:encryptDocumentFields:pre-encrypt',
          message: 'About to encrypt field',
          data: {
            fieldPath,
            algorithm,
            configAlgorithm: encryptionConfig.algorithm,
            queryType: encryptionConfig.queryType,
            hasContentionFactor: encryptionConfig.contentionFactor !== undefined,
            contentionFactorValue: encryptionConfig.contentionFactor,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      const encryptOptions: any = {
        keyId,
        algorithm,
      };

      // MongoDB driver REQUIRES contentionFactor for 'Indexed' algorithm
      // contentionFactor can ONLY be set for 'Indexed' algorithm
      // Setting it for 'Unindexed' will cause "cannot set contention factor with no index type" error
      if (algorithm === 'Indexed') {
        // Use configured contentionFactor or default to 4 (balanced between insert and query performance)
        encryptOptions.contentionFactor = encryptionConfig.contentionFactor ?? 4;
        // queryType MUST be set for Indexed fields to enable equality queries
        // Without this, the field cannot be searched
        encryptOptions.queryType = 'equality';
        console.log(`[DEBUG] Setting contentionFactor=${encryptOptions.contentionFactor} and queryType=equality for Indexed field "${fieldPath}"`);
      } else {
        console.log(`[DEBUG] NOT setting contentionFactor/queryType for field "${fieldPath}" (algorithm=${algorithm})`);
      }

      // #region agent log - final encrypt options
      console.log(`[DEBUG] Final encrypt options for "${fieldPath}":`, JSON.stringify(encryptOptions, null, 2));
      fetch('http://127.0.0.1:7243/ingest/dfcee207-b55f-409a-a46d-5a6c88d8a47c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'post-fix',
          hypothesisId: 'H2',
          location: 'encryptedClient.ts:encryptDocumentFields:encrypt-options',
          message: 'Encrypt options for field',
          data: {
            fieldPath,
            options: encryptOptions,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      const encryptedValue = await clientEncryption.encrypt(value, encryptOptions);

      setNestedValue(encryptedDoc, fieldPath, encryptedValue);
      console.log(`[EncryptedClient] Encrypted field "${fieldPath}" with algorithm "${algorithm}"`);
    } catch (error) {
      const errorObj = error as Error;
      console.error(`[EncryptedClient] Failed to encrypt field "${fieldPath}":`, errorObj);
      console.error(`[DEBUG] Error details:`, {
        fieldPath,
        errorName: errorObj?.name,
        errorMessage: errorObj?.message,
        errorStack: errorObj?.stack,
        algorithm,
        configAlgorithm: encryptionConfig.algorithm,
        queryType: encryptionConfig.queryType,
        hadContentionFactor: 'contentionFactor' in encryptOptions,
      });
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/dfcee207-b55f-409a-a46d-5a6c88d8a47c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'post-fix',
          hypothesisId: 'H3',
          location: 'encryptedClient.ts:encryptDocumentFields:error',
          message: 'Error encrypting field',
          data: {
            fieldPath,
            errorMessage: errorObj?.message || 'unknown',
            errorName: errorObj?.name || 'unknown',
            algorithm,
            configAlgorithm: encryptionConfig.algorithm,
            queryType: encryptionConfig.queryType,
            hadContentionFactor: 'contentionFactor' in encryptOptions,
            encryptOptions: encryptOptions,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      throw error;
    }
  }

  return encryptedDoc;
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Set a nested value in an object using dot notation
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
}

/**
 * Check if a form has any encrypted fields configured
 */
export function hasEncryptedFields(formConfig: FormConfiguration): boolean {
  return formConfig.fieldConfigs.some((f) => f.encryption?.enabled);
}

/**
 * Get all fields with encryption enabled
 */
export function getEncryptedFields(fieldConfigs: FieldConfig[]): FieldConfig[] {
  return fieldConfigs.filter((f) => f.encryption?.enabled);
}

/**
 * Get field paths that are encrypted
 */
export function getEncryptedFieldPaths(formConfig: FormConfiguration): string[] {
  return getEncryptedFields(formConfig.fieldConfigs).map((f) => f.path);
}

// ============================================
// Schema Builders
// ============================================

/**
 * Build the encrypted fields map for Queryable Encryption (MongoDB 7.0+)
 */
function buildEncryptedFieldsMap(
  namespace: string,
  encryptedFields: FieldConfig[],
  fieldKeys: Record<string, any>,
  defaultKeyId: any
): EncryptedFieldsMap {
  const fields = encryptedFields.map((field) => {
    const encryption = field.encryption!;
    const bsonType = getBsonType(field.type);
    const keyId = fieldKeys[field.path] || defaultKeyId;

    const fieldDef: any = {
      path: field.path,
      bsonType,
      keyId,
    };

    // Add query support based on configuration
    if (encryption.queryType !== 'none') {
      fieldDef.queries = [];

      if (encryption.queryType === 'equality' || encryption.algorithm === 'Indexed') {
        fieldDef.queries.push({
          queryType: 'equality',
          contention: encryption.contentionFactor || 4,
        });
      }

      if (encryption.queryType === 'range' || encryption.algorithm === 'Range') {
        const rangeQuery: any = { queryType: 'range' };

        if (encryption.rangeMin !== undefined) {
          rangeQuery.min = encryption.rangeMin;
        }
        if (encryption.rangeMax !== undefined) {
          rangeQuery.max = encryption.rangeMax;
        }

        fieldDef.queries.push(rangeQuery);
      }
    }

    return fieldDef;
  });

  return {
    [namespace]: { fields },
  };
}

/**
 * Build the legacy encryption schema (CSFLE - for MongoDB 4.2-6.x)
 * This is kept for backward compatibility with older MongoDB versions
 */
export function buildLegacyEncryptionSchema(
  namespace: string,
  encryptedFields: FieldConfig[],
  defaultKeyId: any
): EncryptionSchema {
  const properties: Record<string, any> = {};

  for (const field of encryptedFields) {
    const encryption = field.encryption!;
    const bsonType = getBsonType(field.type);

    // Map algorithm to CSFLE format
    let algorithm: string;
    if (encryption.algorithm === 'Indexed' || encryption.queryType === 'equality') {
      algorithm = 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic';
    } else {
      algorithm = 'AEAD_AES_256_CBC_HMAC_SHA_512-Random';
    }

    properties[field.path] = {
      encrypt: {
        bsonType,
        algorithm,
        keyId: [defaultKeyId],
      },
    };
  }

  return {
    [namespace]: {
      bsonType: 'object',
      encryptMetadata: {
        keyId: [defaultKeyId],
      },
      properties,
    },
  };
}

// ============================================
// Type Mapping
// ============================================

/**
 * Map form field types to BSON types for encryption schema
 */
function getBsonType(fieldType: string): string {
  const typeMap: Record<string, string> = {
    // Text types
    string: 'string',
    short_text: 'string',
    long_text: 'string',
    email: 'string',
    phone: 'string',
    url: 'string',
    password: 'string',

    // Numeric types
    number: 'int',
    integer: 'int',
    decimal: 'double',
    currency: 'double',
    rating: 'int',
    scale: 'int',

    // Date types
    date: 'date',
    datetime: 'date',
    time: 'string',

    // Boolean
    boolean: 'bool',
    yes_no: 'bool',
    checkbox: 'bool',

    // Complex types (stored as string for encryption)
    select: 'string',
    radio: 'string',
    multiselect: 'array',
    tags: 'array',

    // Default
    default: 'string',
  };

  return typeMap[fieldType] || typeMap['default'];
}

// ============================================
// Utility Functions
// ============================================

/**
 * Validate encryption configuration for a field
 */
export function validateFieldEncryption(
  field: FieldConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const encryption = field.encryption;

  if (!encryption?.enabled) {
    return { valid: true, errors: [] };
  }

  // Check algorithm compatibility
  if (encryption.algorithm === 'Range') {
    const bsonType = getBsonType(field.type);
    if (!['int', 'double', 'date'].includes(bsonType)) {
      errors.push(
        `Range encryption is only supported for numeric and date fields. "${field.path}" is type "${field.type}"`
      );
    }

    if (encryption.rangeMin === undefined || encryption.rangeMax === undefined) {
      errors.push(
        `Range encryption requires rangeMin and rangeMax to be specified for field "${field.path}"`
      );
    }
  }

  // Check query type compatibility
  if (encryption.queryType === 'range' && encryption.algorithm !== 'Range') {
    errors.push(
      `Field "${field.path}" has queryType "range" but algorithm is "${encryption.algorithm}". ` +
        `Use algorithm "Range" for range queries.`
    );
  }

  if (encryption.queryType === 'equality' && encryption.algorithm === 'Unindexed') {
    errors.push(
      `Field "${field.path}" has queryType "equality" but algorithm is "Unindexed". ` +
        `Use algorithm "Indexed" for equality queries.`
    );
  }

  // Check contention factor
  if (encryption.contentionFactor !== undefined) {
    if (encryption.contentionFactor < 1 || encryption.contentionFactor > 8) {
      errors.push(
        `Contention factor for field "${field.path}" must be between 1 and 8. Got: ${encryption.contentionFactor}`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate all encrypted fields in a form
 */
export function validateFormEncryption(
  formConfig: FormConfiguration
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if encryption is enabled but no KMS is configured
  const encryptedFields = getEncryptedFields(formConfig.fieldConfigs);
  if (encryptedFields.length > 0 && !isQueryableEncryptionConfigured()) {
    errors.push(
      'Form has encrypted fields but Queryable Encryption is not configured. ' +
        'Set QE_KMS_PROVIDER and related environment variables.'
    );
  }

  // Validate each encrypted field
  for (const field of encryptedFields) {
    const fieldValidation = validateFieldEncryption(field);
    errors.push(...fieldValidation.errors);
  }

  // Check collection encryption config if present
  if (formConfig.collectionEncryption?.enabled) {
    const provider = formConfig.collectionEncryption.kmsProvider;

    if (provider === 'aws' && !formConfig.collectionEncryption.awsKms) {
      errors.push('AWS KMS configuration is required when kmsProvider is "aws"');
    }
    if (provider === 'azure' && !formConfig.collectionEncryption.azureKms) {
      errors.push('Azure Key Vault configuration is required when kmsProvider is "azure"');
    }
    if (provider === 'gcp' && !formConfig.collectionEncryption.gcpKms) {
      errors.push('GCP Cloud KMS configuration is required when kmsProvider is "gcp"');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Decrypt a single encrypted value
 * Used when displaying encrypted field values in search results or form data
 */
export async function decryptValue(
  client: MongoClient,
  encryptedValue: Binary
): Promise<unknown> {
  const clientEncryption = await createClientEncryption(client);
  return clientEncryption.decrypt(encryptedValue);
}

/**
 * Check if a value is a MongoDB Binary (works across module boundaries)
 */
function isBinaryValue(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  // Check instanceof first
  if (value instanceof Binary) return true;
  // Fallback: check _bsontype for cross-module compatibility
  return (value as any)._bsontype === 'Binary';
}

/**
 * Decrypt encrypted fields in a document for display
 * Takes a document with encrypted Binary fields and returns a copy with decrypted values
 */
export async function decryptDocumentFields(
  client: MongoClient,
  document: Record<string, unknown>,
  encryptedFieldPaths: string[]
): Promise<Record<string, unknown>> {
  if (encryptedFieldPaths.length === 0) {
    return document;
  }

  const clientEncryption = await createClientEncryption(client);

  // Create a plain object copy for the result (will contain decrypted values)
  // We'll manually copy non-encrypted fields and decrypt encrypted ones
  const decryptedDoc: Record<string, unknown> = {};

  // Deep clone non-Binary values, keep Binary references for decryption
  function cloneValue(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (isBinaryValue(value)) {
      // Keep Binary objects as-is for decryption (will be replaced with decrypted value)
      return value;
    }
    if (value instanceof Date) return new Date(value.getTime());
    if (Array.isArray(value)) return value.map(cloneValue);
    if (typeof value === 'object') {
      const cloned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        cloned[k] = cloneValue(v);
      }
      return cloned;
    }
    return value;
  }

  // Clone the entire document first
  for (const [key, value] of Object.entries(document)) {
    decryptedDoc[key] = cloneValue(value);
  }

  // Now decrypt the encrypted fields
  for (const fieldPath of encryptedFieldPaths) {
    // Get value from the cloned doc (which still has Binary references)
    const value = getNestedValue(decryptedDoc, fieldPath);

    console.log(`[EncryptedClient] Checking field "${fieldPath}" for decryption:`, {
      hasValue: !!value,
      valueType: typeof value,
      isBinary: isBinaryValue(value),
      bsonType: value && typeof value === 'object' ? (value as any)._bsontype : 'N/A',
    });

    // Check if the value is an encrypted Binary
    if (value && isBinaryValue(value)) {
      try {
        const decryptedValue = await clientEncryption.decrypt(value as Binary);
        setNestedValue(decryptedDoc, fieldPath, decryptedValue);
        console.log(`[EncryptedClient] Decrypted field "${fieldPath}" successfully, result type: ${typeof decryptedValue}`);
      } catch (error) {
        console.error(`[EncryptedClient] Failed to decrypt field "${fieldPath}":`, error);
        // Convert Binary to a placeholder string for display since decryption failed
        setNestedValue(decryptedDoc, fieldPath, '[Encrypted - Unable to decrypt]');
      }
    } else {
      console.log(`[EncryptedClient] Field "${fieldPath}" is not a Binary, skipping decryption`);
    }
  }

  return decryptedDoc;
}

/**
 * Decrypt encrypted fields in multiple documents (for search results)
 */
export async function decryptDocuments(
  client: MongoClient,
  documents: Record<string, unknown>[],
  encryptedFieldPaths: string[]
): Promise<Record<string, unknown>[]> {
  if (encryptedFieldPaths.length === 0 || documents.length === 0) {
    return documents;
  }

  console.log(`[EncryptedClient] Decrypting ${encryptedFieldPaths.length} fields in ${documents.length} documents`);

  const decryptedDocs = await Promise.all(
    documents.map(doc => decryptDocumentFields(client, doc, encryptedFieldPaths))
  );

  return decryptedDocs;
}

/**
 * Encrypt a single value for search/query purposes
 * Used when searching on encrypted fields - the search value must be encrypted
 * with the same key and algorithm to match the stored encrypted data
 */
export async function encryptSearchValue(
  client: MongoClient,
  value: unknown,
  encryptionConfig: FieldEncryptionConfig,
  keyId: any
): Promise<Binary | null> {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const clientEncryption = await createClientEncryption(client);

  // Determine algorithm - search only works with Indexed algorithm (equality queries)
  let algorithm: 'Indexed' | 'Unindexed' = 'Unindexed';
  if (encryptionConfig.algorithm === 'Indexed' || encryptionConfig.queryType === 'equality') {
    algorithm = 'Indexed';
  }

  // Only Indexed algorithm supports queries - Unindexed cannot be searched
  if (algorithm !== 'Indexed') {
    console.warn('[EncryptedClient] Cannot search on Unindexed encrypted field - queries not supported');
    return null;
  }

  // For equality queries on Indexed fields, we MUST include queryType: 'equality'
  // This tells MongoDB to generate a searchable encryption payload
  // See: https://www.mongodb.com/docs/manual/core/queryable-encryption/fundamentals/manual-encryption/
  const encryptOptions: any = {
    keyId,
    algorithm,
    queryType: 'equality', // Required for searchable equality queries
    contentionFactor: encryptionConfig.contentionFactor ?? 4,
  };

  console.log(`[EncryptedClient] Encrypting search value with options:`, {
    algorithm,
    queryType: 'equality',
    contentionFactor: encryptOptions.contentionFactor,
    keyIdType: typeof keyId,
  });

  const encryptedValue = await clientEncryption.encrypt(value, encryptOptions);
  return encryptedValue;
}

/**
 * Get a summary of encryption for a form
 */
export function getEncryptionSummary(formConfig: FormConfiguration): {
  enabled: boolean;
  fieldCount: number;
  fields: Array<{
    path: string;
    algorithm: string;
    queryType: string;
    sensitivityLevel: string;
  }>;
  kmsProvider?: string;
} {
  const encryptedFields = getEncryptedFields(formConfig.fieldConfigs);

  return {
    enabled: encryptedFields.length > 0,
    fieldCount: encryptedFields.length,
    fields: encryptedFields.map((f) => ({
      path: f.path,
      algorithm: f.encryption!.algorithm,
      queryType: f.encryption!.queryType,
      sensitivityLevel: f.encryption!.sensitivityLevel,
    })),
    kmsProvider: formConfig.collectionEncryption?.kmsProvider || getConfiguredKMSProvider(),
  };
}
