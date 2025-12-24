import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, Binary } from 'mongodb';
import { getPublishedFormBySlug, getPublishedFormById } from '@/lib/storage';
import { getDecryptedConnectionString } from '@/lib/platform/connectionVault';
import { encryptSearchValue, decryptDocuments } from '@/lib/platform/encryptedClient';
import { isQueryableEncryptionConfigured, getOrCreateFormKey } from '@/lib/platform/encryptionKeys';
import { FieldConfig, FieldEncryptionConfig } from '@/types/form';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Environment variable for MongoDB URI (fallback)
const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Search documents in a form's collection
 * Used by the SearchFormRenderer for public form search functionality
 */
export async function POST(request: NextRequest) {
  try {
    const {
      formId,
      query = {},
      sort,
      limit = 25,
      skip = 0,
    } = await request.json();

    if (!formId) {
      return NextResponse.json(
        { success: false, error: 'Form ID is required' },
        { status: 400 }
      );
    }

    // Load the form to get connection info
    let form = await getPublishedFormBySlug(formId);
    if (!form) {
      form = await getPublishedFormById(formId);
    }

    if (!form) {
      return NextResponse.json(
        { success: false, error: 'Form not found' },
        { status: 404 }
      );
    }

    if (!form.isPublished) {
      return NextResponse.json(
        { success: false, error: 'Form is not published' },
        { status: 403 }
      );
    }

    // Check if form supports search
    const formType = form.formType || 'data-entry';
    if (formType !== 'search' && formType !== 'both') {
      return NextResponse.json(
        { success: false, error: 'This form does not support search' },
        { status: 403 }
      );
    }

    // Get connection info - support both dataSource (vault) and legacy direct connection
    let connectionString: string | undefined;
    let databaseName: string | undefined;
    let collection: string | undefined;

    // Check for modern dataSource configuration (vault-based)
    if (form.dataSource?.vaultId && form.organizationId) {
      const vaultCredentials = await getDecryptedConnectionString(
        form.organizationId,
        form.dataSource.vaultId
      );

      if (vaultCredentials) {
        connectionString = vaultCredentials.connectionString;
        databaseName = vaultCredentials.database;
        collection = form.dataSource.collection;
      }
    }

    // Fall back to legacy direct connection
    if (!connectionString) {
      connectionString = form.connectionString || MONGODB_URI;
      databaseName = form.database;
      collection = form.collection;
    }

    if (!connectionString) {
      return NextResponse.json(
        { success: false, error: 'No database connection configured' },
        { status: 500 }
      );
    }

    if (!databaseName || !collection) {
      return NextResponse.json(
        { success: false, error: 'Form has no collection configured' },
        { status: 400 }
      );
    }

    // Sanitize limit and skip
    const maxLimit = form.searchConfig?.maxResults || 100;
    const queryLimit = Math.min(maxLimit, Math.max(1, parseInt(String(limit), 10) || 25));
    const querySkip = Math.max(0, parseInt(String(skip), 10) || 0);

    const client = new MongoClient(connectionString);

    try {
      await client.connect();
      const db = client.db(databaseName);
      const coll = db.collection(collection);

      // Check for encrypted fields in the form and prepare encrypted search values
      const encryptedFieldConfigs = extractEncryptedFieldConfigs(form.fieldConfigs || []);
      const hasEncryptedFields = Object.keys(encryptedFieldConfigs).length > 0;
      const qeConfigured = isQueryableEncryptionConfigured();

      // Debug: Log encryption detection
      console.log('[Search] Encryption check:', {
        formFieldConfigCount: form.fieldConfigs?.length || 0,
        encryptedFieldPaths: Object.keys(encryptedFieldConfigs),
        hasEncryptedFields,
        qeConfigured,
        hasOrgId: !!form.organizationId,
        queryKeys: Object.keys(query),
      });

      let encryptedQuery = query;

      // If form has encrypted fields and QE is configured, encrypt search values for encrypted fields
      if (hasEncryptedFields && qeConfigured && form.organizationId) {
        console.log('[Search] Form has encrypted fields, encrypting search values...', {
          encryptedFields: Object.keys(encryptedFieldConfigs),
          queryFields: Object.keys(query),
        });

        encryptedQuery = await encryptSearchValues(
          client,
          query,
          encryptedFieldConfigs,
          form.organizationId,
          form.id || formId
        );
      }

      // Build the MongoDB query from the provided filters
      const mongoQuery = buildMongoQuery(encryptedQuery, form.searchConfig?.fields);

      // Debug logging
      console.log('[Search] Original query:', JSON.stringify(query, (key, value) => {
        if (value instanceof Binary) return `[Binary: ${value.length()} bytes]`;
        return value;
      }));
      console.log('[Search] Encrypted query:', JSON.stringify(encryptedQuery, (key, value) => {
        if (value instanceof Binary) return `[Binary: ${value.length()} bytes]`;
        return value;
      }));
      console.log('[Search] Final MongoDB query:', JSON.stringify(mongoQuery, (key, value) => {
        if (value instanceof Binary) return `[Binary: ${value.length()} bytes]`;
        return value;
      }));

      // Add default query from config if present
      if (form.searchConfig?.defaultQuery) {
        Object.assign(mongoQuery, form.searchConfig.defaultQuery);
      }

      // Execute query with pagination
      let cursor = coll.find(mongoQuery);

      // Apply sort if provided
      if (sort && typeof sort === 'object') {
        cursor = cursor.sort(sort);
      } else if (form.searchConfig?.results?.defaultSortField) {
        // Use default sort from config
        const dir = form.searchConfig.results.defaultSortDirection === 'asc' ? 1 : -1;
        cursor = cursor.sort({ [form.searchConfig.results.defaultSortField]: dir });
      } else {
        // Default sort by _id descending (newest first)
        cursor = cursor.sort({ _id: -1 });
      }

      // Apply pagination
      cursor = cursor.skip(querySkip).limit(queryLimit);

      const rawDocuments = await cursor.toArray();

      // Get total count for pagination
      const totalCount = await coll.countDocuments(mongoQuery);

      // Decrypt encrypted fields in the results for display
      let documents: Record<string, unknown>[] = rawDocuments;
      if (hasEncryptedFields && qeConfigured) {
        const encryptedFieldPaths = Object.keys(encryptedFieldConfigs);
        console.log('[Search] Decrypting fields in results:', encryptedFieldPaths);

        try {
          documents = await decryptDocuments(
            client,
            rawDocuments as Record<string, unknown>[],
            encryptedFieldPaths
          );
          console.log('[Search] Decryption complete, sample document fields:',
            documents[0] ? Object.keys(documents[0]).slice(0, 5) : 'no docs');
        } catch (decryptError) {
          console.error('[Search] Failed to decrypt some fields:', decryptError);
          // Continue with partially decrypted or encrypted results
        }
      }

      await client.close();

      // Log sample document before serialization to debug decryption
      if (documents.length > 0 && hasEncryptedFields) {
        const sampleDoc = documents[0];
        const encryptedFieldPaths = Object.keys(encryptedFieldConfigs);
        console.log('[Search] Pre-serialization sample - checking encrypted field values:');
        for (const fieldPath of encryptedFieldPaths) {
          const value = getNestedValueForLog(sampleDoc, fieldPath);
          console.log(`  - ${fieldPath}: type=${typeof value}, isBinary=${value && typeof value === 'object' && ((value as any) instanceof Binary || (value as any)?._bsontype === 'Binary')}, value preview=${typeof value === 'string' ? value.substring(0, 50) : JSON.stringify(value)?.substring(0, 50)}`);
        }
      }

      // Serialize documents for JSON response - convert any remaining Binary/BSON types
      const serializedDocuments = documents.map(doc => serializeForJson(doc));

      return NextResponse.json({
        success: true,
        documents: serializedDocuments,
        count: serializedDocuments.length,
        totalCount,
        page: Math.floor(querySkip / queryLimit) + 1,
        totalPages: Math.ceil(totalCount / queryLimit),
      });
    } catch (error: any) {
      await client.close().catch(() => {});
      throw error;
    }
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Search failed'
      },
      { status: 500 }
    );
  }
}

