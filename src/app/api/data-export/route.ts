/**
 * Data Export API
 *
 * POST /api/data-export - Export documents from a collection
 *
 * Request body (vault connection):
 * {
 *   organizationId: string;
 *   vaultId: string;
 *   database: string;
 *   collection: string;
 *   format: 'csv' | 'json' | 'jsonl';
 *   query?: object;
 *   fields?: string[];
 *   limit?: number;
 *   includeId?: boolean;
 * }
 *
 * Request body (direct connection):
 * {
 *   connectionString: string;
 *   database: string;
 *   collection: string;
 *   format: 'csv' | 'json' | 'jsonl';
 *   query?: object;
 *   fields?: string[];
 *   limit?: number;
 *   includeId?: boolean;
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, ensureSessionId, SessionData } from '@/lib/session';
import { getDecryptedConnectionString } from '@/lib/platform/connectionVault';
import { MongoClient } from 'mongodb';
import {
  exportDocuments,
  getMimeType,
  getFileExtension,
  ExportFormat,
  ExportOptions,
} from '@/lib/dataExport';

export const dynamic = 'force-dynamic';

interface ExportRequest {
  // Vault connection
  organizationId?: string;
  vaultId?: string;
  // Direct connection
  connectionString?: string;
  // Common fields
  database: string;
  collection: string;
  format: ExportFormat;
  query?: Record<string, unknown>;
  fields?: string[];
  limit?: number;
  includeId?: boolean;
  flattenObjects?: boolean;
}

export async function POST(request: NextRequest) {
  let client: MongoClient | null = null;

  try {
    // Verify session
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    ensureSessionId(session);
    await session.save();

    const body: ExportRequest = await request.json();
    const {
      organizationId,
      vaultId,
      connectionString: directConnectionString,
      database,
      collection,
      format = 'json',
      query = {},
      fields,
      limit = 10000,  // Default limit to prevent huge exports
      includeId = true,
      flattenObjects = true,
    } = body;

    // Validate required fields
    if (!database || !collection) {
      return NextResponse.json(
        { error: 'Missing required fields: database, collection' },
        { status: 400 }
      );
    }

    // Need either vault connection or direct connection string
    const useVault = organizationId && vaultId;
    const useDirect = directConnectionString;

    if (!useVault && !useDirect) {
      return NextResponse.json(
        { error: 'Must provide either (organizationId + vaultId) or connectionString' },
        { status: 400 }
      );
    }

    // Validate format
    if (!['csv', 'json', 'jsonl'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be csv, json, or jsonl' },
        { status: 400 }
      );
    }

    // Get connection string
    let mongoConnectionString: string;

    if (useVault) {
      const connectionResult = await getDecryptedConnectionString(organizationId, vaultId);
      if (!connectionResult) {
        return NextResponse.json(
          { error: 'Connection not found or access denied' },
          { status: 404 }
        );
      }
      mongoConnectionString = connectionResult.connectionString;
    } else {
      mongoConnectionString = directConnectionString!;
    }

    // Connect to MongoDB
    client = new MongoClient(mongoConnectionString);
    await client.connect();

    const db = client.db(database);
    const coll = db.collection(collection);

    // Build projection if fields specified
    let projection: Record<string, number> | undefined;
    if (fields && fields.length > 0) {
      projection = {};
      for (const field of fields) {
        projection[field] = 1;
      }
      if (includeId) {
        projection._id = 1;
      } else {
        projection._id = 0;
      }
    } else if (!includeId) {
      projection = { _id: 0 };
    }

    // Fetch documents
    const cursor = coll.find(query, { projection }).limit(Math.min(limit, 50000));
    const documents = await cursor.toArray();

    // Export to requested format
    const exportOptions: Partial<ExportOptions> = {
      format,
      fields,
      includeId,
      flattenObjects,
    };

    const exportedData = exportDocuments(
      documents as Record<string, unknown>[],
      exportOptions
    );

    // Create filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${collection}_${timestamp}${getFileExtension(format)}`;

    // Return as downloadable file
    return new NextResponse(exportedData, {
      status: 200,
      headers: {
        'Content-Type': getMimeType(format),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Document-Count': documents.length.toString(),
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * GET /api/data-export - Get export preview (first 10 rows)
 * Supports both vault and direct connection
 */
export async function GET(request: NextRequest) {
  let client: MongoClient | null = null;

  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    ensureSessionId(session);
    await session.save();

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const vaultId = searchParams.get('vaultId');
    const directConnectionString = searchParams.get('connectionString');
    const database = searchParams.get('database');
    const collection = searchParams.get('collection');

    if (!database || !collection) {
      return NextResponse.json(
        { error: 'Missing required parameters: database, collection' },
        { status: 400 }
      );
    }

    const useVault = organizationId && vaultId;
    const useDirect = directConnectionString;

    if (!useVault && !useDirect) {
      return NextResponse.json(
        { error: 'Must provide either (organizationId + vaultId) or connectionString' },
        { status: 400 }
      );
    }

    // Get connection string
    let mongoConnectionString: string;

    if (useVault) {
      const connectionResult = await getDecryptedConnectionString(organizationId, vaultId);
      if (!connectionResult) {
        return NextResponse.json(
          { error: 'Connection not found' },
          { status: 404 }
        );
      }
      mongoConnectionString = connectionResult.connectionString;
    } else {
      mongoConnectionString = directConnectionString!;
    }

    // Connect and get preview
    client = new MongoClient(mongoConnectionString);
    await client.connect();

    const db = client.db(database);
    const coll = db.collection(collection);

    // Get sample documents and total count
    const [documents, totalCount] = await Promise.all([
      coll.find({}).limit(10).toArray(),
      coll.countDocuments(),
    ]);

    // Extract all unique field names
    const fieldsSet = new Set<string>();
    for (const doc of documents) {
      for (const key of Object.keys(doc)) {
        fieldsSet.add(key);
      }
    }

    const fields = Array.from(fieldsSet).sort((a, b) => {
      if (a === '_id') return -1;
      if (b === '_id') return 1;
      return a.localeCompare(b);
    });

    return NextResponse.json({
      totalCount,
      sampleDocuments: documents,
      fields,
    });
  } catch (error) {
    console.error('Export preview error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Preview failed' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}
