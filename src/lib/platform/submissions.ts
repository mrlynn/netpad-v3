/**
 * Hybrid Submission Service
 *
 * Implements the two-phase submission strategy:
 * 1. Save to platform database (immediate, reliable)
 * 2. Sync to target MongoDB (async, with retry)
 *
 * This ensures data is never lost even if the target database is down.
 */

import { MongoClient, ObjectId } from 'mongodb';
import { getOrgSubmissionsCollection, getOrgAuditCollection } from './db';
import { getDecryptedConnectionString, isCollectionAllowed } from './connectionVault';
import { incrementSubmissionCount, checkSubmissionLimit } from './organizations';
import { generateSecureId } from '../encryption';
import {
  createEncryptedClient,
  hasEncryptedFields,
  getEncryptedFieldPaths,
  encryptDocumentFields,
} from './encryptedClient';
import { isQueryableEncryptionConfigured, getOrCreateFormKey } from './encryptionKeys';
import {
  PlatformFormSubmission,
  SubmissionSyncStatus,
  FormSubmissionMetadata,
  FormSubmissionRespondent,
  AuditLogEntry,
  FormDataSource,
} from '@/types/platform';
import { FormConfiguration, FieldEncryptionConfig } from '@/types/form';

// ============================================
// Helper Functions
// ============================================

/**
 * Extract encrypted field configurations from form config
 */
function extractEncryptedFieldConfigs(
  formConfig: FormConfiguration
): Record<string, FieldEncryptionConfig> {
  const encryptedFields: Record<string, FieldEncryptionConfig> = {};

  function processField(field: any) {
    if (field.encryption?.enabled) {
      encryptedFields[field.path] = field.encryption;
    }
    // Process nested fields
    if (field.children) {
      field.children.forEach(processField);
    }
  }

  formConfig.fieldConfigs.forEach(processField);
  return encryptedFields;
}

// ============================================
// Submission Creation
// ============================================

export interface CreateSubmissionInput {
  formId: string;
  formVersion: number;
  organizationId: string;
  data: Record<string, unknown>;
  dataSource: FormDataSource;
  respondent?: FormSubmissionRespondent;
  metadata: FormSubmissionMetadata;
  formConfig?: FormConfiguration; // Optional form config for encryption support
  conversationalData?: PlatformFormSubmission['conversationalData']; // Conversational form data
}

export interface SubmissionResult {
  success: boolean;
  submissionId?: string;
  syncStatus?: SubmissionSyncStatus;
  error?: string;
}

/**
 * Create a new form submission
 * Phase 1: Save to platform database
 * Phase 2: Attempt immediate sync to target
 */
