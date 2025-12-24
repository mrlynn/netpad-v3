/**
 * Collections API - Single collection operations
 *
 * GET /api/collections/[collectionName] - Get collection details and sample documents
 * DELETE /api/collections/[collectionName] - Drop collection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, ensureSessionId, SessionData } from '@/lib/session';
import { getDecryptedConnectionString } from '@/lib/platform/connectionVault';
import { MongoClient } from 'mongodb';
import { inferSchema } from '@/lib/dataImport';

export const dynamic = 'force-dynamic';

// Cache for MongoDB clients
const clientCache = new Map<string, MongoClient>();

async function getClient(organizationId: string, vaultId: string): Promise<MongoClient> {
  const cacheKey = `${organizationId}:${vaultId}`;
  if (clientCache.has(cacheKey)) {
    const client = clientCache.get(cacheKey)!;
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
 * Get collection details and sample documents
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collectionName: string }> }
) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    ensureSessionId(session);
    await session.save();

    const { collectionName } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const vaultId = searchParams.get('vaultId');
    const database = searchParams.get('database');
    const sampleSize = parseInt(searchParams.get('sampleSize') || '100', 10);
    const inferSchemaFlag = searchParams.get('inferSchema') === 'true';

    if (!organizationId || !vaultId || !database) {
      return NextResponse.json(
        { error: 'organizationId, vaultId, and database are required' },
        { status: 400 }
      );
    }

    const client = await getClient(organizationId, vaultId);
    const db = client.db(database);
    const collection = db.collection(collectionName);

    // Get collection stats
    let stats: any = {};
    try {
      stats = await db.command({ collStats: collectionName });
    } catch {
      // Stats may not be available
    }

    // Get indexes
    let indexes: any[] = [];
    try {
      indexes = await collection.indexes();
    } catch {
      // Indexes may not be available
    }

    // Get sample documents
    const sampleDocs = await collection
      .find({})
      .limit(sampleSize)
      .toArray();

    // Infer schema if requested
    let inferredSchema = null;
    if (inferSchemaFlag && sampleDocs.length > 0) {
      // Convert documents to records format
      const headers = new Set<string>();
      sampleDocs.forEach(doc => {
        Object.keys(doc).forEach(key => headers.add(key));
      });

      const records = sampleDocs.map((doc, index) => ({
        rowNumber: index + 1,
        data: doc,
      }));

      inferredSchema = inferSchema(
        Array.from(headers),
        records,
        { suggestedCollection: collectionName }
      );
    }

    return NextResponse.json({
      collection: collectionName,
      database,
      stats: {
        documentCount: stats.count || sampleDocs.length,
        storageSize: stats.storageSize,
        avgDocumentSize: stats.avgObjSize,
        totalIndexSize: stats.totalIndexSize,
      },
      indexes: indexes.map(idx => ({
        name: idx.name,
        key: idx.key,
        unique: idx.unique,
        sparse: idx.sparse,
      })),
      sampleDocuments: sampleDocs.slice(0, 10), // Return first 10 for preview
      totalSampled: sampleDocs.length,
      inferredSchema,
    });
  } catch (error) {
    console.error('Error getting collection details:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get collection details' },
      { status: 500 }
    );
  }
}

/**
 * Drop collection
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ collectionName: string }> }
) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    ensureSessionId(session);
    await session.save();

    const { collectionName } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const vaultId = searchParams.get('vaultId');
    const database = searchParams.get('database');
    const confirm = searchParams.get('confirm');

    if (!organizationId || !vaultId || !database) {
      return NextResponse.json(
        { error: 'organizationId, vaultId, and database are required' },
        { status: 400 }
      );
    }

    // Require confirmation
    if (confirm !== 'true') {
      return NextResponse.json(
        { error: 'Confirmation required. Add confirm=true to delete.' },
        { status: 400 }
      );
    }

    const client = await getClient(organizationId, vaultId);
    const db = client.db(database);

    // Check if collection exists
    const collections = await db.listCollections({ name: collectionName }).toArray();
    if (collections.length === 0) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Drop the collection
    await db.dropCollection(collectionName);

    return NextResponse.json({
      success: true,
      message: `Collection '${collectionName}' dropped successfully`,
    });
  } catch (error) {
    console.error('Error dropping collection:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to drop collection' },
      { status: 500 }
    );
  }
}
