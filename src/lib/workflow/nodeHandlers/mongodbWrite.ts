/**
 * MongoDB Write Node Handler
 *
 * Performs write operations (insert, update, delete) on MongoDB collections.
 * Uses the connection vault for secure credential storage.
 *
 * Config:
 * - connectionId: Vault ID for the MongoDB connection
 * - collection: Target collection name
 * - operation: insertOne, insertMany, updateOne, updateMany, deleteOne, deleteMany, replaceOne
 * - document: Document to insert or update fields (supports template variables)
 * - filter: Query filter for update/delete operations
 * - options: MongoDB operation options (e.g., upsert: true)
 */

import { MongoClient, Document } from 'mongodb';
import { registerHandler } from './registry';
import {
  ExtendedNodeContext,
  NodeHandler,
  HandlerMetadata,
  successResult,
  failureResult,
  NodeErrorCodes,
} from './types';

const metadata: HandlerMetadata = {
  type: 'mongodb-write',
  name: 'MongoDB Write',
  description: 'Write data to MongoDB (insert, update, delete)',
  version: '1.0.0',
};

type WriteOperation =
  | 'insertOne'
  | 'insertMany'
  | 'updateOne'
  | 'updateMany'
  | 'deleteOne'
  | 'deleteMany'
  | 'replaceOne';

