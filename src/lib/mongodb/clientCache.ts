/**
 * MongoDB Client Connection Cache
 *
 * Provides connection pooling and caching for MongoDB clients to avoid
 * creating new connections on every API request.
 *
 * Features:
 * - Connection reuse across requests
 * - Automatic connection health checks
 * - TTL-based cache cleanup
 * - Thread-safe singleton pattern
 */

import { MongoClient, MongoClientOptions } from 'mongodb';

interface CachedClient {
  client: MongoClient;
  lastUsed: number;
  connectionString: string;
}

// Cache for MongoDB clients - keyed by connection string hash
const clientCache = new Map<string, CachedClient>();

// Default client options optimized for serverless
const DEFAULT_OPTIONS: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 60000, // 1 minute idle timeout
  connectTimeoutMS: 10000, // 10 second connection timeout
  socketTimeoutMS: 45000, // 45 second socket timeout
  serverSelectionTimeoutMS: 10000, // 10 second server selection timeout
};

// Cache TTL - close unused connections after 10 minutes
const CACHE_TTL_MS = 10 * 60 * 1000;

// Cleanup interval - check for stale connections every 2 minutes
const CLEANUP_INTERVAL_MS = 2 * 60 * 1000;

/**
 * Generate a cache key from connection string
 * Uses a simple hash to avoid storing full connection strings in memory
 */
function getCacheKey(connectionString: string): string {
  let hash = 0;
  for (let i = 0; i < connectionString.length; i++) {
    const char = connectionString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `mongo_${hash}`;
}

/**
 * Get or create a cached MongoDB client
 *
 * @param connectionString - MongoDB connection string
 * @param options - Optional MongoClient options
 * @returns Connected MongoClient instance
 */
export async function getClient(
  connectionString: string,
  options?: MongoClientOptions
): Promise<MongoClient> {
  const cacheKey = getCacheKey(connectionString);
  const now = Date.now();

  // Check if we have a cached client
  const cached = clientCache.get(cacheKey);
  if (cached) {
    // Verify connection is still alive
    try {
      await cached.client.db().admin().ping();
      cached.lastUsed = now;
      return cached.client;
    } catch {
      // Connection is dead, remove from cache
      await cached.client.close().catch(() => {});
      clientCache.delete(cacheKey);
    }
  }

  // Create new client with merged options
  const client = new MongoClient(connectionString, {
    ...DEFAULT_OPTIONS,
    ...options,
  });

  await client.connect();

  // Cache the client
  clientCache.set(cacheKey, {
    client,
    lastUsed: now,
    connectionString,
  });

  return client;
}

/**
 * Close and remove a specific client from cache
 */
export async function closeClient(connectionString: string): Promise<void> {
  const cacheKey = getCacheKey(connectionString);
  const cached = clientCache.get(cacheKey);
  if (cached) {
    await cached.client.close().catch(() => {});
    clientCache.delete(cacheKey);
  }
}

/**
 * Close all cached clients
 * Useful for graceful shutdown
 */
export async function closeAllClients(): Promise<void> {
  const closePromises = Array.from(clientCache.values()).map(
    (cached) => cached.client.close().catch(() => {})
  );
  await Promise.all(closePromises);
  clientCache.clear();
}

/**
 * Clean up stale connections
 * Called periodically to close unused connections
 */
function cleanupStaleConnections(): void {
  const now = Date.now();
  const staleKeys: string[] = [];

  clientCache.forEach((cached, key) => {
    if (now - cached.lastUsed > CACHE_TTL_MS) {
      staleKeys.push(key);
    }
  });

  staleKeys.forEach((key) => {
    const cached = clientCache.get(key);
    if (cached) {
      cached.client.close().catch(() => {});
      clientCache.delete(key);
    }
  });
}

// Start cleanup interval (only in Node.js environment)
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(cleanupStaleConnections, CLEANUP_INTERVAL_MS);
  // Don't prevent process exit
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats(): {
  size: number;
  connections: Array<{ key: string; lastUsed: number; age: number }>;
} {
  const now = Date.now();
  return {
    size: clientCache.size,
    connections: Array.from(clientCache.entries()).map(([key, cached]) => ({
      key,
      lastUsed: cached.lastUsed,
      age: now - cached.lastUsed,
    })),
  };
}
