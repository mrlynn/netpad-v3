import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { User, MagicLink, TrustedDevice, PasskeyCredential } from '@/types/auth';
import crypto from 'crypto';

// Use global to survive HMR in development
declare global {
  // eslint-disable-next-line no-var
  var __authDbState: {
    client: MongoClient | null;
    db: Db | null;
    indexesCreated: boolean;
  } | undefined;
}

if (!global.__authDbState) {
  global.__authDbState = {
    client: null,
    db: null,
    indexesCreated: false,
  };
}

const authState = global.__authDbState;

const AUTH_DB_URI = process.env.AUTH_MONGODB_URI || process.env.MONGODB_URI || '';
const AUTH_DB_NAME = process.env.AUTH_DB_NAME || 'mdb_tools_auth';

export async function getAuthDb(): Promise<Db> {
  if (authState.db) return authState.db;

  if (!AUTH_DB_URI) {
    console.error('[Auth DB] No MongoDB URI configured. Set AUTH_MONGODB_URI or MONGODB_URI in .env.local');
    throw new Error('AUTH_MONGODB_URI or MONGODB_URI environment variable is not set');
  }

  try {
    console.log('[Auth DB] Connecting to:', AUTH_DB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    authState.client = new MongoClient(AUTH_DB_URI);
    await authState.client.connect();
    authState.db = authState.client.db(AUTH_DB_NAME);
    console.log('[Auth DB] Connected to database:', AUTH_DB_NAME);

    // Create indexes only once
    if (!authState.indexesCreated) {
      await createIndexes(authState.db);
      authState.indexesCreated = true;
    }

    return authState.db;
  } catch (error) {
    console.error('[Auth DB] Connection failed:', error);
    throw error;
  }
}

async function createIndexes(db: Db): Promise<void> {
  try {
    // Users collection indexes
    const usersCollection = db.collection('users');
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ 'passkeys.id': 1 });
    await usersCollection.createIndex({ 'trustedDevices.fingerprint': 1 });

    // Magic links collection indexes
    const magicLinksCollection = db.collection('magic_links');
    await magicLinksCollection.createIndex({ token: 1 }, { unique: true });
    await magicLinksCollection.createIndex({ email: 1 });

    // Drop old TTL index if it exists and recreate with proper expiry
    try {
      await magicLinksCollection.dropIndex('expiresAt_1');
    } catch {
      // Index might not exist
    }
    // TTL index with 1 hour buffer - documents deleted 1 hour after expiry
    await magicLinksCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

    // WebAuthn challenges collection (temporary storage)
    const challengesCollection = db.collection('webauthn_challenges');
    await challengesCollection.createIndex({ challengeId: 1 }, { unique: true });
    try {
      await challengesCollection.dropIndex('expiresAt_1');
    } catch {
      // Index might not exist
    }
    await challengesCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 3600 });
  } catch (error) {
    // Indexes may already exist, that's fine
    console.log('[Auth DB] Index creation (may already exist)');
  }
}

// User operations
export async function findUserByEmail(email: string): Promise<User | null> {
  const db = await getAuthDb();
  const user = await db.collection('users').findOne({ email: email.toLowerCase() });
  return user as User | null;
}

export async function findUserById(userId: string): Promise<User | null> {
  const db = await getAuthDb();
  const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
  return user as User | null;
}

export async function createUser(email: string): Promise<User> {
  const db = await getAuthDb();
  const now = new Date();

  const newUser: Omit<User, '_id'> = {
    email: email.toLowerCase(),
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
    passkeys: [],
    trustedDevices: [],
  };

  const result = await db.collection('users').insertOne(newUser);

  return {
    ...newUser,
    _id: result.insertedId.toString(),
  } as User;
}

export async function updateUserLastLogin(userId: string): Promise<void> {
  const db = await getAuthDb();
  await db.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
  );
}