/**
 * Builds a MongoDB query from form field filters
 */
function buildMongoQuery(
  filters: Record<string, any>,
  fieldConfigs?: Record<string, any>
): Record<string, any> {
  const query: Record<string, any> = {};

  for (const [fieldPath, filter] of Object.entries(filters)) {
    // Skip empty values
    if (filter === null || filter === undefined) continue;

    // Handle simple value (direct equality) - includes Binary (encrypted values), Date, and primitives
    // Check for Binary using _bsontype since instanceof may not work across module boundaries
    const isBinary = filter instanceof Binary ||
                     (filter && typeof filter === 'object' && filter._bsontype === 'Binary');

    if (typeof filter !== 'object' || filter instanceof Date || isBinary) {
      if (filter !== '' && filter !== null && filter !== undefined) {
        console.log(`[Search] buildMongoQuery: Direct value for "${fieldPath}", isBinary=${isBinary}`);
        query[fieldPath] = filter;
      }
      continue;
    }

    const { value, operator = 'contains', type = 'string', value2 } = filter;

    // Skip empty values
    if (value === '' || value === null || value === undefined) continue;

    // Check if field is searchable
    const fieldConfig = fieldConfigs?.[fieldPath];
    if (fieldConfig && !fieldConfig.enabled) continue;

    // Check if operator is allowed for this field
    if (fieldConfig?.operators && !fieldConfig.operators.includes(operator)) {
      // Fall back to default operator
      const effectiveOperator = fieldConfig.defaultOperator || 'contains';
      applyOperator(query, fieldPath, value, effectiveOperator, type, value2);
      continue;
    }

    applyOperator(query, fieldPath, value, operator, type, value2);
  }

  return query;
}

