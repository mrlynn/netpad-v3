/**
 * MongoDB-based Storage Service
 *
 * Replaces file-based storage with secure MongoDB persistence.
 * - Connections are encrypted using AES-256-GCM
 * - Forms and submissions stored in MongoDB
 * - Proper indexes for performance
 */

import { Collection, Db } from 'mongodb';
import { FormConfiguration, FormSubmission, FormVersion } from '@/types/form';
import { SavedConnection, SavedForm } from './session';
import { encrypt, decrypt, generateSecureId, verifyEncryptionConfig } from './encryption';
import { getPlatformDb } from './platform/db';

// Collection names
const COLLECTIONS = {
  CONNECTIONS: 'user_connections',
  FORMS: 'user_forms',
  FORM_VERSIONS: 'form_versions',
  FORM_SUBMISSIONS: 'form_submissions',
  PUBLISHED_FORMS: 'published_forms',
  GLOBAL_SUBMISSIONS: 'global_submissions',
} as const;

// ============================================
// Database Access
// ============================================

let db: Db | null = null;
let indexesCreated = false;

async function getDb(): Promise<Db> {
  if (!db) {
    db = await getPlatformDb();
    if (!indexesCreated) {
      await createStorageIndexes(db);
      indexesCreated = true;
    }
  }
  return db;
}

async function createStorageIndexes(db: Db): Promise<void> {
  try {
    // User connections - encrypted, indexed by owner
    const connections = db.collection(COLLECTIONS.CONNECTIONS);
    await connections.createIndex({ ownerId: 1 });
    await connections.createIndex({ ownerId: 1, 'connection.id': 1 }, { unique: true });

    // User forms - indexed by owner
    const forms = db.collection(COLLECTIONS.FORMS);
    await forms.createIndex({ ownerId: 1 });
    await forms.createIndex({ ownerId: 1, 'form.id': 1 }, { unique: true });

    // Form versions
    const versions = db.collection(COLLECTIONS.FORM_VERSIONS);
    await versions.createIndex({ ownerId: 1, formId: 1 });
    await versions.createIndex({ ownerId: 1, formId: 1, version: 1 });

    // Form submissions (session-specific)
    const submissions = db.collection(COLLECTIONS.FORM_SUBMISSIONS);
    await submissions.createIndex({ ownerId: 1, formId: 1 });
    await submissions.createIndex({ submittedAt: -1 });

    // Published forms - globally accessible
    const published = db.collection(COLLECTIONS.PUBLISHED_FORMS);
    await published.createIndex({ 'form.id': 1 }, { unique: true });
    await published.createIndex({ 'form.slug': 1 }, { unique: true, sparse: true });
    await published.createIndex({ 'form.isPublished': 1 });

    // Global submissions - for published forms
    const globalSubs = db.collection(COLLECTIONS.GLOBAL_SUBMISSIONS);
    await globalSubs.createIndex({ formId: 1 });
    await globalSubs.createIndex({ submittedAt: -1 });
    await globalSubs.createIndex({ formId: 1, submittedAt: -1 });

    console.log('[Storage] MongoDB indexes created successfully');
  } catch (error) {
    console.log('[Storage] Index creation completed (some may already exist)');
  }
}

// ============================================
// Encrypted Connection Storage
// ============================================

