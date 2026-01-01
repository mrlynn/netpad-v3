/**
 * API Key Management
 *
 * Functions for creating, validating, and managing API keys.
 */

import { randomBytes, createHash } from 'crypto';
import { Collection, ObjectId } from 'mongodb';
import { connectDB } from '@/lib/mongodb';
import {
  APIKey,
  APIKeyPermission,
  CreateAPIKeyRequest,
  APIKeyListItem,
} from '@/types/api';

// ============================================
// Database Access
// ============================================

async function getAPIKeysCollection(): Promise<Collection<APIKey>> {
  const db = await connectDB();
  return db.collection<APIKey>('api_keys');
}

// ============================================
// Key Generation
// ============================================

/**
 * Generate a new API key with the format: np_{env}_{random}
 * Example: np_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
 */
function generateAPIKey(environment: 'live' | 'test'): string {
  const prefix = environment === 'live' ? 'np_live_' : 'np_test_';
  const randomPart = randomBytes(24).toString('base64url'); // 32 chars
  return `${prefix}${randomPart}`;
}

/**
 * Hash an API key for secure storage
 */
function hashAPIKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Extract the prefix from an API key for display
 */
function getKeyPrefix(key: string): string {
  // Return first 16 chars (e.g., "np_live_a1b2c3d4")
  return key.substring(0, 16);
}

// ============================================
// API Key CRUD Operations
// ============================================

/**
 * Create a new API key
 */
export async function createAPIKey(
  organizationId: string,
  userId: string,
  request: CreateAPIKeyRequest
): Promise<{ apiKey: APIKey; fullKey: string }> {
  const collection = await getAPIKeysCollection();

  const environment = request.environment || 'live';
  const fullKey = generateAPIKey(environment);

  const now = new Date();
  const expiresAt = request.expiresIn
    ? new Date(now.getTime() + request.expiresIn * 24 * 60 * 60 * 1000)
    : undefined;

  const generatedKeyHash = hashAPIKey(fullKey);
  console.log('[API Key Creation] Creating key with hash:', generatedKeyHash.substring(0, 16) + '...');
  console.log('[API Key Creation] Key prefix:', getKeyPrefix(fullKey));

  const apiKey: APIKey = {
    id: new ObjectId().toString(),
    organizationId,
    name: request.name,
    description: request.description,
    keyPrefix: getKeyPrefix(fullKey),
    keyHash: generatedKeyHash,
    permissions: request.permissions,
    scopes: request.scopes,
    rateLimit: {
      requestsPerHour: request.rateLimit?.requestsPerHour || 1000,
      requestsPerDay: request.rateLimit?.requestsPerDay || 10000,
    },
    status: 'active',
    environment,
    lastUsedAt: undefined,
    usageCount: 0,
    createdAt: now,
    createdBy: userId,
    expiresAt,
  };

  await collection.insertOne(apiKey);

  return { apiKey, fullKey };
}

/**
 * Validate an API key and return the key record if valid
 */
export async function validateAPIKey(key: string): Promise<APIKey | null> {
  const collection = await getAPIKeysCollection();

  const keyHash = hashAPIKey(key);

  console.log('[API Key Validation] Looking for key with hash:', keyHash.substring(0, 16) + '...');
  console.log('[API Key Validation] Key prefix:', key.substring(0, 16));

  const apiKey = await collection.findOne({
    keyHash,
    status: 'active',
  });

  if (!apiKey) {
    // Debug: Check if key exists with any status
    const anyKey = await collection.findOne({ keyHash });
    if (anyKey) {
      console.log('[API Key Validation] Found key but status is:', anyKey.status);
    } else {
      console.log('[API Key Validation] No key found with this hash');
      // List all keys for debugging
      const count = await collection.countDocuments({});
      console.log('[API Key Validation] Total keys in collection:', count);
    }
    return null;
  }

  // Check expiration
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    // Mark as expired
    await collection.updateOne(
      { id: apiKey.id },
      { $set: { status: 'expired' } }
    );
    return null;
  }

  // Update last used
  await collection.updateOne(
    { id: apiKey.id },
    {
      $set: { lastUsedAt: new Date() },
      $inc: { usageCount: 1 },
    }
  );

  return apiKey;
}

/**
 * Get API key by ID (for management)
 */
export async function getAPIKeyById(
  keyId: string,
  organizationId: string
): Promise<APIKey | null> {
  const collection = await getAPIKeysCollection();

  return collection.findOne({
    id: keyId,
    organizationId,
  });
}

/**
 * Helper to safely convert a date to ISO string
 */
function toISOString(date: Date | string | undefined): string | undefined {
  if (!date) return undefined;
  if (typeof date === 'string') return date;
  return date.toISOString();
}

/**
 * Format an API key document to a list item response
 */
