/**
 * Form Imports Database Operations
 *
 * Handles storage and retrieval of form import records for the Deep Link Import feature.
 * Allows Claude MCP to generate import links that users can click to import forms.
 *
 * @see docs/specs/CLAUDE-NETPAD-INTEGRATION-SPEC.md Phase 1
 */

import { ObjectId, Collection } from 'mongodb';
import { getPlatformDb } from './db';
import type { FormConfiguration } from '@/types/form';

// ============================================
// Types
// ============================================

/**
 * Source of the form import
 */
export type FormImportSource = 'claude-mcp' | 'cli' | 'api' | 'share';

/**
 * Form import record stored in the database
 */
export interface FormImport {
  _id: ObjectId;
  importId: string;                // Public ID: "imp_xxx"
  config: Partial<FormConfiguration>;  // The form config to import
  projectId?: string;              // Target project (optional)
  source: FormImportSource;        // Where this import came from

  // Tracking
  createdAt: Date;
  expiresAt: Date;                 // Auto-delete after 24 hours (TTL index)
  claimedAt?: Date;                // When user opened the link
  claimedBy?: string;              // User ID who claimed it
  resultFormId?: string;           // Form ID if successfully created

  // Analytics
  metadata?: {
    claudeSessionId?: string;
    mcpVersion?: string;
    userAgent?: string;
    ipAddress?: string;
  };
}

/**
 * Input for creating a form import
 */
export interface CreateFormImportInput {
  config: Partial<FormConfiguration>;
  projectId?: string;
  source: FormImportSource;
  expiresInSeconds?: number;       // Default: 86400 (24 hours)
  metadata?: FormImport['metadata'];
}

/**
 * Result of creating a form import
 */
export interface CreateFormImportResult {
  importId: string;
  importUrl: string;
  expiresAt: Date;
}

/**
 * Result of claiming a form import
 */
export interface ClaimFormImportResult {
  success: boolean;
  import?: FormImport;
  error?: {
    code: 'NOT_FOUND' | 'EXPIRED' | 'ALREADY_CLAIMED';
    message: string;
  };
}

// ============================================
// Constants
// ============================================

const COLLECTION_NAME = 'form_imports';
const DEFAULT_EXPIRY_SECONDS = 86400; // 24 hours
const MAX_EXPIRY_SECONDS = 604800; // 7 days
const MAX_CONFIG_SIZE_BYTES = 100 * 1024; // 100KB
const MAX_FIELD_COUNT = 200;
const MAX_PAGE_COUNT = 20;

// ============================================
// Collection Access
// ============================================

let collectionPromise: Promise<Collection<FormImport>> | null = null;

/**
 * Get the form_imports collection with indexes ensured
 */
async function getFormImportsCollection(): Promise<Collection<FormImport>> {
  if (!collectionPromise) {
    collectionPromise = (async () => {
      const db = await getPlatformDb();
      const collection = db.collection<FormImport>(COLLECTION_NAME);

      // Create indexes (idempotent)
      await collection.createIndex({ importId: 1 }, { unique: true });
      await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
      await collection.createIndex({ source: 1, createdAt: -1 }); // Analytics queries
      await collection.createIndex({ createdAt: -1 }); // Recent imports

      return collection;
    })();
  }
  return collectionPromise;
}

// ============================================
// ID Generation
// ============================================

/**
 * Generate a unique import ID
 */
function generateImportId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'imp_';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Get the base URL for import links
 * Always use the production domain for import links
 */
function getBaseUrl(): string {
  // Always use production URL for import links to ensure they work correctly
  // NEXTAUTH_URL should be set to production domain in Vercel
  return process.env.NEXTAUTH_URL || 'https://netpad.io';
}

// ============================================
// Validation
// ============================================

/**
 * Validate form configuration for import
 */
