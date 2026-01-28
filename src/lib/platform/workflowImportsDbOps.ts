/**
 * Workflow Imports Database Operations
 *
 * Handles storage and retrieval of workflow import records for the Deep Link Import feature.
 * Allows ChatGPT and Claude MCP to generate import links that users can click to import workflows.
 *
 * @see docs/specs/CLAUDE-NETPAD-INTEGRATION-SPEC.md Phase 1
 */

import { ObjectId, Collection } from 'mongodb';
import { getPlatformDb } from './db';
import type { WorkflowCanvas, WorkflowSettings, WorkflowVariable } from '@/types/workflow';

// ============================================
// Types
// ============================================

/**
 * Source of the workflow import
 */
export type WorkflowImportSource = 'claude-mcp' | 'chatgpt' | 'cli' | 'api' | 'share';

/**
 * Workflow configuration for import (minimal representation)
 */
export interface WorkflowImportConfig {
  name: string;
  description?: string;
  canvas?: Partial<WorkflowCanvas>;
  settings?: Partial<WorkflowSettings>;
  variables?: WorkflowVariable[];
  tags?: string[];
}

/**
 * Workflow import record stored in the database
 */
export interface WorkflowImport {
  _id: ObjectId;
  importId: string;                // Public ID: "wfimp_xxx"
  config: WorkflowImportConfig;    // The workflow config to import
  projectId?: string;              // Target project (optional)
  source: WorkflowImportSource;    // Where this import came from

  // Tracking
  createdAt: Date;
  expiresAt: Date;                 // Auto-delete after 24 hours (TTL index)
  claimedAt?: Date;                // When user opened the link
  claimedBy?: string;              // User ID who claimed it
  resultWorkflowId?: string;       // Workflow ID if successfully created

  // Analytics
  metadata?: {
    sessionId?: string;
    mcpVersion?: string;
    userAgent?: string;
    ipAddress?: string;
  };
}

/**
 * Input for creating a workflow import
 */
export interface CreateWorkflowImportInput {
  config: WorkflowImportConfig;
  projectId?: string;
  source: WorkflowImportSource;
  expiresInSeconds?: number;       // Default: 86400 (24 hours)
  metadata?: WorkflowImport['metadata'];
}

/**
 * Result of creating a workflow import
 */
export interface CreateWorkflowImportResult {
  importId: string;
  importUrl: string;
  expiresAt: Date;
}

/**
 * Result of claiming a workflow import
 */
export interface ClaimWorkflowImportResult {
  success: boolean;
  import?: WorkflowImport;
  error?: {
    code: 'NOT_FOUND' | 'EXPIRED' | 'ALREADY_CLAIMED';
    message: string;
  };
}

// ============================================
// Constants
// ============================================

const COLLECTION_NAME = 'workflow_imports';
const DEFAULT_EXPIRY_SECONDS = 86400; // 24 hours
const MAX_EXPIRY_SECONDS = 604800; // 7 days
const MAX_CONFIG_SIZE_BYTES = 500 * 1024; // 500KB (workflows can be larger than forms)
const MAX_NODE_COUNT = 500;

// ============================================
// Collection Access
// ============================================

let collectionPromise: Promise<Collection<WorkflowImport>> | null = null;

/**
 * Get the workflow_imports collection with indexes ensured
 */
