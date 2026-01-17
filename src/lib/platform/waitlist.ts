/**
 * Waitlist Service
 *
 * Manages waitlist signups, approvals, and rejections for the platform.
 */

import { getUsersCollection, getPlatformAuditCollection } from './db';
import { generateSecureId } from '../encryption';
import {
  PlatformUser,
  WaitlistStatus,
  WaitlistMetadata,
  AuditLogEntry,
} from '@/types/platform';

// ============================================
// Waitlist Signup
// ============================================

export interface WaitlistSignupData {
  email: string;
  displayName?: string;
  company?: string;
  useCase?: string;
  source?: string;
  referralCode?: string;
  // Extended fields
  howDidYouHear?: string;
  howDidYouHearOther?: string;
  role?: string;
  teamSize?: string;
  timeline?: string;
  interests?: string[];
  currentTools?: string;
  biggestChallenge?: string;
}

/**
 * Sign up for the waitlist
 * Creates a new user with waitlistStatus: 'pending'
 */
export async function signupForWaitlist(
  data: WaitlistSignupData
): Promise<{ user: PlatformUser; isNew: boolean }> {
  const collection = await getUsersCollection();
  const email = data.email.toLowerCase().trim();

  // Check if user already exists
  const existing = await collection.findOne({ email });
  if (existing) {
    // User already exists - return them as-is
    return { user: existing, isNew: false };
  }

  // Create new user with waitlist status
  const waitlistMetadata: WaitlistMetadata = {
    company: data.company,
    useCase: data.useCase,
    source: data.source,
    referralCode: data.referralCode,
    appliedAt: new Date(),
    // Extended fields
    howDidYouHear: data.howDidYouHear,
    howDidYouHearOther: data.howDidYouHearOther,
    role: data.role,
    teamSize: data.teamSize,
    timeline: data.timeline,
    interests: data.interests,
    currentTools: data.currentTools,
    biggestChallenge: data.biggestChallenge,
  };

  const user: PlatformUser = {
    userId: generateSecureId('user'),
    email,
    emailVerified: false,
    displayName: data.displayName,
    organizations: [],
    oauthConnections: [],
    passkeys: [],
    trustedDevices: [],
    waitlistStatus: 'pending',
    waitlistMetadata,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await collection.insertOne(user);

  await logWaitlistEvent({
    eventType: 'user.created',
    userId: user.userId,
    userEmail: user.email,
    resourceType: 'user',
    resourceId: user.userId,
    action: 'waitlist_signup',
    details: {
      source: data.source,
      referralCode: data.referralCode,
    },
    timestamp: new Date(),
  });

  return { user, isNew: true };
}

// ============================================
// Waitlist Management
// ============================================

/**
 * Approve a user from the waitlist
 */
export async function approveUser(
  userId: string,
  approvedBy: string
): Promise<{ success: boolean; user?: PlatformUser }> {
  const collection = await getUsersCollection();

  const user = await collection.findOne({ userId });
  if (!user) {
    return { success: false };
  }

  const result = await collection.updateOne(
    { userId },
    {
      $set: {
        waitlistStatus: 'approved' as WaitlistStatus,
        'waitlistMetadata.reviewedAt': new Date(),
        'waitlistMetadata.reviewedBy': approvedBy,
        updatedAt: new Date(),
      },
    }
  );

  if (result.modifiedCount === 0) {
    return { success: false };
  }

  await logWaitlistEvent({
    eventType: 'user.created', // Using existing event type
    userId: approvedBy,
    userEmail: user.email,
    resourceType: 'user',
    resourceId: userId,
    action: 'waitlist_approved',
    details: {
      approvedBy,
      previousStatus: user.waitlistStatus,
    },
    timestamp: new Date(),
  });

  const updatedUser = await collection.findOne({ userId });
  return { success: true, user: updatedUser || undefined };
}

/**
 * Reject a user from the waitlist
 */
export async function rejectUser(
  userId: string,
  rejectedBy: string,
  reason?: string
): Promise<{ success: boolean; user?: PlatformUser }> {
  const collection = await getUsersCollection();

  const user = await collection.findOne({ userId });
  if (!user) {
    return { success: false };
  }

  const result = await collection.updateOne(
    { userId },
    {
      $set: {
        waitlistStatus: 'rejected' as WaitlistStatus,
        'waitlistMetadata.reviewedAt': new Date(),
        'waitlistMetadata.reviewedBy': rejectedBy,
        'waitlistMetadata.rejectionReason': reason,
        updatedAt: new Date(),
      },
    }
  );

  if (result.modifiedCount === 0) {
    return { success: false };
  }

  await logWaitlistEvent({
    eventType: 'user.created',
    userId: rejectedBy,
    userEmail: user.email,
    resourceType: 'user',
    resourceId: userId,
    action: 'waitlist_rejected',
    details: {
      rejectedBy,
      reason,
      previousStatus: user.waitlistStatus,
    },
    timestamp: new Date(),
  });

  const updatedUser = await collection.findOne({ userId });
  return { success: true, user: updatedUser || undefined };
}

// ============================================
// Waitlist Queries
// ============================================

export interface WaitlistQueryOptions {
  status?: WaitlistStatus | 'all';
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: 'appliedAt' | 'email';
  sortOrder?: 'asc' | 'desc';
}

export interface WaitlistEntry {
  userId: string;
  email: string;
  displayName?: string;
  waitlistStatus?: WaitlistStatus;
  waitlistMetadata?: WaitlistMetadata;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get waitlist entries with filtering and pagination
 */
export async function getWaitlistEntries(
  options: WaitlistQueryOptions = {}
): Promise<{ entries: WaitlistEntry[]; total: number }> {
  const collection = await getUsersCollection();

  const {
    status = 'pending',
    limit = 50,
    offset = 0,
    search,
    sortBy = 'appliedAt',
    sortOrder = 'desc',
  } = options;

  // Build query
  const query: Record<string, any> = {};

  // Only include users with waitlistStatus set
  if (status === 'all') {
    query.waitlistStatus = { $exists: true };
  } else {
    query.waitlistStatus = status;
  }

  // Search by email or name
  if (search) {
    query.$or = [
      { email: { $regex: search, $options: 'i' } },
      { displayName: { $regex: search, $options: 'i' } },
      { 'waitlistMetadata.company': { $regex: search, $options: 'i' } },
    ];
  }

  // Build sort
  const sort: Record<string, 1 | -1> = {};
  if (sortBy === 'appliedAt') {
    sort['waitlistMetadata.appliedAt'] = sortOrder === 'asc' ? 1 : -1;
  } else {
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
  }

  // Execute query
  const [entries, total] = await Promise.all([
    collection
      .find(query, {
        projection: {
          userId: 1,
          email: 1,
          displayName: 1,
          waitlistStatus: 1,
          waitlistMetadata: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      })
      .sort(sort)
      .skip(offset)
      .limit(limit)
      .toArray(),
    collection.countDocuments(query),
  ]);

  return {
    entries: entries as unknown as WaitlistEntry[],
    total,
  };
}

/**
 * Get waitlist statistics
 */
export async function getWaitlistStats(): Promise<{
  pending: number;
  approved: number;
  rejected: number;
  todaySignups: number;
  thisWeekSignups: number;
}> {
  const collection = await getUsersCollection();

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const [pending, approved, rejected, todaySignups, thisWeekSignups] = await Promise.all([
    collection.countDocuments({ waitlistStatus: 'pending' }),
    collection.countDocuments({ waitlistStatus: 'approved' }),
    collection.countDocuments({ waitlistStatus: 'rejected' }),
    collection.countDocuments({
      waitlistStatus: { $exists: true },
      'waitlistMetadata.appliedAt': { $gte: startOfDay },
    }),
    collection.countDocuments({
      waitlistStatus: { $exists: true },
      'waitlistMetadata.appliedAt': { $gte: startOfWeek },
    }),
  ]);

  return {
    pending,
    approved,
    rejected,
    todaySignups,
    thisWeekSignups,
  };
}

/**
 * Check if a user is on the waitlist (pending status)
 */
export async function isUserOnWaitlist(email: string): Promise<boolean> {
  const collection = await getUsersCollection();
  const user = await collection.findOne({
    email: email.toLowerCase().trim(),
    waitlistStatus: 'pending',
  });
  return !!user;
}

/**
 * Get user's waitlist status
 */
export async function getUserWaitlistStatus(
  email: string
): Promise<WaitlistStatus | null> {
  const collection = await getUsersCollection();
  const user = await collection.findOne(
    { email: email.toLowerCase().trim() },
    { projection: { waitlistStatus: 1 } }
  );
  return user?.waitlistStatus || null;
}

// ============================================
// Audit Logging
// ============================================

async function logWaitlistEvent(event: Omit<AuditLogEntry, '_id'>): Promise<void> {
  try {
    const collection = await getPlatformAuditCollection();
    await collection.insertOne(event as AuditLogEntry);
  } catch (error) {
    console.error('[Waitlist Audit] Failed to log event:', error);
  }
}