interface WriteConfig {
  connectionId: string;
  collection: string;
  operation: WriteOperation;
  document?: unknown;
  filter?: Document;
  options?: Document;
}

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Starting MongoDB write operation', {
    nodeId: context.nodeId,
  });

  const config = context.resolvedConfig as unknown as WriteConfig;

  // Validate required config
  if (!config.connectionId) {
    await context.log('error', 'Missing connectionId in config');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'connectionId is required',
      false
    );
  }

  if (!config.collection) {
    await context.log('error', 'Missing collection in config');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'collection is required',
      false
    );
  }

  if (!config.operation) {
    await context.log('error', 'Missing operation in config');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'operation is required',
      false
    );
  }

  const validOperations: WriteOperation[] = [
    'insertOne',
    'insertMany',
    'updateOne',
    'updateMany',
    'deleteOne',
    'deleteMany',
    'replaceOne',
  ];

  if (!validOperations.includes(config.operation)) {
    await context.log('error', `Invalid operation: ${config.operation}`);
    return failureResult(
      NodeErrorCodes.INVALID_OPERATION,
      `Invalid operation: ${config.operation}. Valid operations: ${validOperations.join(', ')}`,
      false
    );
  }

  // Get connection from vault
  const connection = await context.getConnection(config.connectionId);
  if (!connection) {
    await context.log('error', 'Failed to get connection from vault', {
      connectionId: config.connectionId,
    });
    return failureResult(
      NodeErrorCodes.MISSING_CONNECTION,
      `Connection not found or could not be decrypted: ${config.connectionId}`,
      false
    );
  }

  let client: MongoClient | null = null;

  try {
    await context.log('info', 'Connecting to MongoDB', {
      database: connection.database,
      collection: config.collection,
    });

    client = new MongoClient(connection.connectionString, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    await client.connect();

    const db = client.db(connection.database);
    const collection = db.collection(config.collection);

    let result: unknown;
    const options = config.options || {};

    await context.log('info', `Executing ${config.operation}`, {
      collection: config.collection,
      hasDocument: !!config.document,
      hasFilter: !!config.filter,
    });

    // Debug: Log the actual document being written
    console.log(`[mongodb-write] Database: ${connection.database}, Collection: ${config.collection}`);
    console.log(`[mongodb-write] Operation: ${config.operation}`);
    console.log(`[mongodb-write] Document:`, JSON.stringify(config.document, null, 2));

    switch (config.operation) {
      case 'insertOne': {
        const doc = prepareDocument(config.document);
        if (!doc || typeof doc !== 'object') {
          return failureResult(
            NodeErrorCodes.INVALID_CONFIG,
            'document is required for insertOne and must be an object',
            false
          );
        }
        const insertResult = await collection.insertOne(doc as Document, options);
        result = {
          acknowledged: insertResult.acknowledged,
          insertedId: insertResult.insertedId.toString(),
        };
        break;
      }

      case 'insertMany': {
        const docs = prepareDocuments(config.document);
        if (!docs || docs.length === 0) {
          return failureResult(
            NodeErrorCodes.INVALID_CONFIG,
            'document must be an array of documents for insertMany',
            false
          );
        }
        const insertManyResult = await collection.insertMany(docs, options);
        result = {
          acknowledged: insertManyResult.acknowledged,
          insertedCount: insertManyResult.insertedCount,
          insertedIds: Object.fromEntries(
            Object.entries(insertManyResult.insertedIds).map(([k, v]) => [k, v.toString()])
          ),
        };
        break;
      }

      case 'updateOne': {
        const filter = config.filter || {};
        const update = prepareUpdate(config.document);
        if (!update) {
          return failureResult(
            NodeErrorCodes.INVALID_CONFIG,
            'document is required for updateOne',
            false
          );
        }
        const updateResult = await collection.updateOne(filter, update, options);
        result = {
          acknowledged: updateResult.acknowledged,
          matchedCount: updateResult.matchedCount,
          modifiedCount: updateResult.modifiedCount,
          upsertedId: updateResult.upsertedId?.toString(),
        };
        break;
      }

      case 'updateMany': {
        const filter = config.filter || {};
        const update = prepareUpdate(config.document);
        if (!update) {
          return failureResult(
            NodeErrorCodes.INVALID_CONFIG,
            'document is required for updateMany',
            false
          );
        }
        const updateManyResult = await collection.updateMany(filter, update, options);
        result = {
          acknowledged: updateManyResult.acknowledged,
          matchedCount: updateManyResult.matchedCount,
          modifiedCount: updateManyResult.modifiedCount,
          upsertedId: updateManyResult.upsertedId?.toString(),
        };
        break;
      }

      case 'deleteOne': {
        const filter = config.filter || {};
        if (Object.keys(filter).length === 0) {
          await context.log('warn', 'deleteOne called with empty filter - will delete first document');
        }
        const deleteResult = await collection.deleteOne(filter, options);
        result = {
          acknowledged: deleteResult.acknowledged,
          deletedCount: deleteResult.deletedCount,
        };
        break;
      }

      case 'deleteMany': {
        const filter = config.filter || {};
        if (Object.keys(filter).length === 0) {
          await context.log('warn', 'deleteMany called with empty filter - will delete all documents');
        }
        const deleteManyResult = await collection.deleteMany(filter, options);
        result = {
          acknowledged: deleteManyResult.acknowledged,
          deletedCount: deleteManyResult.deletedCount,
        };
        break;
      }

      case 'replaceOne': {
        const filter = config.filter || {};
        const replacement = prepareDocument(config.document);
        if (!replacement || typeof replacement !== 'object') {
          return failureResult(
            NodeErrorCodes.INVALID_CONFIG,
            'document is required for replaceOne and must be an object',
            false
          );
        }
        const replaceResult = await collection.replaceOne(filter, replacement as Document, options);
        result = {
          acknowledged: replaceResult.acknowledged,
          matchedCount: replaceResult.matchedCount,
          modifiedCount: replaceResult.modifiedCount,
          upsertedId: replaceResult.upsertedId?.toString(),
        };
        break;
      }
    }

    await context.log('info', `${config.operation} completed successfully`, result as Record<string, unknown>);

    return successResult(
      {
        operation: config.operation,
        collection: config.collection,
        result,
      },
      {
        durationMs: Date.now() - startTime,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await context.log('error', `MongoDB ${config.operation} failed`, {
      error: errorMessage,
      collection: config.collection,
    });

    // Determine if error is retryable
    const retryable = isRetryableError(error);

    return failureResult(
      NodeErrorCodes.OPERATION_FAILED,
      `MongoDB ${config.operation} failed: ${errorMessage}`,
      retryable
    );
  } finally {
    if (client) {
      try {
        await client.close();
      } catch (e) {
        console.error('[mongodb-write] Error closing connection:', e);
      }
    }
  }
};

/**
 * Prepare a document for insertion
 * Adds metadata like createdAt if not present
 */
function prepareDocument(doc: unknown): Document | null {
  if (!doc || typeof doc !== 'object') {
    return null;
  }

  const document = { ...(doc as Record<string, unknown>) };

  // Add createdAt if not present
  if (!document.createdAt) {
    document.createdAt = new Date();
  }

  return document as Document;
}

/**
 * Prepare an array of documents for insertMany
 */
function prepareDocuments(docs: unknown): Document[] {
  if (!Array.isArray(docs)) {
    // If it's a single object, wrap it
    if (docs && typeof docs === 'object') {
      const prepared = prepareDocument(docs);
      return prepared ? [prepared] : [];
    }
    return [];
  }

  return docs
    .map(prepareDocument)
    .filter((d): d is Document => d !== null);
}

/**
 * Prepare an update document
 * Wraps in $set if not already an update operator
 */
function prepareUpdate(doc: unknown): Document | null {
  if (!doc || typeof doc !== 'object') {
    return null;
  }

  const update = doc as Record<string, unknown>;

  // Check if it already has update operators
  const hasOperators = Object.keys(update).some((key) => key.startsWith('$'));
  if (hasOperators) {
    return update as Document;
  }

  // Wrap in $set and add updatedAt
  return {
    $set: {
      ...update,
      updatedAt: new Date(),
    },
  };
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  // Connection errors are typically retryable
  if (
    message.includes('timeout') ||
    message.includes('connect') ||
    message.includes('network') ||
    message.includes('econnrefused') ||
    message.includes('enotfound')
  ) {
    return true;
  }

  // Rate limiting
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return true;
  }

  // Transient errors
  if (message.includes('cursor not found') || message.includes('interrupted')) {
    return true;
  }

  return false;
}

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
