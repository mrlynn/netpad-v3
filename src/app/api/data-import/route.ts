/**
 * Data Import API - Main endpoint for creating and listing import jobs
 *
 * POST /api/data-import - Create a new import job
 * GET /api/data-import - List import jobs for the organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, ensureSessionId, SessionData } from '@/lib/session';
import { getPlatformDb } from '@/lib/platform/db';
import { ImportService } from '@/lib/dataImport';
import { getDecryptedConnectionString } from '@/lib/platform/connectionVault';
import { MongoClient } from 'mongodb';
import { ImportJobStatus } from '@/types/dataImport';

export const dynamic = 'force-dynamic';

// Cache for MongoDB clients
const clientCache = new Map<string, MongoClient>();

async function getTargetClient(organizationId: string, vaultId: string): Promise<MongoClient> {
  const cacheKey = `${organizationId}:${vaultId}`;
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
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
 * Create a new import job
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    const sessionId = ensureSessionId(session);
    await session.save();

    const body = await request.json();
    const {
      organizationId,
      vaultId,
      database,
      collection,
      createCollection,
      sourceConfig,
      fileName,
      fileSize,
      mimeType,
    } = body;

    // Validate required fields
    if (!organizationId || !vaultId || !database || !collection) {
      return NextResponse.json(
        { error: 'Missing required fields: organizationId, vaultId, database, collection' },
        { status: 400 }
      );
    }

    // Get platform DB
    const platformDb = await getPlatformDb();

    // Create import service with a factory function that captures organizationId
    const importService = new ImportService({
      platformDb,
      getTargetClient: (vid: string) => getTargetClient(organizationId, vid),
    });

    // Create import job
    const job = await importService.createImportJob({
      organizationId,
      createdBy: sessionId,
      sourceFile: {
        name: fileName || 'unknown',
        size: fileSize || 0,
        mimeType: mimeType || 'text/csv',
      },
      sourceConfig: sourceConfig || {
        format: 'csv',
        hasHeader: true,
        delimiter: ',',
      },
      targetVaultId: vaultId,
      targetDatabase: database,
      targetCollection: collection,
      createCollection: createCollection ?? true,
    });

    return NextResponse.json({
      importId: job.importId,
      status: job.status,
      message: 'Import job created successfully',
    });
  } catch (error) {
    console.error('Error creating import job:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create import job' },
      { status: 500 }
    );
  }
}

/**
 * List import jobs for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    const sessionId = ensureSessionId(session);
    await session.save();

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status') as ImportJobStatus | null;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    const platformDb = await getPlatformDb();
    const importService = new ImportService({
      platformDb,
      getTargetClient: (vid: string) => getTargetClient(organizationId, vid),
    });

    const { jobs, total } = await importService.listImportJobs(organizationId, {
      status: status || undefined,
      limit,
      skip,
    });

    return NextResponse.json({
      jobs,
      total,
      hasMore: skip + jobs.length < total,
    });
  } catch (error) {
    console.error('Error listing import jobs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list import jobs' },
      { status: 500 }
    );
  }
}
