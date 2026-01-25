/**
 * Consent Database Operations
 * Stores and retrieves cookie consent records
 */

import { Collection, ObjectId } from 'mongodb';
import { getPlatformDb } from '@/lib/platform/db';
import {
  ConsentRecord,
  ConsentPreferences,
  ConsentHistoryEntry,
  CONSENT_VERSION,
  CONSENT_EXPIRY_DAYS,
} from '@/types/consent';
import crypto from 'crypto';

// Get the consent collection
async function getConsentCollection(): Promise<Collection<ConsentRecord>> {
  const db = await getPlatformDb();
  return db.collection<ConsentRecord>('cookie_consent');
}

// Use global to survive HMR in development
declare global {
  // eslint-disable-next-line no-var
  var __consentIndexesCreated: boolean | undefined;
}

if (global.__consentIndexesCreated === undefined) {
  global.__consentIndexesCreated = false;
}

// Create indexes for consent collection
export async function createConsentIndexes(): Promise<void> {
  if (global.__consentIndexesCreated) {
    return;
  }

  try {
    const collection = await getConsentCollection();

    // Index for looking up by visitor ID (anonymous users)
    await collection.createIndex({ visitorId: 1 });

    // Index for looking up by user ID (logged-in users)
    await collection.createIndex({ userId: 1 }, { sparse: true });

    // TTL index for automatic cleanup of expired consents
    await collection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    );

    // Index for audit/compliance queries
    await collection.createIndex({ consentedAt: -1 });

    global.__consentIndexesCreated = true;
    console.log('[Consent DB] Indexes created');
  } catch (error) {
    global.__consentIndexesCreated = true;
    console.log('[Consent DB] Index creation completed (may already exist)');
  }
}

// Generate a privacy-preserving visitor ID
export function generateVisitorId(userAgent: string, ipAddress?: string): string {
  const data = `${userAgent}-${ipAddress || 'unknown'}-${Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

// Hash IP address for privacy
export function hashIpAddress(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
}

// Find consent by visitor ID
export async function findConsentByVisitorId(
  visitorId: string
): Promise<ConsentRecord | null> {
  const collection = await getConsentCollection();
  return collection.findOne({ visitorId });
}

// Find consent by user ID
export async function findConsentByUserId(
  userId: string
): Promise<ConsentRecord | null> {
  const collection = await getConsentCollection();
  return collection.findOne({ userId });
}

// Get or create consent record
export async function getOrCreateConsent(
  visitorId: string,
  options?: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    geoLocation?: { country?: string; region?: string };
    doNotTrack?: boolean;
  }
): Promise<ConsentRecord> {
  const collection = await getConsentCollection();

  // Try to find existing consent
  let consent = await collection.findOne({
    $or: [
      { visitorId },
      ...(options?.userId ? [{ userId: options.userId }] : []),
    ],
  });

  if (consent) {
    // Link visitor to user if logging in
    if (options?.userId && !consent.userId) {
      await collection.updateOne(
        { _id: consent._id },
        { $set: { userId: options.userId, updatedAt: new Date() } }
      );
      consent.userId = options.userId;
    }
    return consent;
  }

  // Create new consent record with default (no consent)
  const now = new Date();
  const newConsent: ConsentRecord = {
    visitorId,
    userId: options?.userId,
    preferences: {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
    },
    consentVersion: CONSENT_VERSION,
    ipAddress: options?.ipAddress ? hashIpAddress(options.ipAddress) : undefined,
    userAgent: options?.userAgent,
    geoLocation: options?.geoLocation,
    legalBasis: 'consent',
    doNotTrack: options?.doNotTrack || false,
    consentedAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    history: [],
  };

  const result = await collection.insertOne(newConsent as any);
  return { ...newConsent, _id: result.insertedId.toString() };
}

// Save consent preferences
export async function saveConsent(
  visitorId: string,
  preferences: Omit<ConsentPreferences, 'essential'>,
  options: {
    userId?: string;
    source: 'banner' | 'settings' | 'api';
    ipAddress?: string;
    userAgent?: string;
    geoLocation?: { country?: string; region?: string };
    doNotTrack?: boolean;
  }
): Promise<ConsentRecord> {
  const collection = await getConsentCollection();
  const now = new Date();

  const fullPreferences: ConsentPreferences = {
    essential: true,
    ...preferences,
  };

  // Create history entry
  const historyEntry: ConsentHistoryEntry = {
    preferences: fullPreferences,
    action: 'update',
    timestamp: now,
    source: options.source,
  };

  // Try to update existing record
  const existingConsent = await collection.findOne({
    $or: [
      { visitorId },
      ...(options.userId ? [{ userId: options.userId }] : []),
    ],
  });

  if (existingConsent) {
    // Determine action type
    const isInitial = existingConsent.history.length === 0;
    historyEntry.action = isInitial ? 'initial' : 'update';

    // Check if withdrawing all non-essential consent
    const isWithdrawal =
      !preferences.functional &&
      !preferences.analytics &&
      !preferences.marketing &&
      (existingConsent.preferences.functional ||
        existingConsent.preferences.analytics ||
        existingConsent.preferences.marketing);

    if (isWithdrawal) {
      historyEntry.action = 'withdraw';
    }

    await collection.updateOne(
      { _id: existingConsent._id },
      {
        $set: {
          preferences: fullPreferences,
          consentVersion: CONSENT_VERSION,
          userId: options.userId || existingConsent.userId,
          updatedAt: now,
          expiresAt: new Date(now.getTime() + CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        },
        $push: { history: historyEntry as any },
      }
    );

    return {
      ...existingConsent,
      preferences: fullPreferences,
      updatedAt: now,
    };
  }

  // Create new consent record
  historyEntry.action = 'initial';
  const newConsent: ConsentRecord = {
    visitorId,
    userId: options.userId,
    preferences: fullPreferences,
    consentVersion: CONSENT_VERSION,
    ipAddress: options.ipAddress ? hashIpAddress(options.ipAddress) : undefined,
    userAgent: options.userAgent,
    geoLocation: options.geoLocation,
    legalBasis: 'consent',
    doNotTrack: options.doNotTrack || false,
    consentedAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    history: [historyEntry],
  };

  const result = await collection.insertOne(newConsent as any);
  return { ...newConsent, _id: result.insertedId.toString() };
}

// Withdraw all non-essential consent
export async function withdrawConsent(
  visitorId: string,
  options: {
    userId?: string;
    source: 'banner' | 'settings' | 'api';
  }
): Promise<ConsentRecord | null> {
  return saveConsent(
    visitorId,
    {
      functional: false,
      analytics: false,
      marketing: false,
    },
    options
  );
}

// Check if consent needs renewal (policy version changed or expired)
export function needsConsentRenewal(consent: ConsentRecord): boolean {
  // Check if policy version changed
  if (consent.consentVersion !== CONSENT_VERSION) {
    return true;
  }

  // Check if consent is about to expire (within 30 days)
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  if (new Date(consent.expiresAt) < thirtyDaysFromNow) {
    return true;
  }

  return false;
}

// Get consent audit log for compliance
export async function getConsentAuditLog(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<ConsentRecord[]> {
  const collection = await getConsentCollection();

  return collection
    .find({ userId })
    .sort({ consentedAt: -1 })
    .skip(options?.offset || 0)
    .limit(options?.limit || 50)
    .toArray();
}

// Delete consent record (for GDPR right to erasure)
export async function deleteConsentRecord(
  userId: string
): Promise<boolean> {
  const collection = await getConsentCollection();
  const result = await collection.deleteMany({ userId });
  return result.deletedCount > 0;
}