function applyOperator(
  query: Record<string, any>,
  fieldPath: string,
  value: any,
  operator: string,
  type: string,
  value2?: any
) {
  switch (operator) {
    case 'equals':
    case 'eq':
      query[fieldPath] = parseValue(value, type);
      break;

    case 'notEquals':
    case 'ne':
      query[fieldPath] = { $ne: parseValue(value, type) };
      break;

    case 'contains':
      query[fieldPath] = { $regex: escapeRegex(String(value)), $options: 'i' };
      break;

    case 'startsWith':
      query[fieldPath] = { $regex: `^${escapeRegex(String(value))}`, $options: 'i' };
      break;

    case 'endsWith':
      query[fieldPath] = { $regex: `${escapeRegex(String(value))}$`, $options: 'i' };
      break;

    case 'greaterThan':
    case 'gt':
      query[fieldPath] = { $gt: parseValue(value, type) };
      break;

    case 'lessThan':
    case 'lt':
      query[fieldPath] = { $lt: parseValue(value, type) };
      break;

    case 'greaterOrEqual':
    case 'gte':
      query[fieldPath] = { $gte: parseValue(value, type) };
      break;

    case 'lessOrEqual':
    case 'lte':
      query[fieldPath] = { $lte: parseValue(value, type) };
      break;

    case 'between':
      query[fieldPath] = {};
      if (value !== '' && value !== null && value !== undefined) {
        query[fieldPath].$gte = parseValue(value, type);
      }
      if (value2 !== '' && value2 !== null && value2 !== undefined) {
        query[fieldPath].$lte = parseValue(value2, type);
      }
      if (Object.keys(query[fieldPath]).length === 0) {
        delete query[fieldPath];
      }
      break;

    case 'in':
      const inValues = Array.isArray(value) ? value : String(value).split(',').map(v => v.trim());
      query[fieldPath] = { $in: inValues.map(v => parseValue(v, type)) };
      break;

    case 'notIn':
      const notInValues = Array.isArray(value) ? value : String(value).split(',').map(v => v.trim());
      query[fieldPath] = { $nin: notInValues.map(v => parseValue(v, type)) };
      break;

    case 'exists':
      query[fieldPath] = { $exists: Boolean(value) };
      break;

    case 'regex':
      try {
        query[fieldPath] = { $regex: String(value), $options: 'i' };
      } catch {
        // Invalid regex, fall back to contains
        query[fieldPath] = { $regex: escapeRegex(String(value)), $options: 'i' };
      }
      break;

    default:
      // Default to contains for strings, equals for others
      if (type === 'string') {
        query[fieldPath] = { $regex: escapeRegex(String(value)), $options: 'i' };
      } else {
        query[fieldPath] = parseValue(value, type);
      }
  }
}

