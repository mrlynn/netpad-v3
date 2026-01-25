/**
 * Broadcast Service
 *
 * Manages system-wide admin broadcasts and announcements
 */

import { ObjectId } from 'mongodb';
import {
  AdminBroadcast,
  BroadcastDismissal,
  BroadcastType,
  BroadcastPlacement,
  BroadcastAudience,
  BroadcastStatus,
  CustomBadge,
} from '@/types/observability';
import { getAdminBroadcastsCollection, getBroadcastDismissalsCollection } from './db';

/**
 * Generate a unique broadcast ID
 */
function generateBroadcastId(): string {
  return `broadcast_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Create a new broadcast
 */
export interface CreateBroadcastInput {
  title: string;
  message: string;
  type: BroadcastType;
  customBadge?: CustomBadge;
  audience: BroadcastAudience;
  targetOrganizations?: string[];
  targetUsers?: string[];
  placement: BroadcastPlacement;
  dismissible: boolean;
  priority?: number;
  linkUrl?: string;
  linkText?: string;
  startsAt: Date;
  expiresAt?: Date;
  createdBy: string;
}

export async function createBroadcast(input: CreateBroadcastInput): Promise<AdminBroadcast> {
  const collection = await getAdminBroadcastsCollection();
  const now = new Date();

  // Determine status based on dates
  let status: BroadcastStatus = 'draft';
  if (input.startsAt <= now) {
    status = 'active';
  } else {
    status = 'scheduled';
  }

  const broadcast: AdminBroadcast = {
    broadcastId: generateBroadcastId(),
    title: input.title,
    message: input.message,
    type: input.type,
    customBadge: input.customBadge,
    linkUrl: input.linkUrl,
    linkText: input.linkText,
    audience: input.audience,
    targetOrganizations: input.targetOrganizations,
    targetUsers: input.targetUsers,
    placement: input.placement,
    dismissible: input.dismissible,
    priority: input.priority ?? 0,
    status,
    startsAt: input.startsAt,
    expiresAt: input.expiresAt,
    viewCount: 0,
    dismissCount: 0,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  await collection.insertOne(broadcast);
  return broadcast;
}

/**
 * Update a broadcast
 */
export async function updateBroadcast(
  broadcastId: string,
  updates: Partial<Omit<AdminBroadcast, '_id' | 'broadcastId' | 'createdBy' | 'createdAt'>>
): Promise<boolean> {
  const collection = await getAdminBroadcastsCollection();
  const result = await collection.updateOne(
    { broadcastId },
    { $set: { ...updates, updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

/**
 * Delete a broadcast
 */
export async function deleteBroadcast(broadcastId: string): Promise<boolean> {
  const collection = await getAdminBroadcastsCollection();
  const result = await collection.deleteOne({ broadcastId });
  return result.deletedCount > 0;
}

/**
 * Get all broadcasts (for admin)
 */
export async function getAllBroadcasts(): Promise<AdminBroadcast[]> {
  const collection = await getAdminBroadcastsCollection();
  return collection.find({}).sort({ createdAt: -1 }).toArray();
}

/**
 * Get a single broadcast
 */
export async function getBroadcast(broadcastId: string): Promise<AdminBroadcast | null> {
  const collection = await getAdminBroadcastsCollection();
  return collection.findOne({ broadcastId });
}

/**
 * Get active broadcasts for a user
 */
export async function getActiveBroadcasts(
  userId: string,
  organizationId?: string,
  isAdmin: boolean = false
): Promise<AdminBroadcast[]> {
  const collection = await getAdminBroadcastsCollection();
  const dismissalsCollection = await getBroadcastDismissalsCollection();
  const now = new Date();

  // Get dismissed broadcast IDs for this user
  const dismissals = await dismissalsCollection
    .find({ userId })
    .toArray();
  const dismissedIds = new Set(dismissals.map((d) => d.broadcastId));

  // Build audience filter
  const audienceFilter: Record<string, unknown>[] = [
    { audience: 'all' },
  ];

  if (isAdmin) {
    audienceFilter.push({ audience: 'admins' });
  }

  if (organizationId) {
    audienceFilter.push({
      audience: 'specific_orgs',
      targetOrganizations: organizationId,
    });
  }

  // Query active broadcasts
  const broadcasts = await collection
    .find({
      $and: [
        { $or: audienceFilter },
        { startsAt: { $lte: now } },
        {
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: now } },
          ],
        },
      ],
    })
    .sort({ priority: -1, createdAt: -1 })
    .toArray();

  // Filter out dismissed broadcasts (if dismissible)
  return broadcasts.filter(
    (b) => !b.dismissible || !dismissedIds.has(b.broadcastId)
  );
}

/**
 * Dismiss a broadcast for a user
 */
export async function dismissBroadcast(
  broadcastId: string,
  userId: string
): Promise<boolean> {
  const dismissalsCollection = await getBroadcastDismissalsCollection();
  const broadcastsCollection = await getAdminBroadcastsCollection();

  // Check if broadcast exists and is dismissible
  const broadcast = await broadcastsCollection.findOne({ broadcastId });
  if (!broadcast || !broadcast.dismissible) {
    return false;
  }

  // Record dismissal
  await dismissalsCollection.updateOne(
    { broadcastId, userId },
    {
      $set: {
        broadcastId,
        userId,
        dismissedAt: new Date(),
      },
    },
    { upsert: true }
  );

  return true;
}

/**
 * Get broadcast statistics
 */
export async function getBroadcastStats(): Promise<{
  total: number;
  active: number;
  scheduled: number;
  expired: number;
  byType: Record<BroadcastType, number>;
}> {
  const collection = await getAdminBroadcastsCollection();
  const now = new Date();

  const [all, typeStats] = await Promise.all([
    collection.find({}).toArray(),
    collection
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  let active = 0;
  let scheduled = 0;
  let expired = 0;

  for (const broadcast of all) {
    if (broadcast.startsAt > now) {
      scheduled++;
    } else if (broadcast.expiresAt && broadcast.expiresAt <= now) {
      expired++;
    } else {
      active++;
    }
  }

  const byType: Record<BroadcastType, number> = { info: 0, warning: 0, alert: 0, maintenance: 0, success: 0, custom: 0 };
  for (const item of typeStats) {
    if (item._id && item._id in byType) {
      byType[item._id as BroadcastType] = item.count;
    }
  }

  return {
    total: all.length,
    active,
    scheduled,
    expired,
    byType,
  };
}
