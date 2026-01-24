/**
 * Platform Audit Logger
 *
 * Logs administrative and security-relevant actions across the platform
 */

import { AuditLogEntry, AuditEventType } from '@/types/platform';
import { getPlatformAuditCollection } from './db';

/**
 * Extended audit event types for admin actions
 */
export type PlatformAuditAction =
  | AuditEventType
  // Admin user actions
  | 'admin.user.view'
  | 'admin.user.impersonate'
  | 'admin.user.impersonate_end'
  | 'admin.user.update_role'
  | 'admin.user.delete'
  // Admin waitlist actions
  | 'admin.waitlist.view'
  | 'admin.waitlist.approve'
  | 'admin.waitlist.reject'
  // Admin cluster actions
  | 'admin.cluster.view'
  | 'admin.cluster.deactivate'
  | 'admin.cluster.delete'
  | 'admin.cluster.purge'
  // Admin extension actions
  | 'admin.extension.view'
  | 'admin.extension.enable'
  | 'admin.extension.disable'
  // Admin alert actions
  | 'admin.alert.create'
  | 'admin.alert.update'
  | 'admin.alert.delete'
  | 'admin.alert.acknowledge'
  | 'admin.alert.resolve'
  // Admin broadcast actions
  | 'admin.broadcast.create'
  | 'admin.broadcast.update'
  | 'admin.broadcast.delete'
  // Admin error actions
  | 'admin.error.acknowledge'
  | 'admin.error.resolve'
  | 'admin.error.ignore'
  // Security events
  | 'security.api_key.create'
  | 'security.api_key.revoke'
  | 'security.api_key.delete'
  | 'security.login.failed'
  | 'security.login.success'
  | 'security.password.reset'
  | 'security.passkey.register'
  | 'security.passkey.remove'
  // System actions
  | 'system.instance.restart'
  | 'system.health_check.trigger';

export interface AuditLogParams {
  eventType: PlatformAuditAction;
  actorUserId: string;
  actorEmail?: string;
  resourceType: 'user' | 'organization' | 'connection' | 'form' | 'submission' | 'cluster' | 'extension' | 'alert' | 'broadcast' | 'error' | 'api_key' | 'system';
  resourceId: string;
  organizationId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log a platform audit event
 */
export async function logPlatformAudit(params: AuditLogParams): Promise<void> {
  try {
    const collection = await getPlatformAuditCollection();

    const entry: AuditLogEntry = {
      eventType: params.eventType as AuditEventType,
      userId: params.actorUserId,
      userEmail: params.actorEmail,
      resourceType: params.resourceType as AuditLogEntry['resourceType'],
      resourceId: params.resourceId,
      organizationId: params.organizationId,
      action: params.eventType,
      details: params.details,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      timestamp: new Date(),
    };

    await collection.insertOne(entry);
  } catch (error) {
    // Log but don't throw - audit logging should not break main flow
    console.error('[Platform Audit Logger] Error logging audit event:', error);
  }
}

/**
 * Query audit logs with filters
 */
export interface AuditLogQuery {
  eventType?: PlatformAuditAction | PlatformAuditAction[];
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  organizationId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogResult {
  logs: AuditLogEntry[];
  total: number;
  hasMore: boolean;
}

/**
 * Get audit logs with filters and pagination
 */
export async function getAuditLogs(query: AuditLogQuery): Promise<AuditLogResult> {
  const collection = await getPlatformAuditCollection();

  const filter: Record<string, unknown> = {};

  // Event type filter
  if (query.eventType) {
    if (Array.isArray(query.eventType)) {
      filter.eventType = { $in: query.eventType };
    } else {
      filter.eventType = query.eventType;
    }
  }

  // User filter
  if (query.userId) {
    filter.userId = query.userId;
  }

  // Resource filters
  if (query.resourceType) {
    filter.resourceType = query.resourceType;
  }
  if (query.resourceId) {
    filter.resourceId = query.resourceId;
  }

  // Organization filter
  if (query.organizationId) {
    filter.organizationId = query.organizationId;
  }

  // Date range filter
  if (query.startDate || query.endDate) {
    filter.timestamp = {};
    if (query.startDate) {
      (filter.timestamp as Record<string, Date>).$gte = query.startDate;
    }
    if (query.endDate) {
      (filter.timestamp as Record<string, Date>).$lte = query.endDate;
    }
  }

  // Text search (on userEmail and details)
  if (query.search) {
    filter.$or = [
      { userEmail: { $regex: query.search, $options: 'i' } },
      { resourceId: { $regex: query.search, $options: 'i' } },
      { 'details.email': { $regex: query.search, $options: 'i' } },
      { 'details.name': { $regex: query.search, $options: 'i' } },
    ];
  }

  const limit = Math.min(query.limit || 50, 100);
  const offset = query.offset || 0;

  const [logs, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    collection.countDocuments(filter),
  ]);

  return {
    logs,
    total,
    hasMore: offset + logs.length < total,
  };
}

/**
 * Get audit log statistics
 */
export interface AuditLogStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByResourceType: Record<string, number>;
  recentActivity: Array<{ date: string; count: number }>;
  topActors: Array<{ userId: string; email?: string; count: number }>;
}

export async function getAuditLogStats(days: number = 30): Promise<AuditLogStats> {
  const collection = await getPlatformAuditCollection();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    totalEvents,
    eventsByType,
    eventsByResourceType,
    recentActivity,
    topActors,
  ] = await Promise.all([
    // Total events
    collection.countDocuments({ timestamp: { $gte: cutoff } }),

    // Events by type
    collection.aggregate([
      { $match: { timestamp: { $gte: cutoff } } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]).toArray(),

    // Events by resource type
    collection.aggregate([
      { $match: { timestamp: { $gte: cutoff } } },
      { $group: { _id: '$resourceType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray(),

    // Recent activity by day
    collection.aggregate([
      { $match: { timestamp: { $gte: cutoff } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray(),

    // Top actors
    collection.aggregate([
      { $match: { timestamp: { $gte: cutoff }, userId: { $exists: true } } },
      {
        $group: {
          _id: '$userId',
          email: { $first: '$userEmail' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]).toArray(),
  ]);

  return {
    totalEvents,
    eventsByType: eventsByType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>),
    eventsByResourceType: eventsByResourceType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>),
    recentActivity: recentActivity.map((item) => ({
      date: item._id,
      count: item.count,
    })),
    topActors: topActors.map((item) => ({
      userId: item._id,
      email: item.email,
      count: item.count,
    })),
  };
}

/**
 * Export audit logs to CSV format
 */
export async function exportAuditLogsToCSV(query: AuditLogQuery): Promise<string> {
  // Get all matching logs (up to 10,000)
  const result = await getAuditLogs({ ...query, limit: 10000, offset: 0 });

  const headers = [
    'Timestamp',
    'Event Type',
    'Actor User ID',
    'Actor Email',
    'Resource Type',
    'Resource ID',
    'Organization ID',
    'IP Address',
    'Details',
  ];

  const rows = result.logs.map((log) => [
    log.timestamp.toISOString(),
    log.eventType,
    log.userId || '',
    log.userEmail || '',
    log.resourceType,
    log.resourceId,
    log.organizationId || '',
    log.ipAddress || '',
    JSON.stringify(log.details),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Helper to extract request context from Next.js request
 */
export function extractRequestContext(request: Request): {
  ipAddress?: string;
  userAgent?: string;
} {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const userAgent = request.headers.get('user-agent');

  return {
    ipAddress: forwardedFor?.split(',')[0].trim() || realIp || undefined,
    userAgent: userAgent || undefined,
  };
}