export async function createSubmission(input: CreateSubmissionInput): Promise<SubmissionResult> {
  const { organizationId, formId, dataSource } = input;

  // Check submission limits
  const limitCheck = await checkSubmissionLimit(organizationId);
  if (!limitCheck.allowed) {
    return {
      success: false,
      error: `Monthly submission limit reached (${limitCheck.current}/${limitCheck.limit})`,
    };
  }

  // Validate collection is allowed
  const collectionAllowed = await isCollectionAllowed(
    organizationId,
    dataSource.vaultId,
    dataSource.collection
  );
  if (!collectionAllowed) {
    return {
      success: false,
      error: `Collection '${dataSource.collection}' is not allowed for this connection`,
    };
  }

  // Create submission record
  const submissionId = generateSecureId('sub');
  const now = new Date();

  // Extract encryption configuration if form has encrypted fields
  let encryptionConfig: PlatformFormSubmission['encryptionConfig'] = undefined;

  // Debug logging for encryption
  const formHasEncryptedFields = input.formConfig ? hasEncryptedFields(input.formConfig) : false;
  const qeIsConfigured = isQueryableEncryptionConfigured();

  console.log('[Submission] Checking encryption config:', {
    hasFormConfig: !!input.formConfig,
    fieldConfigCount: input.formConfig?.fieldConfigs?.length || 0,
    hasEncryptedFields: formHasEncryptedFields,
    isQEConfigured: qeIsConfigured,
  });

  // Warn if form has encrypted fields but QE is not configured
  if (formHasEncryptedFields && !qeIsConfigured) {
    console.warn(
      '[Submission] ⚠️  WARNING: Form has encrypted fields but Queryable Encryption is NOT configured. ' +
        'Data will be stored UNENCRYPTED. To enable encryption, set QE_LOCAL_MASTER_KEY environment variable. ' +
        'Generate a key with: node -e "console.log(require(\'crypto\').randomBytes(96).toString(\'base64\'))"'
    );
  }

  if (input.formConfig && hasEncryptedFields(input.formConfig)) {
    encryptionConfig = {
      collectionEncryption: input.formConfig.collectionEncryption,
      encryptedFields: extractEncryptedFieldConfigs(input.formConfig),
    };
    console.log('[Submission] Encryption config extracted:', {
      encryptedFieldCount: Object.keys(encryptionConfig.encryptedFields || {}).length,
      encryptedFieldPaths: Object.keys(encryptionConfig.encryptedFields || {}),
    });
  }

  const submission: PlatformFormSubmission = {
    submissionId,
    formId: input.formId,
    formVersion: input.formVersion,
    organizationId,
    data: input.data,
    respondent: input.respondent,
    metadata: input.metadata,
    conversationalData: input.conversationalData, // Include conversational form data if provided
    syncStatus: 'pending',
    syncAttempts: 0,
    targetVaultId: dataSource.vaultId,
    targetCollection: dataSource.collection,
    encryptionConfig,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  // Phase 1: Save to platform database
  try {
    const collection = await getOrgSubmissionsCollection(organizationId);
    await collection.insertOne(submission);

    // Increment usage counter
    await incrementSubmissionCount(organizationId);

    // Log submission
    await logSubmissionEvent(organizationId, {
      eventType: 'form.submitted',
      userId: input.respondent?.userId,
      resourceType: 'submission',
      resourceId: submissionId,
      organizationId,
      action: 'submit',
      details: {
        formId,
        hasRespondent: !!input.respondent,
        deviceType: input.metadata.deviceType,
      },
      ipAddress: input.metadata.ipAddress,
      userAgent: input.metadata.userAgent,
      timestamp: now,
    });
  } catch (error) {
    console.error('[Submission] Failed to save submission:', error);
    return {
      success: false,
      error: 'Failed to save submission',
    };
  }

  // Phase 2: Attempt immediate sync
  const syncResult = await syncSubmission(organizationId, submissionId);

  return {
    success: true,
    submissionId,
    syncStatus: syncResult.status,
  };
}

// ============================================
// Sync to Target MongoDB
// ============================================

interface SyncResult {
  success: boolean;
  status: SubmissionSyncStatus;
  error?: string;
}

/**
 * Sync a submission to the target MongoDB
 * Uses encrypted client when submission has encryption config
 */
export async function syncSubmission(
  organizationId: string,
  submissionId: string
): Promise<SyncResult> {
  const collection = await getOrgSubmissionsCollection(organizationId);

  // Get submission
  const submission = await collection.findOne({ submissionId });
  if (!submission) {
    return { success: false, status: 'failed', error: 'Submission not found' };
  }

  // Already synced?
  if (submission.syncStatus === 'synced') {
    return { success: true, status: 'synced' };
  }

  // Get connection credentials
  // If no targetVaultId, use org's default database (provisioned cluster's vault)
  let effectiveVaultId = submission.targetVaultId;

  if (!effectiveVaultId) {
    // Use org's default database - get vault from provisioned cluster
    const { getProvisionedClusterForOrg } = await import('@/lib/atlas/provisioning');
    const cluster = await getProvisionedClusterForOrg(organizationId);
    if (cluster?.vaultId) {
      effectiveVaultId = cluster.vaultId;
    }
  }

  if (!effectiveVaultId) {
    await updateSyncStatus(collection, submissionId, {
      syncStatus: 'failed',
      syncError: 'No connection vault found for organization',
      syncAttempts: submission.syncAttempts + 1,
      lastSyncAttempt: new Date(),
    });

    return {
      success: false,
      status: 'failed',
      error: 'No provisioned cluster or connection vault found',
    };
  }

  const credentials = await getDecryptedConnectionString(
    organizationId,
    effectiveVaultId
  );

  if (!credentials) {
    console.error(`[Submission Sync] Failed to get credentials for vault ${effectiveVaultId}:`, {
      organizationId,
      effectiveVaultId,
      submissionId,
      targetCollection: submission.targetCollection,
    });
    
    await updateSyncStatus(collection, submissionId, {
      syncStatus: 'failed',
      syncError: 'Connection vault not found or could not decrypt',
      syncAttempts: submission.syncAttempts + 1,
      lastSyncAttempt: new Date(),
    });

    return {
      success: false,
      status: 'failed',
      error: 'Connection vault not found',
    };
  }
  
  console.log(`[Submission Sync] Got credentials for vault ${effectiveVaultId}:`, {
    database: credentials.database,
    hasConnectionString: !!credentials.connectionString,
    targetCollection: submission.targetCollection,
  });

  // Determine if we need encryption
  const hasEncryptedFieldsConfig =
    submission.encryptionConfig &&
    Object.keys(submission.encryptionConfig.encryptedFields || {}).length > 0;
  const qeConfigured = isQueryableEncryptionConfigured();
  const useEncryption = hasEncryptedFieldsConfig && qeConfigured;

  // Warn if form has encrypted fields but QE is not configured
  if (hasEncryptedFieldsConfig && !qeConfigured) {
    console.warn(
      `[Submission Sync] WARNING: Form has ${Object.keys(submission.encryptionConfig?.encryptedFields || {}).length} ` +
        `encrypted fields configured, but Queryable Encryption is NOT configured. ` +
        `Data will be stored UNENCRYPTED. Set QE_LOCAL_MASTER_KEY environment variable to enable encryption.`
    );
  }

  // Attempt to sync
  let client: MongoClient | null = null;

  try {
    // Always use a standard client - we'll do explicit encryption
    client = new MongoClient(credentials.connectionString, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    await client.connect();

    const targetDb = client.db(credentials.database);
    const targetCollection = targetDb.collection(submission.targetCollection);

    // Get list of encrypted field paths for metadata
    const encryptedFieldPaths = submission.encryptionConfig?.encryptedFields
      ? Object.keys(submission.encryptionConfig.encryptedFields)
      : [];

    // Prepare base document for insertion
    let documentData: Record<string, unknown> = { ...submission.data };

    // If encryption is enabled, explicitly encrypt the fields
    if (useEncryption && submission.encryptionConfig?.encryptedFields) {
      console.log(
        `[Submission Sync] Encrypting ${encryptedFieldPaths.length} fields for submission ${submissionId}`
      );

      // Get or create the form's encryption key
      const formKeyId = await getOrCreateFormKey(
        client,
        organizationId,
        submission.formId,
        submission.encryptionConfig.collectionEncryption
      );

      // Encrypt the fields explicitly
      documentData = await encryptDocumentFields(
        client,
        documentData,
        submission.encryptionConfig.encryptedFields,
        formKeyId
      );

      console.log(`[Submission Sync] Successfully encrypted fields: ${encryptedFieldPaths.join(', ')}`);
    }

    // Build final document with metadata
    const document = {
      ...documentData,
      _formMetadata: {
        submissionId: submission.submissionId,
        formId: submission.formId,
        formVersion: submission.formVersion,
        submittedAt: submission.submittedAt,
        respondent: submission.respondent
          ? {
              userId: submission.respondent.userId,
              email: submission.respondent.email,
              authMethod: submission.respondent.authMethod,
            }
          : undefined,
        // Include encryption metadata if encryption was used
        ...(useEncryption && {
          encryption: {
            enabled: true,
            fieldCount: encryptedFieldPaths.length,
            encryptedFields: encryptedFieldPaths,
          },
        }),
        // Include conversational form data (transcript, topics, etc.) if present
        ...(submission.conversationalData && {
          conversational: {
            conversationId: submission.conversationalData.conversationId,
            transcript: submission.conversationalData.transcript,
            topicsCovered: submission.conversationalData.topicsCovered,
            overallConfidence: submission.conversationalData.overallConfidence,
            turnCount: submission.conversationalData.turnCount,
            durationSeconds: submission.conversationalData.durationSeconds,
            startedAt: submission.conversationalData.startedAt,
            completedAt: submission.conversationalData.completedAt,
          },
        }),
      },
    };

    const insertResult = await targetCollection.insertOne(document);
    console.log(
      `[Submission Sync] Successfully inserted document with _id: ${insertResult.insertedId} ` +
        `for submission ${submissionId} into collection ${submission.targetCollection} in database ${credentials.database}`
    );

    // Update sync status
    await updateSyncStatus(collection, submissionId, {
      syncStatus: 'synced',
      syncedAt: new Date(),
      syncAttempts: submission.syncAttempts + 1,
      lastSyncAttempt: new Date(),
    });

    // Log successful sync
    await logSubmissionEvent(organizationId, {
      eventType: 'form.submission_synced',
      resourceType: 'submission',
      resourceId: submissionId,
      organizationId,
      action: 'sync',
      details: {
        targetCollection: submission.targetCollection,
        attempts: submission.syncAttempts + 1,
        encryptionUsed: useEncryption,
        encryptedFieldCount: encryptedFieldPaths.length,
      },
      timestamp: new Date(),
    });

    return { success: true, status: 'synced' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
    console.error(
      `[Submission Sync] ERROR syncing submission ${submissionId}:`,
      {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        submissionId,
        targetCollection: submission.targetCollection,
        targetVaultId: submission.targetVaultId,
        organizationId,
        hasCredentials: !!credentials,
        database: credentials?.database,
      }
    );

    await updateSyncStatus(collection, submissionId, {
      syncStatus: submission.syncAttempts >= 4 ? 'failed' : 'pending', // Fail after 5 attempts
      syncError: errorMessage,
      syncAttempts: submission.syncAttempts + 1,
      lastSyncAttempt: new Date(),
    });

    if (submission.syncAttempts >= 4) {
      await logSubmissionEvent(organizationId, {
        eventType: 'form.submission_failed',
        resourceType: 'submission',
        resourceId: submissionId,
        organizationId,
        action: 'sync_failed',
        details: {
          error: errorMessage,
          attempts: submission.syncAttempts + 1,
          encryptionUsed: useEncryption,
        },
        timestamp: new Date(),
      });
    }

    return {
      success: false,
      status: submission.syncAttempts >= 4 ? 'failed' : 'pending',
      error: errorMessage,
    };
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * Update sync status helper
 */
async function updateSyncStatus(
  collection: any,
  submissionId: string,
  updates: Partial<PlatformFormSubmission>
): Promise<void> {
  await collection.updateOne(
    { submissionId },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    }
  );
}

// ============================================
// Background Sync Worker
// ============================================

/**
 * Process pending submissions (called by background worker)
 */
export async function processPendingSubmissions(
  organizationId: string,
  limit: number = 100
): Promise<{ processed: number; synced: number; failed: number }> {
  const collection = await getOrgSubmissionsCollection(organizationId);

  // Find pending submissions with exponential backoff
  const now = new Date();
  const pendingSubmissions = await collection
    .find({
      syncStatus: 'pending',
      $or: [
        { lastSyncAttempt: { $exists: false } },
        {
          // Exponential backoff: 1min, 2min, 4min, 8min, 16min
          lastSyncAttempt: {
            $lt: new Date(now.getTime() - getBackoffMs(0)), // Will be refined per doc
          },
        },
      ],
    })
    .limit(limit)
    .toArray();

  let processed = 0;
  let synced = 0;
  let failed = 0;

  for (const submission of pendingSubmissions) {
    // Check backoff
    const backoffMs = getBackoffMs(submission.syncAttempts);
    if (
      submission.lastSyncAttempt &&
      now.getTime() - new Date(submission.lastSyncAttempt).getTime() < backoffMs
    ) {
      continue; // Not ready for retry yet
    }

    processed++;

    const result = await syncSubmission(organizationId, submission.submissionId);

    if (result.status === 'synced') {
      synced++;
    } else if (result.status === 'failed') {
      failed++;
    }
  }

  return { processed, synced, failed };
}

/**
 * Get backoff time in milliseconds
 */
function getBackoffMs(attempts: number): number {
  // 1 min, 2 min, 4 min, 8 min, 16 min
  const baseMs = 60 * 1000; // 1 minute
  return Math.min(baseMs * Math.pow(2, attempts), 16 * 60 * 1000);
}

// ============================================
// Submission Queries
// ============================================

/**
 * Get submission by ID
 */
export async function getSubmission(
  organizationId: string,
  submissionId: string
): Promise<PlatformFormSubmission | null> {
  const collection = await getOrgSubmissionsCollection(organizationId);
  return collection.findOne({ submissionId });
}

/**
 * List submissions for a form
 */
export async function listFormSubmissions(
  organizationId: string,
  formId: string,
  options?: {
    limit?: number;
    offset?: number;
    syncStatus?: SubmissionSyncStatus;
  }
): Promise<{ submissions: PlatformFormSubmission[]; total: number }> {
  const collection = await getOrgSubmissionsCollection(organizationId);

  const query: any = { formId };
  if (options?.syncStatus) {
    query.syncStatus = options.syncStatus;
  }

  const [submissions, total] = await Promise.all([
    collection
      .find(query)
      .sort({ submittedAt: -1 })
      .skip(options?.offset || 0)
      .limit(options?.limit || 50)
      .toArray(),
    collection.countDocuments(query),
  ]);

  return { submissions, total };
}

/**
 * Get submission statistics
 */
export async function getSubmissionStats(
  organizationId: string,
  formId?: string
): Promise<{
  total: number;
  pending: number;
  synced: number;
  failed: number;
}> {
  const collection = await getOrgSubmissionsCollection(organizationId);

  const query: any = formId ? { formId } : {};

  const [total, pending, synced, failed] = await Promise.all([
    collection.countDocuments(query),
    collection.countDocuments({ ...query, syncStatus: 'pending' }),
    collection.countDocuments({ ...query, syncStatus: 'synced' }),
    collection.countDocuments({ ...query, syncStatus: 'failed' }),
  ]);

  return { total, pending, synced, failed };
}

/**
 * Retry failed submissions
 */
export async function retryFailedSubmissions(
  organizationId: string,
  formId?: string
): Promise<number> {
  const collection = await getOrgSubmissionsCollection(organizationId);

  const query: any = { syncStatus: 'failed' };
  if (formId) {
    query.formId = formId;
  }

  const result = await collection.updateMany(query, {
    $set: {
      syncStatus: 'pending',
      syncAttempts: 0,
      syncError: undefined,
      updatedAt: new Date(),
    },
  });

  return result.modifiedCount;
}

// ============================================
// Audit Logging
// ============================================

async function logSubmissionEvent(
  organizationId: string,
  event: Omit<AuditLogEntry, '_id'>
): Promise<void> {
  try {
    const auditCollection = await getOrgAuditCollection(organizationId);
    await auditCollection.insertOne(event as AuditLogEntry);
  } catch (error) {
    console.error('[Submission Audit] Failed to log event:', error);
  }
}

// ============================================
// Partial/Draft Submissions
// ============================================

/**
 * Partial submission progress info
 */
export interface PartialSubmissionProgress {
  /** Completion percentage (0-100) */
  completionPercentage: number;
  /** Fields that have been filled */
  completedFields: string[];
  /** Required fields that are still empty */
  missingRequiredFields: string[];
  /** Current page for multi-page forms */
  currentPage: number;
  /** Total pages in the form */
  totalPages?: number;
  /** Field interaction data for analytics */
  fieldInteractions?: Record<string, {
    firstViewedAt?: number;
    totalFocusTime?: number;
    changeCount?: number;
  }>;
}

/**
 * Partial submission record (draft stored in DB)
 */
export interface PartialSubmission {
  submissionId: string;
  formId: string;
  organizationId: string;
  projectId?: string;

  /** The partial form data */
  data: Record<string, unknown>;

  /** Progress tracking */
  progress: PartialSubmissionProgress;

  /** Session/user identification */
  sessionId?: string;
  fingerprint?: string;
  respondent?: FormSubmissionRespondent;

  /** Timestamps */
  startedAt: Date;
  lastSavedAt: Date;
  expiresAt: Date;

  /** Status */
  status: 'partial' | 'abandoned' | 'converted';
  /** If converted, link to final submission */
  convertedSubmissionId?: string;
}

/**
 * Save a partial submission (auto-save draft to database)
 *
 * This persists form drafts to MongoDB for analytics and cross-device resume.
 */
export async function savePartialSubmission(
  organizationId: string,
  input: {
    formId: string;
    projectId?: string;
    data: Record<string, unknown>;
    progress: PartialSubmissionProgress;
    sessionId?: string;
    fingerprint?: string;
    respondent?: FormSubmissionRespondent;
    draftTTLDays?: number;
  }
): Promise<PartialSubmission> {
  const collection = await getOrgSubmissionsCollection(organizationId);
  const now = new Date();

  // Calculate expiry (default 7 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (input.draftTTLDays || 7));

  // Create identifier for upsert (sessionId or fingerprint + formId)
  const identifier = input.sessionId || input.fingerprint || generateSecureId('partial');
  const partialId = `partial_${input.formId}_${identifier}`;

  const partial: PartialSubmission = {
    submissionId: partialId,
    formId: input.formId,
    organizationId,
    projectId: input.projectId,
    data: input.data,
    progress: input.progress,
    sessionId: input.sessionId,
    fingerprint: input.fingerprint,
    respondent: input.respondent,
    startedAt: now,
    lastSavedAt: now,
    expiresAt,
    status: 'partial',
  };

  // Upsert based on partialId
  await collection.updateOne(
    { submissionId: partialId },
    {
      $set: {
        ...partial,
        lastSavedAt: now,
      },
      $setOnInsert: {
        startedAt: now,
      },
    },
    { upsert: true }
  );

  return partial;
}

/**
 * Get a partial submission by session/fingerprint
 */
export async function getPartialSubmission(
  organizationId: string,
  formId: string,
  sessionOrFingerprint: string
): Promise<PartialSubmission | null> {
  const collection = await getOrgSubmissionsCollection(organizationId);

  const partialId = `partial_${formId}_${sessionOrFingerprint}`;
  const doc = await collection.findOne({
    submissionId: partialId,
    status: 'partial',
  });

  if (!doc) return null;

  // Cast to partial submission to access its fields
  const partial = doc as unknown as PartialSubmission;

  // Check if expired
  if (partial.expiresAt && new Date(partial.expiresAt) < new Date()) {
    // Mark as abandoned instead of deleting
    await collection.updateOne(
      { submissionId: partialId },
      { $set: { status: 'abandoned' } }
    );
    return null;
  }

  return partial;
}

/**
 * Convert a partial submission to a full submission
 *
 * Called when user completes and submits the form.
 */
export async function convertPartialToSubmission(
  organizationId: string,
  partialId: string,
  fullSubmissionId: string
): Promise<void> {
  const collection = await getOrgSubmissionsCollection(organizationId);

  await collection.updateOne(
    { submissionId: partialId },
    {
      $set: {
        status: 'converted',
        convertedSubmissionId: fullSubmissionId,
        convertedAt: new Date(),
      },
    }
  );
}

/**
 * Mark old partial submissions as abandoned
 */
export async function markAbandonedPartialSubmissions(
  organizationId: string,
  hoursOld: number = 24
): Promise<number> {
  const collection = await getOrgSubmissionsCollection(organizationId);

  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hoursOld);

  const result = await collection.updateMany(
    {
      status: 'partial',
      lastSavedAt: { $lt: cutoffDate },
    },
    {
      $set: {
        status: 'abandoned',
        abandonedAt: new Date(),
      },
    }
  );

  return result.modifiedCount;
}

/**
 * Get partial submission analytics for a form
 */
export async function getPartialSubmissionAnalytics(
  organizationId: string,
  formId: string,
  days: number = 30
): Promise<{
  totalPartial: number;
  totalAbandoned: number;
  totalConverted: number;
  conversionRate: number;
  averageCompletionAtAbandonment: number;
  dropOffByField: Array<{ field: string; dropOffCount: number }>;
}> {
  const collection = await getOrgSubmissionsCollection(organizationId);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  // Get counts by status
  const statusCounts = await collection.aggregate([
    {
      $match: {
        formId,
        submissionId: { $regex: /^partial_/ },
        startedAt: { $gte: cutoffDate },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]).toArray();

  let totalPartial = 0;
  let totalAbandoned = 0;
  let totalConverted = 0;

  for (const item of statusCounts) {
    if (item._id === 'partial') totalPartial = item.count;
    else if (item._id === 'abandoned') totalAbandoned = item.count;
    else if (item._id === 'converted') totalConverted = item.count;
  }

  const total = totalPartial + totalAbandoned + totalConverted;
  const conversionRate = total > 0 ? Math.round((totalConverted / total) * 100) : 0;

  // Get average completion at abandonment
  const abandonedDocs = await collection.aggregate([
    {
      $match: {
        formId,
        status: 'abandoned',
        startedAt: { $gte: cutoffDate },
      },
    },
    {
      $group: {
        _id: null,
        avgCompletion: { $avg: '$progress.completionPercentage' },
      },
    },
  ]).toArray();

  const averageCompletionAtAbandonment = abandonedDocs[0]?.avgCompletion || 0;

  // Get drop-off by field (which required fields are most often missing)
  const fieldDropOff = await collection.aggregate([
    {
      $match: {
        formId,
        status: 'abandoned',
        startedAt: { $gte: cutoffDate },
      },
    },
    { $unwind: '$progress.missingRequiredFields' },
    {
      $group: {
        _id: '$progress.missingRequiredFields',
        dropOffCount: { $sum: 1 },
      },
    },
    { $sort: { dropOffCount: -1 } },
    { $limit: 10 },
  ]).toArray();

  const dropOffByField = fieldDropOff.map((item) => ({
    field: item._id as string,
    dropOffCount: item.dropOffCount,
  }));

  return {
    totalPartial,
    totalAbandoned,
    totalConverted,
    conversionRate,
    averageCompletionAtAbandonment: Math.round(averageCompletionAtAbandonment),
    dropOffByField,
  };
}
