/**
 * MongoDB Database Connection
 *
 * Manages the database connection for the standalone application.
 * Uses connection pooling for optimal performance.
 */

import { MongoClient, Db, Collection, Document } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'netpad_app';

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set');
}

interface MongoConnection {
  client: MongoClient;
  db: Db;
}

let cachedConnection: MongoConnection | null = null;

/**
 * Get database connection (cached for performance)
 */
export async function getDatabase(): Promise<Db> {
  if (cachedConnection) {
    return cachedConnection.db;
  }

  const client = new MongoClient(MONGODB_URI!, {
    maxPoolSize: 10,
    minPoolSize: 1,
  });

  await client.connect();
  const db = client.db(MONGODB_DATABASE);

  cachedConnection = { client, db };
  return db;
}

/**
 * Get a specific collection
 */
export async function getCollection<T extends Document>(
  name: string
): Promise<Collection<T>> {
  const db = await getDatabase();
  return db.collection<T>(name);
}

/**
 * Collection names used by the application
 */
export const COLLECTIONS = {
  FORMS: 'forms',
  FORM_SUBMISSIONS: 'form_submissions',
  WORKFLOWS: 'workflows',
  WORKFLOW_EXECUTIONS: 'workflow_executions',
  APP_STATE: 'app_state',
} as const;

/**
 * Get forms collection
 */
export async function getFormsCollection() {
  return getCollection(COLLECTIONS.FORMS);
}

/**
 * Get form submissions collection
 */
export async function getSubmissionsCollection() {
  return getCollection(COLLECTIONS.FORM_SUBMISSIONS);
}

/**
 * Get workflows collection
 */
export async function getWorkflowsCollection() {
  return getCollection(COLLECTIONS.WORKFLOWS);
}

/**
 * Get app state collection (for tracking initialization)
 */
export async function getAppStateCollection() {
  return getCollection(COLLECTIONS.APP_STATE);
}

/**
 * Close database connection (for cleanup)
 */
export async function closeDatabase(): Promise<void> {
  if (cachedConnection) {
    await cachedConnection.client.close();
    cachedConnection = null;
  }
}