export function validateFormConfig(config: unknown): {
  valid: boolean;
  errors: string[];
  sanitized?: Partial<FormConfiguration>;
} {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Config must be an object'] };
  }

  const cfg = config as Record<string, unknown>;

  // Required fields
  if (!cfg.name || typeof cfg.name !== 'string') {
    errors.push('name is required and must be a string');
  } else if (cfg.name.length > 200) {
    errors.push('name must be 200 characters or less');
  }

  if (!cfg.fieldConfigs || !Array.isArray(cfg.fieldConfigs)) {
    errors.push('fieldConfigs is required and must be an array');
  } else {
    // Validate field count
    if (cfg.fieldConfigs.length > MAX_FIELD_COUNT) {
      errors.push(`Maximum ${MAX_FIELD_COUNT} fields allowed`);
    }

    // Validate each field has required properties
    for (let i = 0; i < cfg.fieldConfigs.length; i++) {
      const field = cfg.fieldConfigs[i] as Record<string, unknown>;
      if (!field || typeof field !== 'object') {
        errors.push(`fieldConfigs[${i}] must be an object`);
        continue;
      }
      if (!field.path || typeof field.path !== 'string') {
        errors.push(`fieldConfigs[${i}].path is required`);
      }
      if (!field.label || typeof field.label !== 'string') {
        errors.push(`fieldConfigs[${i}].label is required`);
      }
      if (!field.type || typeof field.type !== 'string') {
        errors.push(`fieldConfigs[${i}].type is required`);
      }
    }
  }

  // Validate multi-page config if present
  if (cfg.multiPage) {
    const mp = cfg.multiPage as Record<string, unknown>;
    if (mp.pages && Array.isArray(mp.pages)) {
      if (mp.pages.length > MAX_PAGE_COUNT) {
        errors.push(`Maximum ${MAX_PAGE_COUNT} pages allowed`);
      }
    }
  }

  // Check config size (rough estimate)
  const configStr = JSON.stringify(config);
  if (configStr.length > MAX_CONFIG_SIZE_BYTES) {
    errors.push(`Config size exceeds ${MAX_CONFIG_SIZE_BYTES / 1024}KB limit`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Sanitize: remove any potentially dangerous fields
  const sanitized = sanitizeFormConfig(cfg);
  return { valid: true, errors: [], sanitized };
}

/**
 * Sanitize form config to remove potentially dangerous content
 */
function sanitizeFormConfig(config: Record<string, unknown>): Partial<FormConfiguration> {
  // Create a clean copy with only allowed fields
  const allowed: (keyof FormConfiguration)[] = [
    'name', 'description', 'fieldConfigs', 'slug',
    'theme', 'branding', 'multiPage', 'formType',
    'conversationalConfig', 'variables', 'events',
    'lifecycle', 'botProtection', 'draftSettings',
    'hooks', 'reactions'
  ];

  const sanitized: Record<string, unknown> = {};
  for (const key of allowed) {
    if (config[key] !== undefined) {
      sanitized[key] = config[key];
    }
  }

  return sanitized as Partial<FormConfiguration>;
}

// ============================================
// CRUD Operations
// ============================================

/**
 * Create a new form import record
 */
export async function createFormImport(
  input: CreateFormImportInput
): Promise<CreateFormImportResult> {
  const collection = await getFormImportsCollection();

  // Validate config
  const validation = validateFormConfig(input.config);
  if (!validation.valid) {
    throw new Error(`Invalid form config: ${validation.errors.join(', ')}`);
  }

  // Calculate expiry time
  const expirySeconds = Math.min(
    input.expiresInSeconds || DEFAULT_EXPIRY_SECONDS,
    MAX_EXPIRY_SECONDS
  );
  const expiresAt = new Date(Date.now() + expirySeconds * 1000);

  // Generate unique import ID
  let importId = generateImportId();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await collection.findOne({ importId });
    if (!existing) break;
    importId = generateImportId();
    attempts++;
  }

  const now = new Date();
  const importRecord: FormImport = {
    _id: new ObjectId(),
    importId,
    config: validation.sanitized!,
    projectId: input.projectId,
    source: input.source,
    createdAt: now,
    expiresAt,
    metadata: input.metadata,
  };

  await collection.insertOne(importRecord);

  const baseUrl = getBaseUrl();
  return {
    importId,
    importUrl: `${baseUrl}/import/${importId}`,
    expiresAt,
  };
}

/**
 * Get a form import by ID
 */