export function formatAPIKeyToListItem(key: APIKey): APIKeyListItem {
  return {
    id: key.id,
    name: key.name,
    description: key.description,
    keyPrefix: key.keyPrefix,
    permissions: key.permissions,
    environment: key.environment,
    status: key.status,
    lastUsedAt: toISOString(key.lastUsedAt),
    usageCount: key.usageCount || 0,
    createdAt: toISOString(key.createdAt) || new Date().toISOString(),
    expiresAt: toISOString(key.expiresAt),
  };
}

/**
 * List all API keys for an organization
 */
export async function listAPIKeys(
  organizationId: string
): Promise<APIKeyListItem[]> {
  const collection = await getAPIKeysCollection();

  const keys = await collection
    .find({ organizationId })
    .sort({ createdAt: -1 })
    .toArray();

  return keys.map(formatAPIKeyToListItem);
}

/**
 * Revoke an API key
 */
export async function revokeAPIKey(
  keyId: string,
  organizationId: string,
  userId: string,
  reason?: string
): Promise<boolean> {
  const collection = await getAPIKeysCollection();

  const result = await collection.updateOne(
    { id: keyId, organizationId, status: 'active' },
    {
      $set: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedBy: userId,
        revokedReason: reason,
      },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Update API key permissions or settings
 */
export async function updateAPIKey(
  keyId: string,
  organizationId: string,
  updates: {
    name?: string;
    description?: string;
    permissions?: APIKeyPermission[];
    scopes?: {
      formIds?: string[];
      allowedIPs?: string[];
    };
    rateLimit?: {
      requestsPerHour?: number;
      requestsPerDay?: number;
    };
  }
): Promise<boolean> {
  const collection = await getAPIKeysCollection();

  // Build a clean update object to avoid type issues with partial nested fields
  const updateFields: Record<string, unknown> = {};
  if (updates.name !== undefined) updateFields.name = updates.name;
  if (updates.description !== undefined) updateFields.description = updates.description;
  if (updates.permissions !== undefined) updateFields.permissions = updates.permissions;
  if (updates.scopes !== undefined) updateFields.scopes = updates.scopes;
  if (updates.rateLimit !== undefined) updateFields.rateLimit = updates.rateLimit;

  const result = await collection.updateOne(
    { id: keyId, organizationId, status: 'active' },
    { $set: updateFields }
  );

  return result.modifiedCount > 0;
}

/**
 * Delete an API key permanently
 */
export async function deleteAPIKey(
  keyId: string,
  organizationId: string
): Promise<boolean> {
  const collection = await getAPIKeysCollection();

  const result = await collection.deleteOne({
    id: keyId,
    organizationId,
  });

  return result.deletedCount > 0;
}

// ============================================
// Permission Checking
// ============================================

/**
 * Check if an API key has a specific permission
 */
export function hasPermission(
  apiKey: APIKey,
  permission: APIKeyPermission
): boolean {
  return apiKey.permissions.includes(permission);
}

/**
 * Check if an API key can access a specific form
 */
export function canAccessForm(apiKey: APIKey, formId: string): boolean {
  // If no form restrictions, allow all
  if (!apiKey.scopes?.formIds || apiKey.scopes.formIds.length === 0) {
    return true;
  }

  return apiKey.scopes.formIds.includes(formId);
}

/**
 * Check if request IP is allowed
 */
export function isIPAllowed(apiKey: APIKey, ip: string): boolean {
  // If no IP restrictions, allow all
  if (!apiKey.scopes?.allowedIPs || apiKey.scopes.allowedIPs.length === 0) {
    return true;
  }

  return apiKey.scopes.allowedIPs.includes(ip);
}

// ============================================
// Rate Limiting
// ============================================

// In-memory rate limit tracking (consider Redis for production scale)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Check and update rate limit for an API key
 */
export function checkRateLimit(
  apiKey: APIKey,
  type: 'hour' | 'day'
): { allowed: boolean; remaining: number; resetAt: number } {
  const limit =
    type === 'hour'
      ? apiKey.rateLimit?.requestsPerHour || 1000
      : apiKey.rateLimit?.requestsPerDay || 10000;

  const window = type === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const key = `${apiKey.id}:${type}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Reset if window expired
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + window };
    rateLimitStore.set(key, entry);
  }

  // Check limit
  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;

  return {
    allowed: true,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(
  apiKey: APIKey,
  type: 'hour' | 'day'
): { limit: number; remaining: number; resetAt: number } {
  const limit =
    type === 'hour'
      ? apiKey.rateLimit?.requestsPerHour || 1000
      : apiKey.rateLimit?.requestsPerDay || 10000;

  const window = type === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const key = `${apiKey.id}:${type}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    return { limit, remaining: limit, resetAt: now + window };
  }

  return {
    limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}
