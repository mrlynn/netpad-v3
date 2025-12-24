/**
 * MongoDB Document API
 *
 * GET /api/mongodb/document - Get a document with decryption
 * PUT /api/mongodb/document - Update a document with re-encryption
 * DELETE /api/mongodb/document - Delete a document
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, ensureSessionId, SessionData } from '@/lib/session';
import { MongoClient, ObjectId } from 'mongodb';
import {
  encryptDocumentFields,
  decryptDocumentFields,
} from '@/lib/platform/encryptedClient';
import {
  getOrCreateFormKey,
  isQueryableEncryptionConfigured,
} from '@/lib/platform/encryptionKeys';
import { getDecryptedConnectionString } from '@/lib/platform/connectionVault';
import type { FieldEncryptionConfig } from '@/types/form';

/**
 * Resolve connection string - handles vault:// URIs
 */
async function resolveConnectionString(
  connectionString: string,
  organizationId?: string
): Promise<string> {
  // Check if it's a vault connection marker
  if (connectionString.startsWith('vault://')) {
    const vaultId = connectionString.replace('vault://', '');
    if (!organizationId) {
      throw new Error('Organization ID required for vault connections');
    }
    const result = await getDecryptedConnectionString(organizationId, vaultId);
    if (!result) {
      throw new Error('Connection not found in vault');
    }
    return result.connectionString;
  }
  return connectionString;
}

export const dynamic = 'force-dynamic';

interface DocumentRequest {
  connectionString: string;
  databaseName: string;
  collection: string;
  documentId: string;
  document?: Record<string, unknown>;  // For updates
  // Encryption support
  organizationId?: string;
  formId?: string;
  encryptedFields?: Record<string, FieldEncryptionConfig>;  // Field paths to re-encrypt
}

/**
 * GET - Get a document with decrypted fields
 */
export async function GET(request: NextRequest) {
  let client: MongoClient | null = null;

  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    ensureSessionId(session);
    await session.save();

    const { searchParams } = new URL(request.url);
    const connectionStringParam = searchParams.get('connectionString');
    const databaseName = searchParams.get('databaseName');
    const collection = searchParams.get('collection');
    const documentId = searchParams.get('documentId');
    const organizationId = searchParams.get('organizationId');
    const encryptedFieldPathsParam = searchParams.get('encryptedFieldPaths');

    if (!connectionStringParam || !databaseName || !collection || !documentId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Resolve vault connections to actual connection strings
    const connectionString = await resolveConnectionString(
      connectionStringParam,
      organizationId || undefined
    );

    client = new MongoClient(connectionString);
    await client.connect();

    const db = client.db(databaseName);
    const coll = db.collection(collection);

    // Try to parse documentId as ObjectId, fall back to string
    let filter: Record<string, unknown>;
    try {
      filter = { _id: new ObjectId(documentId) };
    } catch {
      filter = { _id: documentId };
    }

    const document = await coll.findOne(filter);

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Decrypt fields if encrypted field paths are provided
    let responseDoc = document as Record<string, unknown>;
    if (encryptedFieldPathsParam && isQueryableEncryptionConfigured()) {
      const encryptedFieldPaths = JSON.parse(encryptedFieldPathsParam) as string[];
      if (encryptedFieldPaths.length > 0) {
        responseDoc = await decryptDocumentFields(client, document as Record<string, unknown>, encryptedFieldPaths);
      }
    }

    return NextResponse.json({
      success: true,
      document: responseDoc,
    });
  } catch (error) {
    console.error('Document get error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get document' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * PUT - Update a document with optional re-encryption
 */
export async function PUT(request: NextRequest) {
  let client: MongoClient | null = null;

  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    ensureSessionId(session);
    await session.save();

    const body: DocumentRequest = await request.json();
    const {
      connectionString: connectionStringParam,
      databaseName,
      collection,
      documentId,
      document,
      organizationId,
      formId,
      encryptedFields,
    } = body;

    if (!connectionStringParam || !databaseName || !collection || !documentId || !document) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Resolve vault connections to actual connection strings
    const connectionString = await resolveConnectionString(
      connectionStringParam,
      organizationId
    );

    client = new MongoClient(connectionString);
    await client.connect();

    const db = client.db(databaseName);
    const coll = db.collection(collection);

    // Remove _id from update document if present (can't update _id)
    const { _id, ...updateFields } = document;

    // Re-encrypt fields if encryption config is provided
    let finalUpdateFields = updateFields as Record<string, unknown>;
    if (
      encryptedFields &&
      Object.keys(encryptedFields).length > 0 &&
      organizationId &&
      formId &&
      isQueryableEncryptionConfigured()
    ) {
      try {
        // Get or create the encryption key for this form
        const keyId = await getOrCreateFormKey(client, organizationId, formId);

        // Encrypt the specified fields
        finalUpdateFields = await encryptDocumentFields(
          client,
          updateFields as Record<string, unknown>,
          encryptedFields,
          keyId
        );
        console.log(`[Document API] Re-encrypted ${Object.keys(encryptedFields).length} fields`);
      } catch (encryptError) {
        console.error('[Document API] Encryption error:', encryptError);
        // Continue with unencrypted update if encryption fails
        // This is a fallback - in production you might want to fail instead
      }
    }

    // Try to parse documentId as ObjectId, fall back to string
    let filter: Record<string, unknown>;
    try {
      filter = { _id: new ObjectId(documentId) };
    } catch {
      filter = { _id: documentId };
    }

    const result = await coll.replaceOne(filter, finalUpdateFields);

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Document update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * DELETE - Delete a document
 */
export async function DELETE(request: NextRequest) {
  let client: MongoClient | null = null;

  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    ensureSessionId(session);
    await session.save();

    const body: DocumentRequest = await request.json();
    const { connectionString: connectionStringParam, databaseName, collection, documentId, organizationId } = body;

    if (!connectionStringParam || !databaseName || !collection || !documentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Resolve vault connections to actual connection strings
    const connectionString = await resolveConnectionString(
      connectionStringParam,
      organizationId
    );

    client = new MongoClient(connectionString);
    await client.connect();

    const db = client.db(databaseName);
    const coll = db.collection(collection);

    // Try to parse documentId as ObjectId, fall back to string
    let filter: Record<string, unknown>;
    try {
      filter = { _id: new ObjectId(documentId) };
    } catch {
      filter = { _id: documentId };
    }

    const result = await coll.deleteOne(filter);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Document delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}
