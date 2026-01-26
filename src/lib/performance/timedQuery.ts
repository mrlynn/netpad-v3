/**
 * Database Query Timer
 * Tracks individual MongoDB query performance
 */

import { timingContext } from './withTiming';
import { performanceLogger } from './PerformanceLogger';
import type { QueryOptions } from './types';
import { SLOW_QUERY_THRESHOLD_MS } from './types';

/**
 * Wrap a database query with timing instrumentation
 */
export async function timedQuery<T>(
  options: QueryOptions,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  const { operation, collection, allowSlow = false } = options;

  try {
    const result = await queryFn();
    const duration = performance.now() - start;
    const roundedDuration = Math.round(duration);

    // Add to request context if available
    const context = timingContext.getStore();
    if (context) {
      context.queries.push({
        operation,
        collection,
        duration: roundedDuration,
      });
    }

    // Log slow queries
    if (duration > SLOW_QUERY_THRESHOLD_MS && !allowSlow) {
      performanceLogger.logSlowQuery({
        operation,
        collection,
        duration: roundedDuration,
        filter: options.filter,
        timestamp: Date.now(),
      });
    }

    // Development logging
    if (process.env.NODE_ENV === 'development') {
      const status = duration > 100 ? '🔴' : duration > 50 ? '🟡' : '🟢';
      console.log(
        `${status} [DB] ${operation}${collection ? ` (${collection})` : ''}: ${roundedDuration}ms`
      );
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    performanceLogger.logQueryError({
      operation,
      collection,
      duration: Math.round(duration),
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    });

    throw error;
  }
}

/**
 * Create a timed wrapper for a MongoDB collection
 * Provides convenience methods that automatically track timing
 */
export function createTimedCollection<TDoc extends object = object>(
  db: { collection: (name: string) => MongoCollection<TDoc> },
  collectionName: string
) {
  const collection = db.collection(collectionName);

  return {
    find: (filter: object = {}, options?: object) =>
      timedQuery({ operation: 'find', collection: collectionName, filter }, () =>
        collection.find(filter, options).toArray()
      ),

    findOne: (filter: object, options?: object) =>
      timedQuery(
        { operation: 'findOne', collection: collectionName, filter },
        () => collection.findOne(filter, options)
      ),

    insertOne: (doc: TDoc) =>
      timedQuery({ operation: 'insertOne', collection: collectionName }, () =>
        collection.insertOne(doc)
      ),

    insertMany: (docs: TDoc[]) =>
      timedQuery({ operation: 'insertMany', collection: collectionName }, () =>
        collection.insertMany(docs)
      ),

    updateOne: (filter: object, update: object, options?: object) =>
      timedQuery(
        { operation: 'updateOne', collection: collectionName, filter },
        () => collection.updateOne(filter, update, options)
      ),

    updateMany: (filter: object, update: object, options?: object) =>
      timedQuery(
        { operation: 'updateMany', collection: collectionName, filter },
        () => collection.updateMany(filter, update, options)
      ),

    deleteOne: (filter: object) =>
      timedQuery(
        { operation: 'deleteOne', collection: collectionName, filter },
        () => collection.deleteOne(filter)
      ),

    deleteMany: (filter: object) =>
      timedQuery(
        { operation: 'deleteMany', collection: collectionName, filter },
        () => collection.deleteMany(filter)
      ),

    aggregate: (pipeline: object[]) =>
      timedQuery(
        { operation: 'aggregate', collection: collectionName, allowSlow: true },
        () => collection.aggregate(pipeline).toArray()
      ),

    countDocuments: (filter: object = {}) =>
      timedQuery(
        { operation: 'countDocuments', collection: collectionName, filter },
        () => collection.countDocuments(filter)
      ),

    // Pass through to original collection for operations not wrapped
    raw: collection,
  };
}

// Type definitions for MongoDB collection methods (minimal interface)
interface MongoCollection<TDoc> {
  find(filter: object, options?: object): { toArray(): Promise<TDoc[]> };
  findOne(filter: object, options?: object): Promise<TDoc | null>;
  insertOne(doc: TDoc): Promise<{ insertedId: unknown }>;
  insertMany(docs: TDoc[]): Promise<{ insertedIds: unknown[] }>;
  updateOne(
    filter: object,
    update: object,
    options?: object
  ): Promise<{ modifiedCount: number }>;
  updateMany(
    filter: object,
    update: object,
    options?: object
  ): Promise<{ modifiedCount: number }>;
  deleteOne(filter: object): Promise<{ deletedCount: number }>;
  deleteMany(filter: object): Promise<{ deletedCount: number }>;
  aggregate(pipeline: object[]): { toArray(): Promise<object[]> };
  countDocuments(filter: object): Promise<number>;
}