// Magic link operations
export async function createMagicLink(
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<MagicLink> {
  const db = await getAuthDb();

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

  console.log('[Magic Link] Creating link:', {
    email: email.toLowerCase(),
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    expiresInMs: expiresAt.getTime() - now.getTime(),
  });

  const magicLink: Omit<MagicLink, '_id'> = {
    email: email.toLowerCase(),
    token,
    expiresAt,
    used: false,
    createdAt: now,
    ipAddress,
    userAgent,
  };

  const result = await db.collection('magic_links').insertOne(magicLink);

  console.log('[Magic Link] Created with token prefix:', token.substring(0, 8) + '...');

  return {
    ...magicLink,
    _id: result.insertedId.toString(),
  } as MagicLink;
}

export async function findMagicLinkByToken(token: string): Promise<MagicLink | null> {
  const db = await getAuthDb();

  // First, find by token only to debug
  const anyLink = await db.collection('magic_links').findOne({ token });

  if (!anyLink) {
    console.log('[Magic Link] Token not found in database');
    return null;
  }

  console.log('[Magic Link] Found token:', {
    used: anyLink.used,
    expiresAt: anyLink.expiresAt,
    now: new Date(),
    isExpired: new Date(anyLink.expiresAt) <= new Date(),
  });

  // Check if already used
  if (anyLink.used) {
    console.log('[Magic Link] Token already used');
    return null;
  }

  // Check if expired
  if (new Date(anyLink.expiresAt) <= new Date()) {
    console.log('[Magic Link] Token expired');
    return null;
  }

  return anyLink as unknown as MagicLink;
}

export async function markMagicLinkUsed(token: string): Promise<void> {
  const db = await getAuthDb();
  await db.collection('magic_links').updateOne(
    { token },
    { $set: { used: true } }
  );
}

export async function countRecentMagicLinks(email: string, hours: number = 1): Promise<number> {
  const db = await getAuthDb();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  return db.collection('magic_links').countDocuments({
    email: email.toLowerCase(),
    createdAt: { $gte: since },
  });
}

// Passkey operations
export async function addPasskeyToUser(userId: string, passkey: PasskeyCredential): Promise<void> {
  const db = await getAuthDb();
  await db.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    {
      $push: { passkeys: passkey as any },
      $set: { updatedAt: new Date() },
    }
  );
}

export async function findUserByPasskeyId(credentialId: string): Promise<User | null> {
  const db = await getAuthDb();
  console.log('[Auth DB] Looking for passkey with ID:', credentialId);

  // First, let's see all users with passkeys for debugging
  const usersWithPasskeys = await db.collection('users').find({
    'passkeys.0': { $exists: true }
  }).toArray();

  console.log('[Auth DB] Users with passkeys:', usersWithPasskeys.length);
  usersWithPasskeys.forEach((u, i) => {
    console.log(`[Auth DB] User ${i + 1}:`, u.email, 'passkeys:', u.passkeys?.map((p: any) => p.id));
  });

  const user = await db.collection('users').findOne({
    'passkeys.id': credentialId,
  });

  console.log('[Auth DB] Found user:', user ? user.email : 'none');
  return user as User | null;
}

export async function updatePasskeyCounter(
  userId: string,
  credentialId: string,
  newCounter: number
): Promise<void> {
  const db = await getAuthDb();
  await db.collection('users').updateOne(
    { _id: new ObjectId(userId), 'passkeys.id': credentialId },
    {
      $set: {
        'passkeys.$.counter': newCounter,
        'passkeys.$.lastUsedAt': new Date(),
        updatedAt: new Date(),
      },
    }
  );
}

export async function removePasskey(userId: string, credentialId: string): Promise<void> {
  const db = await getAuthDb();
  await db.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    {
      $pull: { passkeys: { id: credentialId } as any },
      $set: { updatedAt: new Date() },
    }
  );
}

// Trusted device operations
export async function addTrustedDevice(userId: string, device: TrustedDevice): Promise<void> {
  const db = await getAuthDb();

  // First, check device count and remove oldest if needed
  const user = await findUserById(userId);
  if (user?.trustedDevices && user.trustedDevices.length >= 5) {
    // Remove oldest device
    const oldest = user.trustedDevices.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0];

    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $pull: { trustedDevices: { id: oldest.id } as any } }
    );
  }

  await db.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    {
      $push: { trustedDevices: device as any },
      $set: { updatedAt: new Date() },
    }
  );
}

export async function findTrustedDevice(
  userId: string,
  fingerprint: string
): Promise<TrustedDevice | null> {
  const user = await findUserById(userId);
  if (!user?.trustedDevices) return null;

  const device = user.trustedDevices.find(
    (d) => d.fingerprint === fingerprint && new Date(d.expiresAt) > new Date()
  );

  return device || null;
}

export async function updateTrustedDeviceLastUsed(
  userId: string,
  deviceId: string
): Promise<void> {
  const db = await getAuthDb();
  await db.collection('users').updateOne(
    { _id: new ObjectId(userId), 'trustedDevices.id': deviceId },
    {
      $set: {
        'trustedDevices.$.lastUsedAt': new Date(),
        updatedAt: new Date(),
      },
    }
  );
}

export async function removeTrustedDevice(userId: string, deviceId: string): Promise<void> {
  const db = await getAuthDb();
  await db.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    {
      $pull: { trustedDevices: { id: deviceId } as any },
      $set: { updatedAt: new Date() },
    }
  );
}

// WebAuthn challenge storage (temporary)
export async function storeChallenge(
  challengeId: string,
  challenge: string,
  userId?: string
): Promise<void> {
  const db = await getAuthDb();
  await db.collection('webauthn_challenges').insertOne({
    challengeId,
    challenge,
    userId,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
  });
}

export async function getAndDeleteChallenge(challengeId: string): Promise<string | null> {
  const db = await getAuthDb();
  const doc = await db.collection('webauthn_challenges').findOneAndDelete({
    challengeId,
    expiresAt: { $gt: new Date() },
  });
  return doc?.challenge || null;
}
