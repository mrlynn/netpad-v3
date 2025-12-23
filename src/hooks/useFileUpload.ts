'use client';

/**
 * useFileUpload Hook
 *
 * React hook for handling file uploads with:
 * - Progress tracking
 * - Quota information
 * - Error handling
 * - Multiple file support
 */

import { useState, useCallback, useRef } from 'react';

// ============================================
// Types
// ============================================

export interface UploadedFile {
  id: string;
  url: string;
  downloadUrl: string;
  pathname: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export interface StorageQuota {
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  percentUsed: number;
  usedFormatted: string;
  limitFormatted: string;
  remainingFormatted: string;
  isUnlimited?: boolean;
}

export interface UploadLimits {
  maxFileSizeBytes: number;
  maxFileSizeFormatted: string;
  maxTotalStorageBytes: number;
  maxTotalStorageFormatted: string;
  allowedImageTypes: string[];
  allowedDocumentTypes: string[];
  allowedAllTypes: string[];
}

export interface UploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export interface UseFileUploadOptions {
  organizationId: string;
  formId?: string;
  submissionId?: string;
  fieldId?: string;
  fileType?: 'image' | 'document' | 'any';
  maxFiles?: number;
  onUploadComplete?: (files: UploadedFile[]) => void;
  onUploadError?: (error: string) => void;
  onQuotaUpdate?: (quota: StorageQuota) => void;
}

export interface UseFileUploadReturn {
  // State
  files: UploadedFile[];
  progress: Record<string, UploadProgress>;
  isUploading: boolean;
  error: string | null;
  quota: StorageQuota | null;
  limits: UploadLimits | null;

  // Actions
  upload: (files: File[]) => Promise<UploadedFile[]>;
  deleteFile: (url: string) => Promise<boolean>;
  deleteFiles: (urls: string[]) => Promise<{ deleted: number; failed: number }>;
  clearFiles: () => void;
  clearError: () => void;
  refreshQuota: () => Promise<void>;
  fetchLimits: () => Promise<void>;

  // Validation
  validateFile: (file: File) => { valid: boolean; error?: string };
  validateFiles: (files: File[]) => { valid: boolean; errors: string[] };
}

// ============================================
// Hook Implementation
// ============================================

export function useFileUpload(options: UseFileUploadOptions): UseFileUploadReturn {
  const {
    organizationId,
    formId,
    submissionId,
    fieldId,
    fileType = 'any',
    maxFiles,
    onUploadComplete,
    onUploadError,
    onQuotaUpdate,
  } = options;

  // State
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [progress, setProgress] = useState<Record<string, UploadProgress>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [limits, setLimits] = useState<UploadLimits | null>(null);

  // Ref to track abort controller
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch upload limits and current quota
   */
  const fetchLimits = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/files/upload?organizationId=${encodeURIComponent(organizationId)}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch upload limits');
      }

