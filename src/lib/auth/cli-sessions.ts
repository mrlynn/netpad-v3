/**
 * CLI Session Storage
 * 
 * Stores temporary CLI authentication sessions in MongoDB
 */

import { getAuthDb } from './db';
import { Db, Collection } from 'mongodb';

interface CLISession {
  cliToken: string;
  userId?: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
}

interface CLISessionToken {
  sessionToken: string;
  userId: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
}

let sessionsCollection: Collection<CLISession> | null = null;

async function getSessionsCollection(): Promise<Collection<CLISession>> {
  if (!sessionsCollection) {
    const db = await getAuthDb();
    sessionsCollection = db.collection<CLISession>('cli_sessions');
    
    // Create indexes
    await sessionsCollection.createIndex({ cliToken: 1 }, { unique: true });
    await sessionsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  }
  return sessionsCollection;
}

/**
 * Create a CLI session entry
 */
export async function createCLISession(
  cliToken: string,
  email: string,
  expiresInMinutes: number = 5
): Promise<void> {
  const collection = await getSessionsCollection();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

  await collection.insertOne({
    cliToken,
    email: email.toLowerCase(),
    createdAt: now,
    expiresAt,
  });
}

/**
 * Get CLI session by token
 */
export async function getCLISession(cliToken: string): Promise<CLISession | null> {
  const collection = await getSessionsCollection();
  console.log('[CLI Sessions] Looking up cliToken:', cliToken.substring(0, 8) + '...');
  
  const session = await collection.findOne({ cliToken });

  if (!session) {
    console.log('[CLI Sessions] Session not found');
    // Debug: list all sessions
    const allSessions = await collection.find({}).toArray();
    console.log('[CLI Sessions] All sessions in DB:', allSessions.map(s => ({
      cliToken: s.cliToken?.substring(0, 8) + '...',
      hasUserId: !!s.userId,
      email: s.email,
    })));
    return null;
  }

  console.log('[CLI Sessions] Found session:', {
    hasUserId: !!session.userId,
    userId: session.userId,
    email: session.email,
    expiresAt: session.expiresAt,
    isExpired: new Date() > session.expiresAt,
  });

  // Check expiration
  if (new Date() > session.expiresAt) {
    console.log('[CLI Sessions] Session expired, deleting');
    await collection.deleteOne({ cliToken });
    return null;
  }

  return session;
}

/**
 * Update CLI session with userId
 */
export async function updateCLISession(
  cliToken: string,
  userId: string
): Promise<boolean> {
  const collection = await getSessionsCollection();
  
  // Check if session exists first
  const existing = await collection.findOne({ cliToken });
  if (!existing) {
    console.log('[CLI Sessions] Session not found for cliToken:', cliToken.substring(0, 8) + '...');
    return false;
  }
  
  console.log('[CLI Sessions] Updating session:', {
    cliToken: cliToken.substring(0, 8) + '...',
    existingUserId: existing.userId,
    newUserId: userId,
  });
  
  const result = await collection.updateOne(
    { cliToken },
    { $set: { userId } }
  );

  console.log('[CLI Sessions] Update result:', {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  });

  return result.matchedCount > 0; // Return true if document was found, even if not modified
}

/**
 * Delete CLI session
 */
export async function deleteCLISession(cliToken: string): Promise<void> {
  const collection = await getSessionsCollection();
  await collection.deleteOne({ cliToken });
}

/**
 * Store CLI session token (for long-term session management)
 */
export async function storeCLISessionToken(
  sessionToken: string,
  userId: string,
  email: string,
  expiresInDays: number = 7
): Promise<void> {
  const db = await getAuthDb();
  const collection = db.collection<CLISessionToken>('cli_session_tokens');
  
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);

  await collection.insertOne({
    sessionToken,
    userId,
    email: email.toLowerCase(),
    createdAt: now,
    expiresAt,
  });
  
  // Create indexes if needed
  await collection.createIndex({ sessionToken: 1 }, { unique: true });
  await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}

/**
 * Get CLI session token
 */
export async function getCLISessionToken(sessionToken: string): Promise<CLISessionToken | null> {
  const db = await getAuthDb();
  const collection = db.collection<CLISessionToken>('cli_session_tokens');
  const token = await collection.findOne({ sessionToken });

  if (!token) {
    return null;
  }

  // Check expiration
  if (new Date() > token.expiresAt) {
    await collection.deleteOne({ sessionToken });
    return null;
  }

  return token;
}