async function getWorkflowImportsCollection(): Promise<Collection<WorkflowImport>> {
  if (!collectionPromise) {
    collectionPromise = (async () => {
      const db = await getPlatformDb();
      const collection = db.collection<WorkflowImport>(COLLECTION_NAME);

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
 * Generate a unique workflow import ID
 */
function generateImportId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'wfimp_';
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
  return process.env.NEXTAUTH_URL || 'https://netpad.io';
}

// ============================================
// Validation
// ============================================

/**
 * Validate workflow configuration for import
 */
export function validateWorkflowConfig(config: unknown): {
  valid: boolean;
  errors: string[];
  sanitized?: WorkflowImportConfig;
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

  // Validate canvas if present
  if (cfg.canvas) {
    if (typeof cfg.canvas !== 'object') {
      errors.push('canvas must be an object');
    } else {
      const canvas = cfg.canvas as Record<string, unknown>;

      // Validate nodes if present
      if (canvas.nodes && Array.isArray(canvas.nodes)) {
        if (canvas.nodes.length > MAX_NODE_COUNT) {
          errors.push(`Maximum ${MAX_NODE_COUNT} nodes allowed`);
        }

        for (let i = 0; i < canvas.nodes.length; i++) {
          const node = canvas.nodes[i] as Record<string, unknown>;
          if (!node || typeof node !== 'object') {
            errors.push(`canvas.nodes[${i}] must be an object`);
            continue;
          }
          if (!node.id || typeof node.id !== 'string') {
            errors.push(`canvas.nodes[${i}].id is required`);
          }
          if (!node.type || typeof node.type !== 'string') {
            errors.push(`canvas.nodes[${i}].type is required`);
          }
        }
      }

      // Validate edges if present
      if (canvas.edges && Array.isArray(canvas.edges)) {
        for (let i = 0; i < canvas.edges.length; i++) {
          const edge = canvas.edges[i] as Record<string, unknown>;
          if (!edge || typeof edge !== 'object') {
            errors.push(`canvas.edges[${i}] must be an object`);
            continue;
          }
          if (!edge.source || typeof edge.source !== 'string') {
            errors.push(`canvas.edges[${i}].source is required`);
          }
          if (!edge.target || typeof edge.target !== 'string') {
            errors.push(`canvas.edges[${i}].target is required`);
          }
        }
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
  const sanitized = sanitizeWorkflowConfig(cfg);
  return { valid: true, errors: [], sanitized };
}

/**
 * Sanitize workflow config to remove potentially dangerous content
 */
function sanitizeWorkflowConfig(config: Record<string, unknown>): WorkflowImportConfig {
  // Create a clean copy with only allowed fields
  const allowed = ['name', 'description', 'canvas', 'settings', 'variables', 'tags'];

  const sanitized: Record<string, unknown> = {};
  for (const key of allowed) {
    if (config[key] !== undefined) {
      sanitized[key] = config[key];
    }
  }

  return sanitized as unknown as WorkflowImportConfig;
}

// ============================================
// CRUD Operations
// ============================================

/**
 * Create a new workflow import record
 */
export async function createWorkflowImport(
  input: CreateWorkflowImportInput
): Promise<CreateWorkflowImportResult> {
  const collection = await getWorkflowImportsCollection();

  // Validate config
  const validation = validateWorkflowConfig(input.config);
  if (!validation.valid) {
    throw new Error(`Invalid workflow config: ${validation.errors.join(', ')}`);
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
  const importRecord: WorkflowImport = {
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
    importUrl: `${baseUrl}/import/workflow/${importId}`,
    expiresAt,
  };
}

/**
 * Get a workflow import by ID
 */
export async function getWorkflowImport(importId: string): Promise<WorkflowImport | null> {
  const collection = await getWorkflowImportsCollection();

  // Validate import ID format
  if (!importId || !importId.startsWith('wfimp_')) {
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
 * Claim a workflow import (mark as opened by a user)
 */
export async function claimWorkflowImport(
  importId: string,
  userId: string
): Promise<ClaimWorkflowImportResult> {
  const collection = await getWorkflowImportsCollection();

  const importRecord = await getWorkflowImport(importId);

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

  // Check if already claimed and converted to a workflow
  if (importRecord.resultWorkflowId) {
    return {
      success: false,
      error: {
        code: 'ALREADY_CLAIMED',
        message: 'This import has already been used to create a workflow'
      },
    };
  }

  // Mark as claimed (but allow re-claiming if not yet converted to workflow)
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
 * Mark import as completed (workflow was created)
 */
export async function completeWorkflowImport(
  importId: string,
  workflowId: string
): Promise<void> {
  const collection = await getWorkflowImportsCollection();

  await collection.updateOne(
    { importId },
    { $set: { resultWorkflowId: workflowId } }
  );
}

// ============================================
// Analytics
// ============================================

/**
 * Get import statistics for a time period
 */
export async function getWorkflowImportStats(options: {
  startDate?: Date;
  endDate?: Date;
  source?: WorkflowImportSource;
}): Promise<{
  total: number;
  claimed: number;
  completed: number;
  expired: number;
  bySource: Record<string, number>;
}> {
  const collection = await getWorkflowImportsCollection();

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
        completed: { $sum: { $cond: [{ $ne: ['$resultWorkflowId', null] }, 1, 0] } },
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
