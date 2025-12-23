/**
 * Vercel Blob Storage Service
 *
 * Handles file uploads with:
 * - Organization-scoped storage paths
 * - Per-file and total storage quota enforcement
 * - Automatic cleanup on deletion
 * - Metadata tracking in MongoDB
 */

import { put, del, list, head } from '@vercel/blob';
import { getUsageCollection, getOrganizationsCollection } from '../platform/db';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/types/platform';

// ============================================
// Types
// ============================================

export interface FileMetadata {
  id: string;
  organizationId: string;
  formId?: string;
  submissionId?: string;
  fieldId?: string;

  // Blob info
  url: string;
  pathname: string;
  downloadUrl: string;

  // File info
  originalName: string;
  mimeType: string;
  size: number;

  // Upload info
  uploadedBy: string;
  uploadedAt: Date;
}

export interface UploadResult {
  success: true;
  file: FileMetadata;
}

export interface UploadError {
  success: false;
  error: string;
  code: 'QUOTA_EXCEEDED' | 'FILE_TOO_LARGE' | 'INVALID_TYPE' | 'UPLOAD_FAILED' | 'UNAUTHORIZED';
}

export type UploadResponse = UploadResult | UploadError;

export interface StorageQuotaInfo {
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  percentUsed: number;
  isUnlimited: boolean;
}

export interface FileUploadConfig {
  maxFileSizeBytes: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

// ============================================
// Default Configuration
// ============================================

// Per-file size limits by tier (in bytes)
export const DEFAULT_MAX_FILE_SIZE: Record<SubscriptionTier, number> = {
  free: 5 * 1024 * 1024,        // 5 MB
  pro: 25 * 1024 * 1024,        // 25 MB
  team: 100 * 1024 * 1024,      // 100 MB
  enterprise: 500 * 1024 * 1024, // 500 MB
};

// Image MIME types
export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/heic',
  'image/heif',
];

// Document MIME types
export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
];

// All allowed MIME types
export const ALL_ALLOWED_MIME_TYPES = [...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES];

// ============================================
// Storage Quota Functions
// ============================================

/**
 * Get current storage usage for an organization
 */
export async function getStorageUsage(orgId: string): Promise<StorageQuotaInfo> {
  const orgsCollection = await getOrganizationsCollection();
  const usageCollection = await getUsageCollection();

  // Get organization tier
  const org = await orgsCollection.findOne({ orgId });
  const tier = org?.subscription?.tier || 'free';
  const limitMb = SUBSCRIPTION_TIERS[tier].limits.maxFileStorageMb;
  const limitBytes = limitMb === -1 ? -1 : limitMb * 1024 * 1024;

  // Get current period usage
  const period = getCurrentPeriod();
  const usage = await usageCollection.findOne({ organizationId: orgId, period });
  const usedBytes = usage?.storage?.filesBytes || 0;

  const isUnlimited = limitBytes === -1;
  const remainingBytes = isUnlimited ? -1 : Math.max(0, limitBytes - usedBytes);
  const percentUsed = isUnlimited ? 0 : (usedBytes / limitBytes) * 100;

  return {
    usedBytes,
    limitBytes,
    remainingBytes,
    percentUsed,
    isUnlimited,
  };
}

/**
 * Check if a file upload would exceed quota
 */
export async function checkStorageQuota(
  orgId: string,
  fileSizeBytes: number
): Promise<{ allowed: boolean; quota: StorageQuotaInfo; reason?: string }> {
  const quota = await getStorageUsage(orgId);

  if (quota.isUnlimited) {
    return { allowed: true, quota };
  }

  if (fileSizeBytes > quota.remainingBytes) {
    return {
      allowed: false,
      quota,
      reason: `Upload would exceed storage quota. You have ${formatBytes(quota.remainingBytes)} remaining, but the file is ${formatBytes(fileSizeBytes)}.`,
    };
  }

  return { allowed: true, quota };
}

/**
 * Increment storage usage after successful upload
 */