interface StoredConnection {
  ownerId: string;
  connection: {
    id: string;
    name: string;
    encryptedConnectionString: string; // Encrypted!
    defaultDatabase?: string;
    createdAt: number;
    lastUsed: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export async function getConnections(sessionId: string): Promise<SavedConnection[]> {
  const database = await getDb();
  const collection = database.collection<StoredConnection>(COLLECTIONS.CONNECTIONS);

  const docs = await collection.find({ ownerId: sessionId }).toArray();

  return docs.map(doc => {
    try {
      // Decrypt the connection string
      const connectionString = decrypt(doc.connection.encryptedConnectionString);
      return {
        id: doc.connection.id,
        name: doc.connection.name,
        connectionString,
        defaultDatabase: doc.connection.defaultDatabase,
        createdAt: doc.connection.createdAt,
        lastUsed: doc.connection.lastUsed,
      };
    } catch (error) {
      console.error(`[Storage] Failed to decrypt connection ${doc.connection.id}:`, error);
      // Return connection without the string if decryption fails
      return {
        id: doc.connection.id,
        name: doc.connection.name,
        connectionString: '', // Can't decrypt
        defaultDatabase: doc.connection.defaultDatabase,
        createdAt: doc.connection.createdAt,
        lastUsed: doc.connection.lastUsed,
      };
    }
  });
}

export async function saveConnections(sessionId: string, connections: SavedConnection[]): Promise<void> {
  const database = await getDb();
  const collection = database.collection<StoredConnection>(COLLECTIONS.CONNECTIONS);

  // Delete existing connections for this session
  await collection.deleteMany({ ownerId: sessionId });

  if (connections.length === 0) return;

  // Encrypt and insert new connections
  const docs: StoredConnection[] = connections.map(conn => ({
    ownerId: sessionId,
    connection: {
      id: conn.id,
      name: conn.name,
      encryptedConnectionString: encrypt(conn.connectionString),
      defaultDatabase: conn.defaultDatabase,
      createdAt: conn.createdAt,
      lastUsed: conn.lastUsed,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  await collection.insertMany(docs);
}

export async function addConnection(sessionId: string, connection: SavedConnection): Promise<void> {
  const database = await getDb();
  const collection = database.collection<StoredConnection>(COLLECTIONS.CONNECTIONS);

  const doc: StoredConnection = {
    ownerId: sessionId,
    connection: {
      id: connection.id,
      name: connection.name,
      encryptedConnectionString: encrypt(connection.connectionString),
      defaultDatabase: connection.defaultDatabase,
      createdAt: connection.createdAt,
      lastUsed: connection.lastUsed,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await collection.updateOne(
    { ownerId: sessionId, 'connection.id': connection.id },
    { $set: doc },
    { upsert: true }
  );
}

export async function deleteConnection(sessionId: string, connectionId: string): Promise<boolean> {
  const database = await getDb();
  const collection = database.collection<StoredConnection>(COLLECTIONS.CONNECTIONS);

  const result = await collection.deleteOne({
    ownerId: sessionId,
    'connection.id': connectionId,
  });

  return result.deletedCount > 0;
}

export async function updateConnectionLastUsed(sessionId: string, connectionId: string): Promise<void> {
  const database = await getDb();
  const collection = database.collection<StoredConnection>(COLLECTIONS.CONNECTIONS);

  await collection.updateOne(
    { ownerId: sessionId, 'connection.id': connectionId },
    { $set: { 'connection.lastUsed': Date.now(), updatedAt: new Date() } }
  );
}

// ============================================
// Form Storage
// ============================================

interface StoredForm {
  ownerId: string;
  form: SavedForm;
  createdAt: Date;
  updatedAt: Date;
}

export async function getForms(sessionId: string): Promise<SavedForm[]> {
  const database = await getDb();
  const collection = database.collection<StoredForm>(COLLECTIONS.FORMS);

  const docs = await collection.find({ ownerId: sessionId }).toArray();
  return docs.map(doc => doc.form);
}

export async function saveForms(sessionId: string, forms: SavedForm[]): Promise<void> {
  const database = await getDb();
  const collection = database.collection<StoredForm>(COLLECTIONS.FORMS);

  // Delete existing forms for this session
  await collection.deleteMany({ ownerId: sessionId });

  if (forms.length === 0) return;

  // Insert new forms
  const docs: StoredForm[] = forms.map(form => ({
    ownerId: sessionId,
    form,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  await collection.insertMany(docs);
}

export async function getFormById(sessionId: string, formId: string): Promise<SavedForm | null> {
  const database = await getDb();
  const collection = database.collection<StoredForm>(COLLECTIONS.FORMS);

  const doc = await collection.findOne({
    ownerId: sessionId,
    'form.id': formId,
  });

  return doc?.form || null;
}

export async function saveForm(sessionId: string, form: SavedForm): Promise<void> {
  const database = await getDb();
  const collection = database.collection<StoredForm>(COLLECTIONS.FORMS);

  await collection.updateOne(
    { ownerId: sessionId, 'form.id': form.id },
    {
      $set: {
        form,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        ownerId: sessionId,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
}

export async function deleteForm(sessionId: string, formId: string): Promise<boolean> {
  const database = await getDb();
  const collection = database.collection<StoredForm>(COLLECTIONS.FORMS);

  const result = await collection.deleteOne({
    ownerId: sessionId,
    'form.id': formId,
  });

  if (result.deletedCount === 0) return false;

  // Also delete associated versions
  const versionsCollection = database.collection(COLLECTIONS.FORM_VERSIONS);
  await versionsCollection.deleteMany({ ownerId: sessionId, formId });

  return true;
}

// ============================================
// Form Versions
// ============================================

interface StoredFormVersion {
  ownerId: string;
  formId: string;
  version: FormVersion;
  createdAt: Date;
}

export async function getFormVersions(sessionId: string): Promise<FormVersion[]> {
  const database = await getDb();
  const collection = database.collection<StoredFormVersion>(COLLECTIONS.FORM_VERSIONS);

  const docs = await collection.find({ ownerId: sessionId }).toArray();
  return docs.map(doc => doc.version);
}

export async function saveFormVersions(sessionId: string, versions: FormVersion[]): Promise<void> {
  const database = await getDb();
  const collection = database.collection<StoredFormVersion>(COLLECTIONS.FORM_VERSIONS);

  await collection.deleteMany({ ownerId: sessionId });

  if (versions.length === 0) return;

  const docs: StoredFormVersion[] = versions.map(version => ({
    ownerId: sessionId,
    formId: version.formId,
    version,
    createdAt: new Date(),
  }));

  await collection.insertMany(docs);
}

export async function getVersionsForForm(sessionId: string, formId: string): Promise<FormVersion[]> {
  const database = await getDb();
  const collection = database.collection<StoredFormVersion>(COLLECTIONS.FORM_VERSIONS);

  const docs = await collection
    .find({ ownerId: sessionId, formId })
    .sort({ 'version.version': -1 })
    .toArray();

  return docs.map(doc => doc.version);
}

export async function addFormVersion(sessionId: string, version: FormVersion): Promise<void> {
  const database = await getDb();
  const collection = database.collection<StoredFormVersion>(COLLECTIONS.FORM_VERSIONS);

  await collection.insertOne({
    ownerId: sessionId,
    formId: version.formId,
    version,
    createdAt: new Date(),
  });
}

export async function getVersionById(
  sessionId: string,
  formId: string,
  versionId: string
): Promise<FormVersion | null> {
  const database = await getDb();
  const collection = database.collection<StoredFormVersion>(COLLECTIONS.FORM_VERSIONS);

  const doc = await collection.findOne({
    ownerId: sessionId,
    formId,
    $or: [
      { 'version.id': versionId },
      { 'version.version': parseInt(versionId, 10) || -1 },
    ],
  });

  return doc?.version || null;
}

export async function deleteVersion(
  sessionId: string,
  formId: string,
  versionId: string
): Promise<boolean> {
  const database = await getDb();
  const collection = database.collection<StoredFormVersion>(COLLECTIONS.FORM_VERSIONS);

  const result = await collection.deleteOne({
    ownerId: sessionId,
    formId,
    $or: [
      { 'version.id': versionId },
      { 'version.version': parseInt(versionId, 10) || -1 },
    ],
  });

  return result.deletedCount > 0;
}

// ============================================
// Form Submissions (Session-specific)
// ============================================

interface StoredSubmission {
  ownerId: string;
  formId: string;
  submission: FormSubmission;
  submittedAt: Date;
}

export async function getFormSubmissions(sessionId: string): Promise<FormSubmission[]> {
  const database = await getDb();
  const collection = database.collection<StoredSubmission>(COLLECTIONS.FORM_SUBMISSIONS);

  const docs = await collection.find({ ownerId: sessionId }).toArray();
  return docs.map(doc => doc.submission);
}

export async function saveFormSubmissions(sessionId: string, submissions: FormSubmission[]): Promise<void> {
  const database = await getDb();
  const collection = database.collection<StoredSubmission>(COLLECTIONS.FORM_SUBMISSIONS);

  await collection.deleteMany({ ownerId: sessionId });

  if (submissions.length === 0) return;

  const docs: StoredSubmission[] = submissions.map(submission => ({
    ownerId: sessionId,
    formId: submission.formId,
    submission,
    submittedAt: new Date(submission.submittedAt),
  }));

  await collection.insertMany(docs);
}

export async function getSubmissionsForForm(sessionId: string, formId: string): Promise<FormSubmission[]> {
  const database = await getDb();
  const collection = database.collection<StoredSubmission>(COLLECTIONS.FORM_SUBMISSIONS);

  const docs = await collection
    .find({ ownerId: sessionId, formId })
    .sort({ submittedAt: -1 })
    .toArray();

  return docs.map(doc => doc.submission);
}

export async function addFormSubmission(sessionId: string, submission: FormSubmission): Promise<void> {
  const database = await getDb();
  const collection = database.collection<StoredSubmission>(COLLECTIONS.FORM_SUBMISSIONS);

  await collection.insertOne({
    ownerId: sessionId,
    formId: submission.formId,
    submission,
    submittedAt: new Date(submission.submittedAt),
  });
}

// ============================================
// Published Forms (Global)
// ============================================

interface StoredPublishedForm {
  form: SavedForm;
  publishedAt: Date;
  updatedAt: Date;
}

export async function getPublishedForms(): Promise<SavedForm[]> {
  const database = await getDb();
  const collection = database.collection<StoredPublishedForm>(COLLECTIONS.PUBLISHED_FORMS);

  const docs = await collection.find({}).toArray();
  return docs.map(doc => doc.form);
}

export async function savePublishedForms(forms: SavedForm[]): Promise<void> {
  const database = await getDb();
  const collection = database.collection<StoredPublishedForm>(COLLECTIONS.PUBLISHED_FORMS);

  await collection.deleteMany({});

  if (forms.length === 0) return;

  const docs: StoredPublishedForm[] = forms.map(form => ({
    form,
    publishedAt: new Date(),
    updatedAt: new Date(),
  }));

  await collection.insertMany(docs);
}

export async function getPublishedFormBySlug(slug: string): Promise<SavedForm | null> {
  const database = await getDb();
  const collection = database.collection<StoredPublishedForm>(COLLECTIONS.PUBLISHED_FORMS);

  const doc = await collection.findOne({ 'form.slug': slug });

  // Debug: Log what we're retrieving from the database
  console.log('[Storage] getPublishedFormBySlug retrieved theme:', {
    slug,
    found: !!doc,
    hasTheme: !!doc?.form?.theme,
    theme: doc?.form?.theme,
    pageBackgroundColor: doc?.form?.theme?.pageBackgroundColor,
    pageBackgroundGradient: doc?.form?.theme?.pageBackgroundGradient,
  });

  return doc?.form || null;
}

export async function getPublishedFormById(formId: string): Promise<SavedForm | null> {
  const database = await getDb();
  const collection = database.collection<StoredPublishedForm>(COLLECTIONS.PUBLISHED_FORMS);

  const doc = await collection.findOne({ 'form.id': formId });
  return doc?.form || null;
}

export async function publishForm(form: SavedForm): Promise<void> {
  // Debug: Log what we're publishing
  console.log('[Storage] publishForm called with theme:', {
    hasTheme: !!form.theme,
    theme: form.theme,
    pageBackgroundColor: form.theme?.pageBackgroundColor,
    pageBackgroundGradient: form.theme?.pageBackgroundGradient,
  });

  const database = await getDb();
  const collection = database.collection<StoredPublishedForm>(COLLECTIONS.PUBLISHED_FORMS);

  await collection.updateOne(
    { 'form.id': form.id },
    {
      $set: {
        form,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        publishedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

export async function unpublishForm(formId: string): Promise<boolean> {
  const database = await getDb();
  const collection = database.collection<StoredPublishedForm>(COLLECTIONS.PUBLISHED_FORMS);

  const result = await collection.deleteOne({ 'form.id': formId });
  return result.deletedCount > 0;
}

// ============================================
// Global Submissions (for published forms)
// ============================================

interface StoredGlobalSubmission {
  formId: string;
  submission: FormSubmission;
  submittedAt: Date;
}

export async function getGlobalSubmissions(): Promise<FormSubmission[]> {
  const database = await getDb();
  const collection = database.collection<StoredGlobalSubmission>(COLLECTIONS.GLOBAL_SUBMISSIONS);

  const docs = await collection.find({}).sort({ submittedAt: -1 }).toArray();
  return docs.map(doc => doc.submission);
}

export async function saveGlobalSubmissions(submissions: FormSubmission[]): Promise<void> {
  const database = await getDb();
  const collection = database.collection<StoredGlobalSubmission>(COLLECTIONS.GLOBAL_SUBMISSIONS);

  await collection.deleteMany({});

  if (submissions.length === 0) return;

  const docs: StoredGlobalSubmission[] = submissions.map(submission => ({
    formId: submission.formId,
    submission,
    submittedAt: new Date(submission.submittedAt),
  }));

  await collection.insertMany(docs);
}

export async function addGlobalSubmission(submission: FormSubmission): Promise<void> {
  const database = await getDb();
  const collection = database.collection<StoredGlobalSubmission>(COLLECTIONS.GLOBAL_SUBMISSIONS);

  await collection.insertOne({
    formId: submission.formId,
    submission,
    submittedAt: new Date(submission.submittedAt),
  });
}

export async function getGlobalSubmissionsForForm(formId: string): Promise<FormSubmission[]> {
  const database = await getDb();
  const collection = database.collection<StoredGlobalSubmission>(COLLECTIONS.GLOBAL_SUBMISSIONS);

  const docs = await collection
    .find({ formId })
    .sort({ submittedAt: -1 })
    .toArray();

  return docs.map(doc => doc.submission);
}

// ============================================
// Migration Helper
// ============================================

/**
 * Check if encryption is configured (required for connection storage)
 */
export function isEncryptionConfigured(): boolean {
  return verifyEncryptionConfig();
}

/**
 * Health check for storage service
 */
export async function checkStorageHealth(): Promise<{
  mongodb: boolean;
  encryption: boolean;
  error?: string;
}> {
  const encryption = isEncryptionConfigured();

  try {
    const database = await getDb();
    await database.command({ ping: 1 });
    return { mongodb: true, encryption };
  } catch (error) {
    return {
      mongodb: false,
      encryption,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
