import { MongoClient } from 'mongodb';

let client: MongoClient | null = null;

/**
 * Get a connected database instance.
 * Env vars are validated lazily (at call time, not import time)
 * so Next.js builds don't crash when env vars aren't set.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DATABASE;

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  if (!dbName) {
    throw new Error('MONGODB_DATABASE environment variable is not set');
  }

  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }

  return client.db(dbName);
}

// ============================================
// User Connection Pool (for user-provided URIs)
// ============================================

// Use global to survive HMR in development
declare global {
  // eslint-disable-next-line no-var
  var __userConnectionCache: Map<string, { client: MongoClient; lastUsed: number }> | undefined;
}

if (!global.__userConnectionCache) {
  global.__userConnectionCache = new Map();
}

const userConnectionCache = global.__userConnectionCache;

// Cache TTL: 5 minutes (connections unused for longer will be closed)
const CONNECTION_TTL_MS = 5 * 60 * 1000;

// Cleanup interval: 1 minute
const CLEANUP_INTERVAL_MS = 60 * 1000;

// Max connections per URI (prevent memory leaks)
const MAX_CACHED_CONNECTIONS = 50;

/**
 * Get a pooled MongoClient for a user-provided connection string.
 * Connections are cached for 5 minutes to avoid repeated connect/disconnect overhead.
 *
 * @param connectionString - MongoDB connection URI
 * @returns MongoClient instance (may be shared across requests)
 */
export async function getUserClient(connectionString: string): Promise<MongoClient> {
  // Create a hash key for the connection string (for privacy in logs)
  const cacheKey = connectionString;

  const cached = userConnectionCache.get(cacheKey);
  if (cached) {
    cached.lastUsed = Date.now();
    return cached.client;
  }

  // Enforce max connections limit
  if (userConnectionCache.size >= MAX_CACHED_CONNECTIONS) {
    // Remove oldest connection
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of userConnectionCache) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      const oldEntry = userConnectionCache.get(oldestKey);
      userConnectionCache.delete(oldestKey);
      oldEntry?.client.close().catch(() => {});
    }
  }

  // Create new connection
  const newClient = new MongoClient(connectionString, {
    maxPoolSize: 5, // Limit pool size for user connections
    minPoolSize: 1,
    maxIdleTimeMS: CONNECTION_TTL_MS,
  });

  await newClient.connect();

  userConnectionCache.set(cacheKey, {
    client: newClient,
    lastUsed: Date.now(),
  });

  return newClient;
}

/**
 * Close a specific user connection (call when user disconnects)
 */
export async function closeUserConnection(connectionString: string): Promise<void> {
  const cached = userConnectionCache.get(connectionString);
  if (cached) {
    userConnectionCache.delete(connectionString);
    await cached.client.close().catch(() => {});
  }
}

// Periodic cleanup of stale connections
let cleanupInterval: NodeJS.Timeout | null = null;

function startConnectionCleanup() {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of userConnectionCache) {
      if (now - entry.lastUsed > CONNECTION_TTL_MS) {
        userConnectionCache.delete(key);
        entry.client.close().catch(() => {});
        console.log('[MongoDB] Closed stale user connection');
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Don't prevent Node from exiting
  cleanupInterval.unref();
}

// Start cleanup on first import
startConnectionCleanup();
