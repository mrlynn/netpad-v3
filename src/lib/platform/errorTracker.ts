/**
 * Error Tracker Service
 *
 * Tracks, groups, and manages platform errors with fingerprinting for deduplication
 */

import { createHash } from 'crypto';
import { ObjectId } from 'mongodb';
import {
  PlatformError,
  ErrorSource,
  ErrorSeverity,
  ErrorStatus,
} from '@/types/observability';
import { getPlatformErrorsCollection } from './db';

/**
 * Generate a fingerprint for error grouping
 * Uses message + first 3 stack frames for uniqueness
 */
function generateFingerprint(error: Error): string {
  const stackLines = error.stack?.split('\n').slice(1, 4).join('\n') || '';
  const content = `${error.message}:${stackLines}`;
  return createHash('sha256').update(content).digest('hex').substring(0, 32);
}

/**
 * Generate a unique error ID
 */
function generateErrorId(): string {
  return `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Track a new error or increment count for existing error
 */
export async function trackError(
  error: Error,
  context: {
    source: ErrorSource;
    endpoint?: string;
    requestId?: string;
    userId?: string;
    organizationId?: string;
    severity?: ErrorSeverity;
    metadata?: Record<string, unknown>;
  }
): Promise<string> {
  try {
    const collection = await getPlatformErrorsCollection();
    const fingerprint = generateFingerprint(error);
    const now = new Date();

    // Try to find existing error with same fingerprint
    const existing = await collection.findOne({ fingerprint });

    if (existing) {
      // Increment count and update lastSeenAt
      await collection.updateOne(
        { _id: existing._id },
        {
          $set: {
            lastSeenAt: now,
            // Update to critical if it keeps happening
            severity:
              existing.count >= 10 && existing.severity !== 'critical'
                ? 'critical'
                : existing.severity,
          },
          $inc: { count: 1 },
          $push: {
            recentOccurrences: {
              $each: [
                {
                  timestamp: now,
                  requestId: context.requestId,
                  userId: context.userId,
                  metadata: context.metadata,
                },
              ],
              $slice: -10, // Keep last 10 occurrences
            },
          },
        }
      );
      return existing.errorId;
    }

    // Create new error entry
    const errorId = generateErrorId();
    const platformError: PlatformError = {
      errorId,
      message: error.message,
      stack: error.stack,
      source: context.source,
      endpoint: context.endpoint,
      requestId: context.requestId,
      userId: context.userId,
      organizationId: context.organizationId,
      severity: context.severity || 'error',
      fingerprint,
      count: 1,
      firstSeenAt: now,
      lastSeenAt: now,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(platformError);
    return errorId;
  } catch (trackingError) {
    // Don't let tracking errors break the main application
    console.error('[ErrorTracker] Failed to track error:', trackingError);
    return '';
  }
}

/**
 * Get error by ID
 */
export async function getError(errorId: string): Promise<PlatformError | null> {
  const collection = await getPlatformErrorsCollection();
  return collection.findOne({ errorId });
}

/**
 * Get error by MongoDB ObjectId
 */
export async function getErrorById(id: string): Promise<PlatformError | null> {
  const collection = await getPlatformErrorsCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

/**
 * Query errors with filters
 */
export interface ErrorQuery {
  source?: ErrorSource | ErrorSource[];
  severity?: ErrorSeverity | ErrorSeverity[];
  status?: ErrorStatus | ErrorStatus[];
  startDate?: Date;
  endDate?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ErrorQueryResult {
  errors: PlatformError[];
  total: number;
  hasMore: boolean;
}

export async function getErrors(query: ErrorQuery = {}): Promise<ErrorQueryResult> {
  const collection = await getPlatformErrorsCollection();
  const { limit = 50, offset = 0 } = query;

  // Build MongoDB filter
  const filter: Record<string, unknown> = {};

  if (query.source) {
    filter.source = Array.isArray(query.source) ? { $in: query.source } : query.source;
  }

  if (query.severity) {
    filter.severity = Array.isArray(query.severity) ? { $in: query.severity } : query.severity;
  }

  if (query.status) {
    filter.status = Array.isArray(query.status) ? { $in: query.status } : query.status;
  }

  if (query.startDate || query.endDate) {
    filter.lastSeenAt = {};
    if (query.startDate) (filter.lastSeenAt as Record<string, Date>).$gte = query.startDate;
    if (query.endDate) (filter.lastSeenAt as Record<string, Date>).$lte = query.endDate;
  }

  if (query.search) {
    filter.$or = [
      { message: { $regex: query.search, $options: 'i' } },
      { errorId: { $regex: query.search, $options: 'i' } },
      { endpoint: { $regex: query.search, $options: 'i' } },
    ];
  }

  const [errors, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ lastSeenAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    collection.countDocuments(filter),
  ]);

  return {
    errors,
    total,
    hasMore: offset + errors.length < total,
  };
}

/**
 * Get error summary statistics
 */
export interface ErrorSummary {
  total: number;
  open: number;
  acknowledged: number;
  resolved: number;
  critical: number;
  bySource: Array<{ source: ErrorSource; count: number }>;
  bySeverity: Array<{ severity: ErrorSeverity; count: number }>;
  recentTrend: Array<{ date: string; count: number }>;
}

export async function getErrorSummary(days: number = 7): Promise<ErrorSummary> {
  const collection = await getPlatformErrorsCollection();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    statusCounts,
    severityCounts,
    sourceCounts,
    trendData,
  ] = await Promise.all([
    // Status counts
    collection
      .aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .toArray(),

    // Severity counts
    collection
      .aggregate([
        { $match: { status: { $ne: 'resolved' } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ])
      .toArray(),

    // Source counts
    collection
      .aggregate([
        { $match: { status: { $ne: 'resolved' } } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ])
      .toArray(),

    // Daily trend for last N days
    collection
      .aggregate([
        { $match: { lastSeenAt: { $gte: cutoff } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$lastSeenAt' },
            },
            count: { $sum: '$count' },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
  ]);

  const statusMap = statusCounts.reduce(
    (acc, item) => {
      acc[item._id as string] = item.count;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    total: (statusMap.open || 0) + (statusMap.acknowledged || 0) + (statusMap.resolved || 0),
    open: statusMap.open || 0,
    acknowledged: statusMap.acknowledged || 0,
    resolved: statusMap.resolved || 0,
    critical: severityCounts.find((s) => s._id === 'critical')?.count || 0,
    bySource: sourceCounts.map((s) => ({
      source: s._id as ErrorSource,
      count: s.count,
    })),
    bySeverity: severityCounts.map((s) => ({
      severity: s._id as ErrorSeverity,
      count: s.count,
    })),
    recentTrend: trendData.map((t) => ({
      date: t._id as string,
      count: t.count,
    })),
  };
}

/**
 * Update error status
 */
export async function updateErrorStatus(
  errorId: string,
  status: ErrorStatus,
  userId: string,
  resolution?: string
): Promise<boolean> {
  const collection = await getPlatformErrorsCollection();
  const now = new Date();

  const updateData: Record<string, unknown> = {
    status,
  };

  if (status === 'acknowledged') {
    updateData.acknowledgedBy = userId;
    updateData.acknowledgedAt = now;
  }

  if (status === 'resolved') {
    updateData.resolvedBy = userId;
    updateData.resolvedAt = now;
    if (resolution) {
      updateData.resolution = resolution;
    }
  }

  const result = await collection.updateOne(
    { errorId },
    { $set: updateData }
  );

  return result.modifiedCount > 0;
}

/**
 * Acknowledge an error
 */
export async function acknowledgeError(errorId: string, userId: string): Promise<boolean> {
  return updateErrorStatus(errorId, 'acknowledged', userId);
}

/**
 * Resolve an error
 */
export async function resolveError(
  errorId: string,
  userId: string,
  resolution?: string
): Promise<boolean> {
  return updateErrorStatus(errorId, 'resolved', userId, resolution);
}

/**
 * Reopen a resolved error
 */
export async function reopenError(errorId: string): Promise<boolean> {
  const collection = await getPlatformErrorsCollection();
  const result = await collection.updateOne(
    { errorId },
    {
      $set: { status: 'open' },
      $unset: {
        acknowledgedBy: '',
        acknowledgedAt: '',
        resolvedBy: '',
        resolvedAt: '',
        resolution: '',
      },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Delete old resolved errors (cleanup)
 */
export async function cleanupOldErrors(daysOld: number = 90): Promise<number> {
  const collection = await getPlatformErrorsCollection();
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

  const result = await collection.deleteMany({
    status: 'resolved',
    resolvedAt: { $lt: cutoff },
  });

  return result.deletedCount;
}

/**
 * Get errors grouped by fingerprint for dashboard
 */
export async function getGroupedErrors(
  limit: number = 20
): Promise<Array<PlatformError & { totalOccurrences: number }>> {
  const collection = await getPlatformErrorsCollection();

  const errors = await collection
    .find({ status: { $ne: 'resolved' } })
    .sort({ count: -1, lastSeenAt: -1 })
    .limit(limit)
    .toArray();

  return errors.map((error) => ({
    ...error,
    totalOccurrences: error.count,
  }));
}