export async function incrementStorageUsage(
  orgId: string,
  bytesAdded: number
): Promise<void> {
  const collection = await getUsageCollection();
  const period = getCurrentPeriod();

  await collection.updateOne(
    { organizationId: orgId, period },
    {
      $inc: { 'storage.filesBytes': bytesAdded },
      $set: { updatedAt: new Date() },
    },
    { upsert: true }
  );
}

/**
 * Decrement storage usage after file deletion
 */
export async function decrementStorageUsage(
  orgId: string,
  bytesRemoved: number
): Promise<void> {
  const collection = await getUsageCollection();
  const period = getCurrentPeriod();

  await collection.updateOne(
    { organizationId: orgId, period },
    {
      $inc: { 'storage.filesBytes': -Math.abs(bytesRemoved) },
      $set: { updatedAt: new Date() },
    }
  );
}

// ============================================
// File Upload Functions
// ============================================

/**
 * Upload a file to Vercel Blob storage
 */
export async function uploadFile(
  file: File | Blob,
  options: {
    organizationId: string;
    uploadedBy: string;
    formId?: string;
    submissionId?: string;
    fieldId?: string;
    originalName?: string;
    config?: Partial<FileUploadConfig>;
  }
): Promise<UploadResponse> {
  const {
    organizationId,
    uploadedBy,
    formId,
    submissionId,
    fieldId,
    originalName,
    config,
  } = options;

  // Get organization tier for limits
  const orgsCollection = await getOrganizationsCollection();
  const org = await orgsCollection.findOne({ orgId: organizationId });

  if (!org) {
    return { success: false, error: 'Organization not found', code: 'UNAUTHORIZED' };
  }

  const tier = org.subscription?.tier || 'free';
  const maxFileSize = config?.maxFileSizeBytes || DEFAULT_MAX_FILE_SIZE[tier];
  const allowedTypes = config?.allowedMimeTypes || ALL_ALLOWED_MIME_TYPES;

  // Get file info
  const fileName = originalName || (file instanceof File ? file.name : 'file');
  const mimeType = file.type || 'application/octet-stream';
  const fileSize = file.size;

  // Validate file size
  if (fileSize > maxFileSize) {
    return {
      success: false,
      error: `File size (${formatBytes(fileSize)}) exceeds maximum allowed size (${formatBytes(maxFileSize)})`,
      code: 'FILE_TOO_LARGE',
    };
  }

  // Validate MIME type
  if (allowedTypes.length > 0 && !allowedTypes.includes(mimeType)) {
    return {
      success: false,
      error: `File type "${mimeType}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      code: 'INVALID_TYPE',
    };
  }

  // Check storage quota
  const quotaCheck = await checkStorageQuota(organizationId, fileSize);
  if (!quotaCheck.allowed) {
    return {
      success: false,
      error: quotaCheck.reason || 'Storage quota exceeded',
      code: 'QUOTA_EXCEEDED',
    };
  }

  // Generate storage path
  const fileId = generateFileId();
  const extension = getFileExtension(fileName);
  const storagePath = buildStoragePath({
    organizationId,
    formId,
    submissionId,
    fieldId,
    fileId,
    extension,
  });

  try {
    // Upload to Vercel Blob
    const blob = await put(storagePath, file, {
      access: 'public',
      contentType: mimeType,
      addRandomSuffix: false, // We handle uniqueness with fileId
    });

    // Update storage usage
    await incrementStorageUsage(organizationId, fileSize);

    const fileMetadata: FileMetadata = {
      id: fileId,
      organizationId,
      formId,
      submissionId,
      fieldId,
      url: blob.url,
      pathname: blob.pathname,
      downloadUrl: blob.downloadUrl,
      originalName: fileName,
      mimeType,
      size: fileSize,
      uploadedBy,
      uploadedAt: new Date(),
    };

    return { success: true, file: fileMetadata };
  } catch (error) {
    console.error('[Storage] Upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
      code: 'UPLOAD_FAILED',
    };
  }
}

/**
 * Upload multiple files
 */
export async function uploadFiles(
  files: (File | Blob)[],
  options: {
    organizationId: string;
    uploadedBy: string;
    formId?: string;
    submissionId?: string;
    fieldId?: string;
    originalNames?: string[];
    config?: Partial<FileUploadConfig>;
  }
): Promise<{ successful: FileMetadata[]; failed: Array<{ index: number; error: string }> }> {
  const successful: FileMetadata[] = [];
  const failed: Array<{ index: number; error: string }> = [];

  // Check total size against quota first
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const quotaCheck = await checkStorageQuota(options.organizationId, totalSize);

  if (!quotaCheck.allowed) {
    return {
      successful: [],
      failed: files.map((_, index) => ({
        index,
        error: quotaCheck.reason || 'Storage quota exceeded',
      })),
    };
  }

  // Upload files sequentially to properly track quota
  for (let i = 0; i < files.length; i++) {
    const result = await uploadFile(files[i], {
      ...options,
      originalName: options.originalNames?.[i],
    });

    if (result.success) {
      successful.push(result.file);
    } else {
      failed.push({ index: i, error: result.error });
    }
  }

  return { successful, failed };
}

// ============================================
// File Deletion Functions
// ============================================

/**
 * Delete a file from Vercel Blob storage
 */
export async function deleteFile(
  url: string,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get file info to know size for quota adjustment
    const blobInfo = await head(url);
    const fileSize = blobInfo?.size || 0;

    // Delete from Vercel Blob
    await del(url);

    // Decrement storage usage
    if (fileSize > 0) {
      await decrementStorageUsage(organizationId, fileSize);
    }

    return { success: true };
  } catch (error) {
    console.error('[Storage] Delete failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

/**
 * Delete multiple files
 */
export async function deleteFiles(
  urls: string[],
  organizationId: string
): Promise<{ deleted: number; failed: number }> {
  let deleted = 0;
  let failed = 0;

  for (const url of urls) {
    const result = await deleteFile(url, organizationId);
    if (result.success) {
      deleted++;
    } else {
      failed++;
    }
  }

  return { deleted, failed };
}

/**
 * Delete all files for a submission
 */
export async function deleteSubmissionFiles(
  organizationId: string,
  formId: string,
  submissionId: string
): Promise<{ deleted: number; failed: number }> {
  const prefix = `${organizationId}/${formId}/${submissionId}/`;

  try {
    const { blobs } = await list({ prefix });
    const urls = blobs.map(blob => blob.url);
    return await deleteFiles(urls, organizationId);
  } catch (error) {
    console.error('[Storage] Delete submission files failed:', error);
    return { deleted: 0, failed: 0 };
  }
}

// ============================================
// File Listing Functions
// ============================================

/**
 * List files for an organization
 */
export async function listOrganizationFiles(
  organizationId: string,
  options?: { formId?: string; limit?: number; cursor?: string }
): Promise<{ files: Array<{ url: string; pathname: string; size: number; uploadedAt: Date }>; cursor?: string }> {
  const prefix = options?.formId
    ? `${organizationId}/${options.formId}/`
    : `${organizationId}/`;

  try {
    const { blobs, cursor } = await list({
      prefix,
      limit: options?.limit || 100,
      cursor: options?.cursor,
    });

    return {
      files: blobs.map(blob => ({
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: blob.uploadedAt,
      })),
      cursor,
    };
  } catch (error) {
    console.error('[Storage] List files failed:', error);
    return { files: [] };
  }
}

// ============================================
// Helper Functions
// ============================================

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function generateFileId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `file_${timestamp}${randomPart}`;
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

function buildStoragePath(options: {
  organizationId: string;
  formId?: string;
  submissionId?: string;
  fieldId?: string;
  fileId: string;
  extension: string;
}): string {
  const { organizationId, formId, submissionId, fieldId, fileId, extension } = options;

  // Path structure: org/form/submission/field/fileId.ext
  // This allows for efficient prefix-based listing and deletion
  const parts = [organizationId];

  if (formId) parts.push(formId);
  if (submissionId) parts.push(submissionId);
  if (fieldId) parts.push(fieldId);

  const fileName = extension ? `${fileId}.${extension}` : fileId;
  parts.push(fileName);

  return parts.join('/');
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  if (bytes === -1) return 'Unlimited';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