function parseValue(value: any, type: string): any {
  switch (type) {
    case 'number':
      const num = parseFloat(value);
      return isNaN(num) ? value : num;

    case 'date':
      if (value instanceof Date) return value;
      const date = new Date(value);
      return isNaN(date.getTime()) ? value : date;

    case 'boolean':
      if (typeof value === 'boolean') return value;
      return value === 'true' || value === '1' || value === 1;

    default:
      return value;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get a nested value from an object using dot notation (for logging)
 */
function getNestedValueForLog(obj: Record<string, unknown>, path: string): unknown {
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
 * Extract encrypted field configurations from form field configs
 */
function extractEncryptedFieldConfigs(
  fieldConfigs: FieldConfig[]
): Record<string, FieldEncryptionConfig> {
  const encryptedFields: Record<string, FieldEncryptionConfig> = {};

  function processField(field: FieldConfig) {
    if (field.encryption?.enabled) {
      encryptedFields[field.path] = field.encryption;
    }
    // Process nested fields if any
    if ('children' in field && Array.isArray((field as any).children)) {
      (field as any).children.forEach(processField);
    }
  }

  fieldConfigs.forEach(processField);
  return encryptedFields;
}

/**
 * Encrypt search values for encrypted fields
 * This is required for Queryable Encryption - search values must be encrypted
 * with the same key to match the stored encrypted data
 */
async function encryptSearchValues(
  client: MongoClient,
  query: Record<string, any>,
  encryptedFieldConfigs: Record<string, FieldEncryptionConfig>,
  organizationId: string,
  formId: string
): Promise<Record<string, any>> {
  const encryptedQuery = { ...query };

  // Get the form's encryption key
  let formKeyId: any;
  try {
    formKeyId = await getOrCreateFormKey(client, organizationId, formId);
  } catch (error) {
    console.error('[Search] Failed to get encryption key:', error);
    return query; // Fall back to original query
  }

  for (const [fieldPath, filter] of Object.entries(query)) {
    // Check if this field is encrypted
    const encryptionConfig = encryptedFieldConfigs[fieldPath];
    if (!encryptionConfig) {
      continue; // Not an encrypted field, leave as-is
    }

    // Only Indexed algorithm supports equality queries
    if (encryptionConfig.algorithm !== 'Indexed' && encryptionConfig.queryType !== 'equality') {
      console.log(`[Search] Skipping encryption for field "${fieldPath}" - not queryable (algorithm=${encryptionConfig.algorithm})`);
      delete encryptedQuery[fieldPath]; // Cannot search on unindexed fields
      continue;
    }

    try {
      // Handle both simple values and filter objects
      let searchValue: any;
      let operator: string = 'equals';

      if (typeof filter === 'object' && filter !== null && !(filter instanceof Date)) {
        searchValue = filter.value;
        operator = filter.operator || 'equals';
      } else {
        searchValue = filter;
      }

      console.log(`[Search] Processing encrypted field "${fieldPath}":`, {
        filterType: typeof filter,
        filterKeys: typeof filter === 'object' ? Object.keys(filter) : 'N/A',
        searchValue,
        operator,
        rawFilter: JSON.stringify(filter),
      });

      // Only equality searches work on encrypted fields
      // Force to 'equals' if not already - encrypted fields can only do equality
      if (operator !== 'equals' && operator !== 'eq') {
        console.log(`[Search] Forcing operator to 'equals' for encrypted field "${fieldPath}" (was: "${operator}")`);
        operator = 'equals';
      }

      if (searchValue === undefined || searchValue === null || searchValue === '') {
        delete encryptedQuery[fieldPath];
        continue;
      }

      console.log(`[Search] Encrypting search value for field "${fieldPath}"`);

      const encryptedValue = await encryptSearchValue(
        client,
        searchValue,
        encryptionConfig,
        formKeyId
      );

      if (encryptedValue) {
        // Replace the query value with the encrypted value
        encryptedQuery[fieldPath] = encryptedValue;
        console.log(`[Search] Successfully encrypted search value for field "${fieldPath}"`, {
          valueType: typeof encryptedValue,
          isBinary: encryptedValue instanceof Binary,
          bsonType: (encryptedValue as any)?._bsontype,
          hasBuffer: !!(encryptedValue as any)?.buffer,
        });
      } else {
        // Could not encrypt - remove from query
        delete encryptedQuery[fieldPath];
        console.warn(`[Search] Could not encrypt value for field "${fieldPath}" - removing from query`);
      }
    } catch (error) {
      console.error(`[Search] Failed to encrypt search value for field "${fieldPath}":`, error);
      delete encryptedQuery[fieldPath]; // Remove field from query on error
    }
  }

  return encryptedQuery;
}

/**
 * Serialize a document for JSON response
 * Converts any remaining Binary/BSON types to JSON-safe values
 */
function serializeForJson(obj: unknown, path: string = ''): unknown {
  if (obj === null || obj === undefined) return obj;

  // Handle Binary objects (encrypted values that weren't decrypted)
  if (obj instanceof Binary || (typeof obj === 'object' && (obj as any)?._bsontype === 'Binary')) {
    // Log when we encounter a Binary that wasn't decrypted
    console.log(`[Search] serializeForJson: Found undecrypted Binary at path "${path}"`);
    // Return a placeholder for undecrypted binary data
    return '[Encrypted Data]';
  }

  // Handle ObjectId
  if (typeof obj === 'object' && (obj as any)?._bsontype === 'ObjectId') {
    return (obj as any).toString();
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item, i) => serializeForJson(item, `${path}[${i}]`));
  }

  // Handle plain objects
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = serializeForJson(value, path ? `${path}.${key}` : key);
    }
    return result;
  }

  // Primitive values pass through
  return obj;
}
