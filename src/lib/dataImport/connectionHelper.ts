/**
 * Connection Helper for Data Import
 * Manages MongoDB client connections for import operations
 */

import { MongoClient } from 'mongodb';
import { getDecryptedConnectionString } from '@/lib/platform/connectionVault';

// Cache for MongoDB clients - keyed by orgId:vaultId
const clientCache = new Map<string, MongoClient>();

/**
 * Get a MongoDB client for a vault connection
 * Requires organizationId to properly access the vault
 */
export async function getTargetClient(
  organizationId: string,
  vaultId: string
): Promise<MongoClient> {
  const cacheKey = `${organizationId}:${vaultId}`;

  if (clientCache.has(cacheKey)) {
    const client = clientCache.get(cacheKey)!;
    // Verify connection is still alive
    try {
      await client.db().admin().ping();
      return client;
    } catch {
      clientCache.delete(cacheKey);
    }
  }

  const result = await getDecryptedConnectionString(organizationId, vaultId);
  if (!result) {
    throw new Error('Connection not found or access denied');
  }

  const client = new MongoClient(result.connectionString);
  await client.connect();
  clientCache.set(cacheKey, client);

  return client;
}

/**
 * Create a getTargetClient function bound to a specific organizationId
 * This is useful for the ImportService which expects a single-argument function
 */
export function createTargetClientGetter(organizationId: string) {
  return (vaultId: string) => getTargetClient(organizationId, vaultId);
}

/**
 * Close and remove a client from the cache
 */
export async function closeClient(organizationId: string, vaultId: string): Promise<void> {
  const cacheKey = `${organizationId}:${vaultId}`;
  const client = clientCache.get(cacheKey);
  if (client) {
    try {
      await client.close();
    } catch {
      // Ignore close errors
    }
    clientCache.delete(cacheKey);
  }
}

/**
 * Close all cached clients
 */
export async function closeAllClients(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  clientCache.forEach((client, key) => {
    closePromises.push(
      client.close().catch(() => {
        // Ignore close errors
      })
    );
  });

  await Promise.all(closePromises);
  clientCache.clear();
}
