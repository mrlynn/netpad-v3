/**
 * Connection Vault Service
 *
 * Securely stores and manages MongoDB connection strings.
 * Connection strings are encrypted at rest using AES-256-GCM.
 *
 * Key features:
 * - Encryption at rest
 * - Organization isolation
 * - Permission-based access
 * - Collection whitelisting
 * - Usage tracking
 */

import { MongoClient } from 'mongodb';
import { getConnectionVaultCollection, getOrgAuditCollection } from './db';
import { encrypt, decrypt, generateSecureId } from '../encryption';
import {
  ConnectionVault,
  ConnectionPermission,
  ConnectionRole,
  CONNECTION_ROLE_CAPABILITIES,
  AuditLogEntry,
} from '@/types/platform';

// ============================================
// Vault CRUD Operations
// ============================================

export interface CreateVaultInput {
  organizationId: string;
  projectId: string;                    // REQUIRED: NetPad project ID
  createdBy: string;
  name: string;
  description?: string;
  connectionString: string;
  database: string;
  allowedCollections: string[];
}

/**
 * Create a new connection vault entry
 */
export async function createConnectionVault(input: CreateVaultInput): Promise<ConnectionVault> {
  const collection = await getConnectionVaultCollection(input.organizationId);

  // Encrypt the connection string
  const encryptedConnectionString = encrypt(input.connectionString);

  // Validate projectId
  if (!input.projectId) {
    throw new Error('Project ID is required');
  }

  // Verify project exists and belongs to organization
  const { getProject } = await import('./projects');
  const project = await getProject(input.projectId);
  if (!project || project.organizationId !== input.organizationId) {
    throw new Error('Invalid project or project does not belong to this organization');
  }

  const vault: ConnectionVault = {
    vaultId: generateSecureId('vault'),
    organizationId: input.organizationId,
    projectId: input.projectId,
    createdBy: input.createdBy,
    name: input.name,
    description: input.description,
    encryptedConnectionString,
    encryptionKeyId: 'v1',
    database: input.database,
    allowedCollections: input.allowedCollections,
    permissions: [
      {
        userId: input.createdBy,
        role: 'owner',
        grantedAt: new Date(),
        grantedBy: input.createdBy,
      },
    ],
    status: 'active',
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await collection.insertOne(vault);

  // Audit log
  await logVaultEvent(input.organizationId, {
    eventType: 'connection.created',
    userId: input.createdBy,
    resourceType: 'connection',
    resourceId: vault.vaultId,
    organizationId: input.organizationId,
    action: 'create',
    details: {
      name: input.name,
      database: input.database,
      allowedCollections: input.allowedCollections,
    },
    timestamp: new Date(),
  });

  // Return without the encrypted connection string for safety
  return {
    ...vault,
    encryptedConnectionString: '[REDACTED]',
  };
}

/**
 * Get a vault entry by ID (without connection string)
 */
export async function getVault(
  organizationId: string,
  vaultId: string
): Promise<ConnectionVault | null> {
  const collection = await getConnectionVaultCollection(organizationId);
  const vault = await collection.findOne({ vaultId, status: { $ne: 'deleted' } });

  if (!vault) return null;

  // Redact connection string
  return {
    ...vault,
    encryptedConnectionString: '[REDACTED]',
  };
}

/**
 * Get the decrypted connection string (internal use only)
 * This should only be called during form submission
 */
export async function getDecryptedConnectionString(
  organizationId: string,
  vaultId: string
): Promise<{ connectionString: string; database: string } | null> {
  const collection = await getConnectionVaultCollection(organizationId);
  const vault = await collection.findOne({ vaultId, status: 'active' });

  if (!vault) return null;

  try {
    const connectionString = decrypt(vault.encryptedConnectionString);

    // Update usage stats
    await collection.updateOne(
      { vaultId },
      {
        $set: { lastUsedAt: new Date(), updatedAt: new Date() },
        $inc: { usageCount: 1 },
      }
    );

    return {
      connectionString,
      database: vault.database,
    };
  } catch (error) {
    console.error(`[Vault] Failed to decrypt connection string for ${vaultId}:`, error);
    return null;
  }
}

/**
 * List all vaults for an organization
 */
export async function listVaults(organizationId: string): Promise<ConnectionVault[]> {
  const collection = await getConnectionVaultCollection(organizationId);
  const vaults = await collection
    .find({ status: { $ne: 'deleted' } })
    .sort({ createdAt: -1 })
    .toArray();

  // Redact all connection strings
  return vaults.map((v) => ({
    ...v,
    encryptedConnectionString: '[REDACTED]',
  }));
}

/**
 * List vaults accessible by a specific user
 */
export async function listUserVaults(
  organizationId: string,
  userId: string
): Promise<ConnectionVault[]> {
  const collection = await getConnectionVaultCollection(organizationId);
  const vaults = await collection
    .find({
      status: { $ne: 'deleted' },
      'permissions.userId': userId,
    })
    .sort({ createdAt: -1 })
    .toArray();

  return vaults.map((v) => ({
    ...v,
    encryptedConnectionString: '[REDACTED]',
  }));
}

/**
 * Duplicate an existing vault with a new name and optionally different database
 */
export interface DuplicateVaultInput {
  name: string;
  projectId: string;                    // Target project ID
  description?: string;
  database?: string; // Optional: use different database
  allowedCollections?: string[]; // Optional: override collections
}

export async function duplicateConnectionVault(
  organizationId: string,
  sourceVaultId: string,
  input: DuplicateVaultInput,
  duplicatedBy: string
): Promise<ConnectionVault> {
  const collection = await getConnectionVaultCollection(organizationId);

  // Get the source vault with encrypted connection string
  const sourceVault = await collection.findOne({ vaultId: sourceVaultId, status: 'active' });

  if (!sourceVault) {
    throw new Error('Source connection not found or not active');
  }

  // Create new vault with same connection string but new metadata
  const newVault: ConnectionVault = {
    vaultId: generateSecureId('vault'),
    organizationId,
    projectId: input.projectId,
    createdBy: duplicatedBy,
    name: input.name,
    description: input.description || sourceVault.description,
    encryptedConnectionString: sourceVault.encryptedConnectionString, // Copy encrypted string
    encryptionKeyId: sourceVault.encryptionKeyId,
    database: input.database || sourceVault.database,
    allowedCollections: input.allowedCollections || sourceVault.allowedCollections,
    permissions: [
      {
        userId: duplicatedBy,
        role: 'owner',
        grantedAt: new Date(),
        grantedBy: duplicatedBy,
      },
    ],
    status: 'active',
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await collection.insertOne(newVault);

  // Audit log
  await logVaultEvent(organizationId, {
    eventType: 'connection.created',
    userId: duplicatedBy,
    resourceType: 'connection',
    resourceId: newVault.vaultId,
    organizationId,
    action: 'create',
    details: {
      name: input.name,
      database: newVault.database,
      allowedCollections: newVault.allowedCollections,
      duplicatedFrom: sourceVaultId,
    },
    timestamp: new Date(),
  });

  // Return without the encrypted connection string for safety
  return {
    ...newVault,
    encryptedConnectionString: '[REDACTED]',
  };
}

/**
 * Update vault metadata (not the connection string)
 */
export async function updateVault(
  organizationId: string,
  vaultId: string,
  updates: {
    name?: string;
    description?: string;
    allowedCollections?: string[];
    status?: 'active' | 'disabled';
  },
  updatedBy: string
): Promise<boolean> {
  const collection = await getConnectionVaultCollection(organizationId);

  const result = await collection.updateOne(
    { vaultId, status: { $ne: 'deleted' } },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    }
  );

  if (result.modifiedCount > 0) {
    await logVaultEvent(organizationId, {
      eventType: 'connection.updated',
      userId: updatedBy,
      resourceType: 'connection',
      resourceId: vaultId,
      organizationId,
      action: 'update',
      details: updates,
      timestamp: new Date(),
    });
  }

  return result.modifiedCount > 0;
}

/**
 * Update the connection string (re-encrypts)
 */
export async function updateConnectionString(
  organizationId: string,
  vaultId: string,
  newConnectionString: string,
  updatedBy: string
): Promise<boolean> {
  const collection = await getConnectionVaultCollection(organizationId);

  const encryptedConnectionString = encrypt(newConnectionString);

  const result = await collection.updateOne(
    { vaultId, status: { $ne: 'deleted' } },
    {
      $set: {
        encryptedConnectionString,
        updatedAt: new Date(),
      },
    }
  );

  if (result.modifiedCount > 0) {
    await logVaultEvent(organizationId, {
      eventType: 'connection.updated',
      userId: updatedBy,
      resourceType: 'connection',
      resourceId: vaultId,
      organizationId,
      action: 'update_connection_string',
      details: { connectionStringUpdated: true },
      timestamp: new Date(),
    });
  }

  return result.modifiedCount > 0;
}

/**
 * Soft delete a vault
 */
export async function deleteVault(
  organizationId: string,
  vaultId: string,
  deletedBy: string
): Promise<boolean> {
  const collection = await getConnectionVaultCollection(organizationId);

  const result = await collection.updateOne(
    { vaultId },
    {
      $set: {
        status: 'deleted',
        updatedAt: new Date(),
      },
    }
  );

  if (result.modifiedCount > 0) {
    await logVaultEvent(organizationId, {
      eventType: 'connection.deleted',
      userId: deletedBy,
      resourceType: 'connection',
      resourceId: vaultId,
      organizationId,
      action: 'delete',
      details: {},
      timestamp: new Date(),
    });
  }

  return result.modifiedCount > 0;
}

// ============================================
// Permission Management
// ============================================

/**
 * Check if a user has a specific permission on a vault
 */
export async function checkVaultPermission(
  organizationId: string,
  vaultId: string,
  userId: string,
  requiredCapability: string
): Promise<boolean> {
  const collection = await getConnectionVaultCollection(organizationId);
  const vault = await collection.findOne({ vaultId, status: { $ne: 'deleted' } });

  if (!vault) return false;

  const userPermission = vault.permissions.find((p) => p.userId === userId);
  if (!userPermission) return false;

  const capabilities = CONNECTION_ROLE_CAPABILITIES[userPermission.role];
  return capabilities.includes(requiredCapability);
}

/**
 * Get a user's role on a vault
 */
export async function getVaultRole(
  organizationId: string,
  vaultId: string,
  userId: string
): Promise<ConnectionRole | null> {
  const collection = await getConnectionVaultCollection(organizationId);
  const vault = await collection.findOne({ vaultId, status: { $ne: 'deleted' } });

  if (!vault) return null;

  const userPermission = vault.permissions.find((p) => p.userId === userId);
  return userPermission?.role || null;
}

/**
 * Add or update a user's permission on a vault
 */
export async function setVaultPermission(
  organizationId: string,
  vaultId: string,
  permission: ConnectionPermission
): Promise<boolean> {
  const collection = await getConnectionVaultCollection(organizationId);

  // Remove existing permission for this user if any
  await collection.updateOne(
    { vaultId },
    { $pull: { permissions: { userId: permission.userId } } }
  );

  // Add new permission
  const result = await collection.updateOne(
    { vaultId },
    {
      $push: { permissions: permission },
      $set: { updatedAt: new Date() },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Remove a user's permission from a vault
 */
export async function removeVaultPermission(
  organizationId: string,
  vaultId: string,
  userId: string
): Promise<boolean> {
  const collection = await getConnectionVaultCollection(organizationId);

  const result = await collection.updateOne(
    { vaultId },
    {
      $pull: { permissions: { userId } },
      $set: { updatedAt: new Date() },
    }
  );

  return result.modifiedCount > 0;
}

// ============================================
// Connection Testing
// ============================================

/**
 * Test a connection string (before saving to vault)
 */
export async function testConnectionString(
  connectionString: string,
  database: string
): Promise<{ success: boolean; error?: string; collections?: string[] }> {
  let client: MongoClient | null = null;

  try {
    client = new MongoClient(connectionString, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    await client.connect();

    // Try to list collections
    const db = client.db(database);
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    return {
      success: true,
      collections: collectionNames,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * Test an existing vault's connection
 */
export async function testVaultConnection(
  organizationId: string,
  vaultId: string,
  testedBy: string
): Promise<{ success: boolean; error?: string; collections?: string[] }> {
  const credentials = await getDecryptedConnectionString(organizationId, vaultId);

  if (!credentials) {
    return { success: false, error: 'Vault not found or could not decrypt' };
  }

  const result = await testConnectionString(credentials.connectionString, credentials.database);

  // Update last tested timestamp
  const collection = await getConnectionVaultCollection(organizationId);
  await collection.updateOne(
    { vaultId },
    { $set: { lastTestedAt: new Date(), updatedAt: new Date() } }
  );

  // Log the test
  await logVaultEvent(organizationId, {
    eventType: 'connection.tested',
    userId: testedBy,
    resourceType: 'connection',
    resourceId: vaultId,
    organizationId,
    action: 'test',
    details: { success: result.success, error: result.error },
    timestamp: new Date(),
  });

  return result;
}

// ============================================
// Collection Validation
// ============================================

/**
 * Check if a collection is allowed for a vault.
 * If vaultId is undefined, uses the org's default database and allows all collections.
 */
export async function isCollectionAllowed(
  organizationId: string,
  vaultId: string | undefined,
  collection: string
): Promise<boolean> {
  // If no vaultId, we're using the org's default database - allow all collections
  if (!vaultId) {
    return true;
  }

  const vault = await getVault(organizationId, vaultId);

  if (!vault) return false;

  // If allowedCollections is empty, all collections are allowed
  if (vault.allowedCollections.length === 0) return true;

  return vault.allowedCollections.includes(collection);
}

// ============================================
// Audit Logging
// ============================================

async function logVaultEvent(
  organizationId: string,
  event: Omit<AuditLogEntry, '_id'>
): Promise<void> {
  try {
    const auditCollection = await getOrgAuditCollection(organizationId);
    await auditCollection.insertOne(event as AuditLogEntry);
  } catch (error) {
    console.error('[Vault Audit] Failed to log event:', error);
  }
}