      const data = await response.json();
      setLimits(data.limits);
      setQuota(data.quota);
      onQuotaUpdate?.(data.quota);
    } catch (err) {
      console.error('Failed to fetch upload limits:', err);
    }
  }, [organizationId, onQuotaUpdate]);

  /**
   * Refresh current quota
   */
  const refreshQuota = useCallback(async () => {
    await fetchLimits();
  }, [fetchLimits]);

  /**
   * Validate a single file
   */
  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      if (!limits) {
        return { valid: true }; // Can't validate without limits
      }

      // Check file size
      if (file.size > limits.maxFileSizeBytes) {
        return {
          valid: false,
          error: `File "${file.name}" exceeds maximum size of ${limits.maxFileSizeFormatted}`,
        };
      }

      // Check MIME type
      let allowedTypes: string[];
      switch (fileType) {
        case 'image':
          allowedTypes = limits.allowedImageTypes;
          break;
        case 'document':
          allowedTypes = limits.allowedDocumentTypes;
          break;
        default:
          allowedTypes = limits.allowedAllTypes;
      }

      if (!allowedTypes.includes(file.type)) {
        return {
          valid: false,
          error: `File type "${file.type}" is not allowed for "${file.name}"`,
        };
      }

      return { valid: true };
    },
    [limits, fileType]
  );

  /**
   * Validate multiple files
   */
  const validateFiles = useCallback(
    (filesToValidate: File[]): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      // Check max files
      if (maxFiles && filesToValidate.length > maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
      }

      // Check total size against remaining quota
      if (quota && !quota.isUnlimited) {
        const totalSize = filesToValidate.reduce((sum, f) => sum + f.size, 0);
        if (totalSize > quota.remainingBytes) {
          errors.push(
            `Total file size (${formatBytes(totalSize)}) exceeds remaining storage (${quota.remainingFormatted})`
          );
        }
      }

      // Validate individual files
      for (const file of filesToValidate) {
        const result = validateFile(file);
        if (!result.valid && result.error) {
          errors.push(result.error);
        }
      }

      return { valid: errors.length === 0, errors };
    },
    [validateFile, maxFiles, quota]
  );

  /**
   * Upload files
   */
  const upload = useCallback(
    async (filesToUpload: File[]): Promise<UploadedFile[]> => {
      if (filesToUpload.length === 0) return [];

      // Pre-validation
      const validation = validateFiles(filesToUpload);
      if (!validation.valid) {
        const errorMsg = validation.errors.join('; ');
        setError(errorMsg);
        onUploadError?.(errorMsg);
        return [];
      }

      setIsUploading(true);
      setError(null);

      // Initialize progress for all files
      const initialProgress: Record<string, UploadProgress> = {};
      for (const file of filesToUpload) {
        initialProgress[file.name] = {
          fileName: file.name,
          progress: 0,
          status: 'pending',
        };
      }
      setProgress(initialProgress);

      try {
        // Create form data
        const formData = new FormData();
        formData.append('organizationId', organizationId);
        if (formId) formData.append('formId', formId);
        if (submissionId) formData.append('submissionId', submissionId);
        if (fieldId) formData.append('fieldId', fieldId);
        formData.append('fileType', fileType);

        for (const file of filesToUpload) {
          formData.append('files', file);
        }

        // Update progress to uploading
        setProgress(prev => {
          const updated = { ...prev };
          for (const file of filesToUpload) {
            updated[file.name] = { ...updated[file.name], status: 'uploading', progress: 50 };
          }
          return updated;
        });

        // Upload
        abortControllerRef.current = new AbortController();
        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
          signal: abortControllerRef.current.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        // Update quota
        if (data.quota) {
          setQuota(data.quota);
          onQuotaUpdate?.(data.quota);
        }

        // Handle single file response
        if (data.file) {
          const uploadedFile: UploadedFile = {
            id: data.file.id,
            url: data.file.url,
            downloadUrl: data.file.downloadUrl,
            pathname: data.file.pathname,
            originalName: data.file.originalName,
            mimeType: data.file.mimeType,
            size: data.file.size,
            uploadedAt: new Date(data.file.uploadedAt),
          };

          setFiles(prev => [...prev, uploadedFile]);
          setProgress(prev => ({
            ...prev,
            [uploadedFile.originalName]: {
              fileName: uploadedFile.originalName,
              progress: 100,
              status: 'success',
            },
          }));

          onUploadComplete?.([uploadedFile]);
          return [uploadedFile];
        }

        // Handle multiple files response
        if (data.files) {
          const uploadedFiles: UploadedFile[] = data.files.map((f: UploadedFile) => ({
            id: f.id,
            url: f.url,
            downloadUrl: f.downloadUrl,
            pathname: f.pathname,
            originalName: f.originalName,
            mimeType: f.mimeType,
            size: f.size,
            uploadedAt: new Date(f.uploadedAt),
          }));

          setFiles(prev => [...prev, ...uploadedFiles]);

          // Update progress for successful files
          setProgress(prev => {
            const updated = { ...prev };
            for (const file of uploadedFiles) {
              updated[file.originalName] = {
                fileName: file.originalName,
                progress: 100,
                status: 'success',
              };
            }
            return updated;
          });

          // Handle failed files
          if (data.failed && data.failed.length > 0) {
            setProgress(prev => {
              const updated = { ...prev };
              for (const failure of data.failed) {
                const fileName = filesToUpload[failure.index]?.name;
                if (fileName) {
                  updated[fileName] = {
                    fileName,
                    progress: 0,
                    status: 'error',
                    error: failure.error,
                  };
                }
              }
              return updated;
            });
          }

          onUploadComplete?.(uploadedFiles);
          return uploadedFiles;
        }

        return [];
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Upload failed';
        setError(errorMsg);
        onUploadError?.(errorMsg);

        // Mark all as failed
        setProgress(prev => {
          const updated = { ...prev };
          for (const file of filesToUpload) {
            updated[file.name] = {
              fileName: file.name,
              progress: 0,
              status: 'error',
              error: errorMsg,
            };
          }
          return updated;
        });

        return [];
      } finally {
        setIsUploading(false);
        abortControllerRef.current = null;
      }
    },
    [
      organizationId,
      formId,
      submissionId,
      fieldId,
      fileType,
      validateFiles,
      onUploadComplete,
      onUploadError,
      onQuotaUpdate,
    ]
  );

  /**
   * Delete a single file
   */
  const deleteFile = useCallback(
    async (url: string): Promise<boolean> => {
      try {
        const response = await fetch('/api/files/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationId, url }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Delete failed');
        }

        // Remove from state
        setFiles(prev => prev.filter(f => f.url !== url));

        // Update quota
        if (data.quota) {
          setQuota(data.quota);
          onQuotaUpdate?.(data.quota);
        }

        return true;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Delete failed';
        setError(errorMsg);
        return false;
      }
    },
    [organizationId, onQuotaUpdate]
  );

  /**
   * Delete multiple files
   */
  const deleteFiles = useCallback(
    async (urls: string[]): Promise<{ deleted: number; failed: number }> => {
      try {
        const response = await fetch('/api/files/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationId, urls }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Delete failed');
        }

        // Remove deleted files from state
        setFiles(prev => prev.filter(f => !urls.includes(f.url)));

        // Update quota
        if (data.quota) {
          setQuota(data.quota);
          onQuotaUpdate?.(data.quota);
        }

        return { deleted: data.deleted, failed: data.failed };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Delete failed';
        setError(errorMsg);
        return { deleted: 0, failed: urls.length };
      }
    },
    [organizationId, onQuotaUpdate]
  );

  /**
   * Clear all files from state (does not delete from storage)
   */
  const clearFiles = useCallback(() => {
    setFiles([]);
    setProgress({});
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    files,
    progress,
    isUploading,
    error,
    quota,
    limits,

    // Actions
    upload,
    deleteFile,
    deleteFiles,
    clearFiles,
    clearError,
    refreshQuota,
    fetchLimits,

    // Validation
    validateFile,
    validateFiles,
  };
}

// ============================================
// Utility Functions
// ============================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  if (bytes === -1) return 'Unlimited';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default useFileUpload;
