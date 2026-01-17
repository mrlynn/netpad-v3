/**
 * Platform User Service
 *
 * Extends the existing auth user with platform features:
 * - Organization memberships
 * - OAuth connections
 * - Platform roles
 */

import { ObjectId } from 'mongodb';
import { getUsersCollection, getPlatformAuditCollection } from './db';
import { generateSecureId } from '../encryption';
import {
  PlatformUser,
  OAuthConnection,
  OrgMembership,
  PlatformRole,
  AuditLogEntry,
} from '@/types/platform';
import { PasskeyCredential, TrustedDevice } from '@/types/auth';

// ============================================
// User CRUD
// ============================================

/**
 * Create a new platform user
 */
export async function createUser(
  email: string,
  options?: {
    displayName?: string;
    avatarUrl?: string;
    oauthConnection?: OAuthConnection;
  }
): Promise<PlatformUser> {
  const collection = await getUsersCollection();

  // Check if user already exists
  const existing = await collection.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new Error('User already exists');
  }

  const user: PlatformUser = {
    userId: generateSecureId('user'),
    email: email.toLowerCase(),
    emailVerified: !!options?.oauthConnection, // Verified if using OAuth
    displayName: options?.displayName,
    avatarUrl: options?.avatarUrl,
    organizations: [],
    oauthConnections: options?.oauthConnection ? [options.oauthConnection] : [],
    passkeys: [],
    trustedDevices: [],
    waitlistStatus: 'pending', // All new users start as pending until approved
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await collection.insertOne(user);

  await logUserEvent({
    eventType: 'user.created',
    userId: user.userId,
    userEmail: user.email,
    resourceType: 'user',
    resourceId: user.userId,
    action: 'create',
    details: {
      authMethod: options?.oauthConnection?.provider || 'email',
    },
    timestamp: new Date(),
  });

  return user;
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<PlatformUser | null> {
  const collection = await getUsersCollection();
  return collection.findOne({ email: email.toLowerCase() });
}

/**
 * Find user by ID
 */
export async function findUserById(userId: string): Promise<PlatformUser | null> {
  const collection = await getUsersCollection();
  return collection.findOne({ userId });
}

/**
 * Find user by MongoDB ObjectId
 */
export async function findUserByObjectId(id: string): Promise<PlatformUser | null> {
  const collection = await getUsersCollection();
  try {
    return collection.findOne({ _id: new ObjectId(id) });
  } catch {
    return null;
  }
}

/**
 * Find or create user (for OAuth flows)
 */
export async function findOrCreateUser(
  email: string,
  oauthConnection: OAuthConnection
): Promise<{ user: PlatformUser; isNew: boolean }> {
  const existing = await findUserByEmail(email);

  if (existing) {
    // Update OAuth connection if not already linked
    const hasConnection = existing.oauthConnections.some(
      (c) => c.provider === oauthConnection.provider && c.providerId === oauthConnection.providerId
    );

    if (!hasConnection) {
      await addOAuthConnection(existing.userId, oauthConnection);
      existing.oauthConnections.push(oauthConnection);
    }

    // Update last used
    await updateOAuthConnectionLastUsed(existing.userId, oauthConnection.provider);

    return { user: existing, isNew: false };
  }

  const newUser = await createUser(email, {
    displayName: oauthConnection.displayName,
    avatarUrl: oauthConnection.avatarUrl,
    oauthConnection,
  });

  return { user: newUser, isNew: true };
}

/**
 * Ensure a platform user exists for an auth user (used for passkey/magic link login)
 * Links the auth user's ObjectId to a platform user by storing it as authId
 */
export async function ensurePlatformUser(
  authId: string, // MongoDB ObjectId from auth DB
  email: string,
  options?: {
    displayName?: string;
    avatarUrl?: string;
  }
): Promise<PlatformUser> {
  console.log('[PlatformUser] ensurePlatformUser called:', { authId, email });
  const collection = await getUsersCollection();

  // First check if user exists by email
  const existingByEmail = await collection.findOne({ email: email.toLowerCase() });
  if (existingByEmail) {
    console.log('[PlatformUser] Found existing user by email:', { userId: existingByEmail.userId });
    // Link the auth ID if not already linked
    if (!existingByEmail.authId) {
      await collection.updateOne(
        { userId: existingByEmail.userId },
        { $set: { authId, updatedAt: new Date() } }
      );
      existingByEmail.authId = authId;
    }
    return existingByEmail;
  }

  // Check if user exists by auth ID
  const existingByAuthId = await collection.findOne({ authId });
  if (existingByAuthId) {
    console.log('[PlatformUser] Found existing user by authId:', { userId: existingByAuthId.userId });
    return existingByAuthId;
  }

  // Create new platform user
  console.log('[PlatformUser] Creating new platform user');
  const user: PlatformUser = {
    userId: generateSecureId('user'),
    authId, // Link to auth DB user
    email: email.toLowerCase(),
    emailVerified: true,
    displayName: options?.displayName,
    avatarUrl: options?.avatarUrl,
    organizations: [],
    oauthConnections: [],
    passkeys: [],
    trustedDevices: [],
    waitlistStatus: 'pending', // All new users start as pending until approved
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await collection.insertOne(user);
  console.log('[PlatformUser] Created new user:', { userId: user.userId, email: user.email });

  await logUserEvent({
    eventType: 'user.created',
    userId: user.userId,
    userEmail: user.email,
    resourceType: 'user',
    resourceId: user.userId,
    action: 'create',
    details: {
      authMethod: 'passkey-or-magic-link',
      authId,
    },
    timestamp: new Date(),
  });

  return user;
}

/**
 * Find platform user by auth ID (MongoDB ObjectId from auth DB)
 */
export async function findUserByAuthId(authId: string): Promise<PlatformUser | null> {
  const collection = await getUsersCollection();
  return collection.findOne({ authId });
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    displayName?: string;
    avatarUrl?: string;
  }
): Promise<boolean> {
  const collection = await getUsersCollection();

  const result = await collection.updateOne(
    { userId },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Update last login time
 */
export async function updateLastLogin(userId: string): Promise<void> {
  const collection = await getUsersCollection();

  await collection.updateOne(
    { userId },
    {
      $set: {
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  await logUserEvent({
    eventType: 'user.login',
    userId,
    resourceType: 'user',
    resourceId: userId,
    action: 'login',
    details: {},
    timestamp: new Date(),
  });
}

/**
 * Set user's platform role (admin only operation)
 */
export async function setPlatformRole(
  userId: string,
  role: PlatformRole | null,
  setBy: string
): Promise<boolean> {
  const collection = await getUsersCollection();

  let result;
  if (role) {
    result = await collection.updateOne(
      { userId },
      { $set: { platformRole: role, updatedAt: new Date() } }
    );
  } else {
    result = await collection.updateOne(
      { userId },
      {
        $unset: { platformRole: 1 as const },
        $set: { updatedAt: new Date() },
      }
    );
  }

  return result.modifiedCount > 0;
}

/**
 * Check if user is a platform admin
 */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const user = await findUserById(userId);
  return user?.platformRole === 'admin';
}

// ============================================
// OAuth Connections
// ============================================

/**
 * Add OAuth connection to user
 */
export async function addOAuthConnection(
  userId: string,
  connection: OAuthConnection
): Promise<void> {
  const collection = await getUsersCollection();

  await collection.updateOne(
    { userId },
    {
      $push: { oauthConnections: connection },
      $set: { updatedAt: new Date() },
    }
  );
}

/**
 * Remove OAuth connection from user
 */
export async function removeOAuthConnection(
  userId: string,
  provider: 'google' | 'github'
): Promise<boolean> {
  const collection = await getUsersCollection();

  // Ensure user has another auth method
  const user = await findUserById(userId);
  if (!user) return false;

  const otherOAuth = user.oauthConnections.filter((c) => c.provider !== provider);
  const hasPasskey = user.passkeys && user.passkeys.length > 0;
  const hasOtherAuth = otherOAuth.length > 0 || hasPasskey || user.emailVerified;

  if (!hasOtherAuth) {
    throw new Error('Cannot remove last authentication method');
  }

  const result = await collection.updateOne(
    { userId },
    {
      $pull: { oauthConnections: { provider } },
      $set: { updatedAt: new Date() },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Find user by OAuth provider ID
 */
export async function findUserByOAuthId(
  provider: 'google' | 'github',
  providerId: string
): Promise<PlatformUser | null> {
  const collection = await getUsersCollection();

  return collection.findOne({
    oauthConnections: {
      $elemMatch: { provider, providerId },
    },
  });
}

/**
 * Update OAuth connection last used timestamp
 */
async function updateOAuthConnectionLastUsed(
  userId: string,
  provider: 'google' | 'github'
): Promise<void> {
  const collection = await getUsersCollection();

  await collection.updateOne(
    { userId, 'oauthConnections.provider': provider },
    {
      $set: {
        'oauthConnections.$.lastUsedAt': new Date(),
        updatedAt: new Date(),
      },
    }
  );
}

// ============================================
// Passkey Operations (delegated from existing auth)
// ============================================

/**
 * Add passkey to user
 */
export async function addPasskey(userId: string, passkey: PasskeyCredential): Promise<void> {
  const collection = await getUsersCollection();

  await collection.updateOne(
    { userId },
    {
      $push: { passkeys: passkey as any },
      $set: { updatedAt: new Date() },
    }
  );
}

/**
 * Find user by passkey credential ID
 */
export async function findUserByPasskeyId(credentialId: string): Promise<PlatformUser | null> {
  const collection = await getUsersCollection();
  return collection.findOne({ 'passkeys.id': credentialId });
}

/**
 * Update passkey counter
 */
export async function updatePasskeyCounter(
  userId: string,
  credentialId: string,
  newCounter: number
): Promise<void> {
  const collection = await getUsersCollection();

  await collection.updateOne(
    { userId, 'passkeys.id': credentialId },
    {
      $set: {
        'passkeys.$.counter': newCounter,
        'passkeys.$.lastUsedAt': new Date(),
        updatedAt: new Date(),
      },
    }
  );
}

/**
 * Remove passkey from user
 */
export async function removePasskey(userId: string, credentialId: string): Promise<boolean> {
  const collection = await getUsersCollection();

  // Ensure user has another auth method
  const user = await findUserById(userId);
  if (!user) return false;

  const remainingPasskeys = (user.passkeys || []).filter((p) => p.id !== credentialId);
  const hasOAuth = user.oauthConnections.length > 0;
  const hasOtherAuth = remainingPasskeys.length > 0 || hasOAuth || user.emailVerified;

  if (!hasOtherAuth) {
    throw new Error('Cannot remove last authentication method');
  }

  const result = await collection.updateOne(
    { userId },
    {
      $pull: { passkeys: { id: credentialId } as any },
      $set: { updatedAt: new Date() },
    }
  );

  return result.modifiedCount > 0;
}

// ============================================
// Trusted Devices
// ============================================

/**
 * Add trusted device
 */
export async function addTrustedDevice(userId: string, device: TrustedDevice): Promise<void> {
  const collection = await getUsersCollection();

  // Limit to 5 devices
  const user = await findUserById(userId);
  if (user?.trustedDevices && user.trustedDevices.length >= 5) {
    // Remove oldest device
    const oldest = user.trustedDevices.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0];

    await collection.updateOne({ userId }, { $pull: { trustedDevices: { id: oldest.id } as any } });
  }

  await collection.updateOne(
    { userId },
    {
      $push: { trustedDevices: device as any },
      $set: { updatedAt: new Date() },
    }
  );
}

/**
 * Find trusted device
 */
export async function findTrustedDevice(
  userId: string,
  fingerprint: string
): Promise<TrustedDevice | null> {
  const user = await findUserById(userId);
  if (!user?.trustedDevices) return null;

  return (
    user.trustedDevices.find(
      (d) => d.fingerprint === fingerprint && new Date(d.expiresAt) > new Date()
    ) || null
  );
}

/**
 * Update trusted device last used
 */
export async function updateTrustedDeviceLastUsed(
  userId: string,
  deviceId: string
): Promise<void> {
  const collection = await getUsersCollection();

  await collection.updateOne(
    { userId, 'trustedDevices.id': deviceId },
    {
      $set: {
        'trustedDevices.$.lastUsedAt': new Date(),
        updatedAt: new Date(),
      },
    }
  );
}

/**
 * Remove trusted device
 */
export async function removeTrustedDevice(userId: string, deviceId: string): Promise<boolean> {
  const collection = await getUsersCollection();

  const result = await collection.updateOne(
    { userId },
    {
      $pull: { trustedDevices: { id: deviceId } as any },
      $set: { updatedAt: new Date() },
    }
  );

  return result.modifiedCount > 0;
}

// ============================================
// Email Verification
// ============================================

/**
 * Mark email as verified
 */
export async function verifyEmail(userId: string): Promise<void> {
  const collection = await getUsersCollection();

  await collection.updateOne(
    { userId },
    {
      $set: {
        emailVerified: true,
        updatedAt: new Date(),
      },
    }
  );
}

// ============================================
// Audit Logging
// ============================================

async function logUserEvent(event: Omit<AuditLogEntry, '_id'>): Promise<void> {
  try {
    const collection = await getPlatformAuditCollection();
    await collection.insertOne(event as AuditLogEntry);
  } catch (error) {
    console.error('[User Audit] Failed to log event:', error);
  }
}
