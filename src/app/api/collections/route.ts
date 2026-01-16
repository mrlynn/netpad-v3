/**
 * Collections API - Browse and manage MongoDB collections
 *
 * GET /api/collections - List collections for a connection
 * POST /api/collections - Create a new collection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, ensureSessionId, SessionData } from '@/lib/session';
import { getDecryptedConnectionString } from '@/lib/platform/connectionVault';
import { MongoClient } from 'mongodb';
import { CollectionInfo } from '@/types/dataImport';

export const dynamic = 'force-dynamic';

// Cache for MongoDB clients
const clientCache = new Map<string, MongoClient>();

async function getClient(organizationId: string, vaultId: string): Promise<MongoClient> {
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
 * List collections for a connection
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    ensureSessionId(session);
    await session.save();

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const vaultId = searchParams.get('vaultId');
    const database = searchParams.get('database');
    const includeStats = searchParams.get('includeStats') === 'true';
    const includeSample = searchParams.get('includeSample') === 'true';

    if (!organizationId || !vaultId) {
      return NextResponse.json(
        { error: 'organizationId and vaultId are required' },
        { status: 400 }
      );
    }

    const client = await getClient(organizationId, vaultId);

    // If no database specified, list all databases
    if (!database) {
      const adminDb = client.db().admin();
      const { databases } = await adminDb.listDatabases();

      // Filter out system databases
      const userDatabases = databases.filter(
        db => !['admin', 'local', 'config'].includes(db.name)
      );

      return NextResponse.json({
        databases: userDatabases.map(db => ({
          name: db.name,
          sizeOnDisk: db.sizeOnDisk,
          empty: db.empty,
        })),
      });
    }

    // List collections in the specified database
    const db = client.db(database);
    const collections = await db.listCollections().toArray();

    // Build collection info in parallel for better performance
    const collectionInfos: CollectionInfo[] = await Promise.all(
      collections.map(async (coll) => {
        const info: CollectionInfo = {
          name: coll.name,
          database,
          type: coll.type === 'view' ? 'view' : 'collection',
          documentCount: 0,
          storageSize: 0,
          avgDocSize: 0,
          indexes: [],
        };

        // Build list of parallel operations
        const operations: Promise<unknown>[] = [];
        const operationTypes: ('stats' | 'indexes' | 'sample')[] = [];

        if (includeStats && coll.type !== 'view') {
          operations.push(db.command({ collStats: coll.name }));
          operationTypes.push('stats');
          operations.push(db.collection(coll.name).indexes());
          operationTypes.push('indexes');
        }

        if (includeSample && coll.type !== 'view') {
          operations.push(db.collection(coll.name).findOne({}));
          operationTypes.push('sample');
        }

        // Execute all operations in parallel
        if (operations.length > 0) {
          const results = await Promise.allSettled(operations);

          results.forEach((result, index) => {
            if (result.status !== 'fulfilled') return;

            const type = operationTypes[index];
            if (type === 'stats') {
              const stats = result.value as { count?: number; storageSize?: number; avgObjSize?: number };
              info.documentCount = stats.count || 0;
              info.storageSize = stats.storageSize || 0;
              info.avgDocSize = stats.avgObjSize || 0;
            } else if (type === 'indexes') {
              const indexes = result.value as Array<{ name?: string; key: Record<string, unknown>; unique?: boolean; sparse?: boolean; expireAfterSeconds?: number }>;
              info.indexes = indexes.map(idx => ({
                name: idx.name || '',
                key: idx.key as Record<string, 1 | -1 | 'text' | '2dsphere'>,
                unique: idx.unique,
                sparse: idx.sparse,
                expireAfterSeconds: idx.expireAfterSeconds,
              }));
            } else if (type === 'sample') {
              const sample = result.value as Record<string, unknown> | null;
              if (sample) {
                // Store sample schema (just the keys, not values)
                // @ts-ignore - adding extra field
                info.sampleKeys = Object.keys(sample);
              }
            }
          });
        }

        return info;
      })
    );

    // Return with cache headers - cache for 5 minutes, allow stale for 1 minute while revalidating
    return NextResponse.json(
      {
        database,
        collections: collectionInfos,
        total: collectionInfos.length,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Error listing collections:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list collections' },
      { status: 500 }
    );
  }
}

/**
 * Create a new collection
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    ensureSessionId(session);
    await session.save();

    const body = await request.json();
    const { organizationId, vaultId, database, collectionName, options } = body;

    if (!organizationId || !vaultId || !database || !collectionName) {
      return NextResponse.json(
        { error: 'organizationId, vaultId, database, and collectionName are required' },
        { status: 400 }
      );
    }

    // Validate collection name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(collectionName)) {
      return NextResponse.json(
        { error: 'Invalid collection name. Use alphanumeric characters and underscores.' },
        { status: 400 }
      );
    }

    const client = await getClient(organizationId, vaultId);
    const db = client.db(database);

    // Check if collection already exists
    const existingCollections = await db.listCollections({ name: collectionName }).toArray();
    if (existingCollections.length > 0) {
      return NextResponse.json(
        { error: 'Collection already exists' },
        { status: 409 }
      );
    }

    // Create collection with optional settings
    const createOptions: any = {};
    if (options?.capped) {
      createOptions.capped = true;
      createOptions.size = options.size || 1000000; // 1MB default
      if (options.max) {
        createOptions.max = options.max;
      }
    }
    if (options?.timeseries) {
      createOptions.timeseries = options.timeseries;
    }

    await db.createCollection(collectionName, createOptions);

    // Create indexes if specified - use Promise.all for parallel creation
    if (options?.indexes && Array.isArray(options.indexes)) {
      const collection = db.collection(collectionName);
      await Promise.all(
        options.indexes.map((index: { key: Record<string, 1 | -1 | 'text' | '2dsphere'>; unique?: boolean; sparse?: boolean; expireAfterSeconds?: number }) =>
          collection.createIndex(index.key, {
            unique: index.unique,
            sparse: index.sparse,
            expireAfterSeconds: index.expireAfterSeconds,
          })
        )
      );
    }

    return NextResponse.json({
      success: true,
      collection: collectionName,
      database,
      message: 'Collection created successfully',
    });
  } catch (error) {
    console.error('Error creating collection:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create collection' },
      { status: 500 }
    );
  }
}