export async function getFormImport(importId: string): Promise<FormImport | null> {
  const collection = await getFormImportsCollection();

  // Validate import ID format
  if (!importId || !importId.startsWith('imp_')) {
    return null;
  }

  const importRecord = await collection.findOne({ importId });

  // Check if expired (TTL might not have cleaned up yet)
  if (importRecord && importRecord.expiresAt < new Date()) {
    return null;
  }

  return importRecord;
}

/**
 * Claim a form import (mark as opened by a user)
 */
export async function claimFormImport(
  importId: string,
  userId: string
): Promise<ClaimFormImportResult> {
  const collection = await getFormImportsCollection();

  const importRecord = await getFormImport(importId);

  if (!importRecord) {
    // Check if it ever existed
    const anyRecord = await collection.findOne({ importId });
    if (anyRecord) {
      return {
        success: false,
        error: { code: 'EXPIRED', message: 'This import link has expired' },
      };
    }
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Import not found' },
    };
  }

  // Check if already claimed and converted to a form
  if (importRecord.resultFormId) {
    return {
      success: false,
      error: {
        code: 'ALREADY_CLAIMED',
        message: 'This import has already been used to create a form'
      },
    };
  }

  // Mark as claimed (but allow re-claiming if not yet converted to form)
  await collection.updateOne(
    { importId },
    {
      $set: {
        claimedAt: new Date(),
        claimedBy: userId
      }
    }
  );

  return {
    success: true,
    import: { ...importRecord, claimedAt: new Date(), claimedBy: userId },
  };
}

/**
 * Mark import as completed (form was created)
 */
export async function completeFormImport(
  importId: string,
  formId: string
): Promise<void> {
  const collection = await getFormImportsCollection();

  await collection.updateOne(
    { importId },
    { $set: { resultFormId: formId } }
  );
}

// ============================================
// Analytics
// ============================================

/**
 * Get import statistics for a time period
 */
export async function getImportStats(options: {
  startDate?: Date;
  endDate?: Date;
  source?: FormImportSource;
}): Promise<{
  total: number;
  claimed: number;
  completed: number;
  expired: number;
  bySource: Record<string, number>;
}> {
  const collection = await getFormImportsCollection();

  const match: Record<string, unknown> = {};

  if (options.startDate || options.endDate) {
    match.createdAt = {};
    if (options.startDate) {
      (match.createdAt as Record<string, Date>).$gte = options.startDate;
    }
    if (options.endDate) {
      (match.createdAt as Record<string, Date>).$lte = options.endDate;
    }
  }

  if (options.source) {
    match.source = options.source;
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: '$source',
        total: { $sum: 1 },
        claimed: { $sum: { $cond: [{ $ne: ['$claimedAt', null] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $ne: ['$resultFormId', null] }, 1, 0] } },
        expired: {
          $sum: {
            $cond: [
              { $and: [
                { $lt: ['$expiresAt', new Date()] },
                { $eq: ['$claimedAt', null] }
              ]},
              1,
              0
            ]
          }
        },
      },
    },
  ];

  const results = await collection.aggregate(pipeline).toArray();

  const stats = {
    total: 0,
    claimed: 0,
    completed: 0,
    expired: 0,
    bySource: {} as Record<string, number>,
  };

  for (const result of results) {
    stats.total += result.total;
    stats.claimed += result.claimed;
    stats.completed += result.completed;
    stats.expired += result.expired;
    stats.bySource[result._id] = result.total;
  }

  return stats;
}

/**
 * Get recent imports for admin dashboard
 */
export async function getRecentImports(
  limit: number = 20
): Promise<Array<{
  importId: string;
  source: FormImportSource;
  formName: string;
  fieldCount: number;
  createdAt: Date;
  claimed: boolean;
  completed: boolean;
}>> {
  const collection = await getFormImportsCollection();

  const imports = await collection
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return imports.map((imp) => ({
    importId: imp.importId,
    source: imp.source,
    formName: imp.config.name || 'Untitled',
    fieldCount: imp.config.fieldConfigs?.length || 0,
    createdAt: imp.createdAt,
    claimed: !!imp.claimedAt,
    completed: !!imp.resultFormId,
  }));
}
