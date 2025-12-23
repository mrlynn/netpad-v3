/**
 * File Upload API Route
 *
 * POST /api/files/upload
 *
 * Handles file uploads with:
 * - Authentication required
 * - Organization quota enforcement
 * - Per-file size limits based on tier
 * - MIME type validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { findUserById } from '@/lib/platform/users';
import {
  uploadFile,
  uploadFiles,
  getStorageUsage,
  DEFAULT_MAX_FILE_SIZE,
  IMAGE_MIME_TYPES,
  DOCUMENT_MIME_TYPES,
  ALL_ALLOWED_MIME_TYPES,
  formatBytes,
} from '@/lib/storage/blob';
import { getOrganizationsCollection } from '@/lib/platform/db';
import { SUBSCRIPTION_TIERS } from '@/types/platform';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Maximum request body size (100MB)
export const maxDuration = 60;

interface UploadRequestBody {
  organizationId: string;
  formId?: string;
  submissionId?: string;
  fieldId?: string;
  fileType?: 'image' | 'document' | 'any';
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 2. Parse form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const organizationId = formData.get('organizationId') as string;
    const formId = formData.get('formId') as string | undefined;
    const submissionId = formData.get('submissionId') as string | undefined;
    const fieldId = formData.get('fieldId') as string | undefined;
    const fileType = (formData.get('fileType') as string) || 'any';

    // 3. Validate required fields
    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }

    // 4. Verify user belongs to organization
    const platformUser = await findUserById(session.userId);
    if (!platformUser) {
      return NextResponse.json(
        { error: 'User not found', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const belongsToOrg = platformUser.organizations.some(
      (org) => org.orgId === organizationId
    );

    if (!belongsToOrg) {
      return NextResponse.json(
        { error: 'You do not have access to this organization', code: 'UNAUTHORIZED' },
        { status: 403 }
      );
    }

    // 5. Get organization tier for limits
    const orgsCollection = await getOrganizationsCollection();
    const org = await orgsCollection.findOne({ orgId: organizationId });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const tier = org.subscription?.tier || 'free';
    const maxFileSize = DEFAULT_MAX_FILE_SIZE[tier];

    // 6. Determine allowed MIME types based on fileType
    let allowedMimeTypes: string[];
    switch (fileType) {
      case 'image':
        allowedMimeTypes = IMAGE_MIME_TYPES;
        break;
      case 'document':
        allowedMimeTypes = DOCUMENT_MIME_TYPES;
        break;
      default:
        allowedMimeTypes = ALL_ALLOWED_MIME_TYPES;
    }

    // 7. Get current storage quota info
    const quotaInfo = await getStorageUsage(organizationId);

    // 8. Handle single vs multiple file upload
    if (files.length === 1) {
      const result = await uploadFile(files[0], {
        organizationId,
        uploadedBy: platformUser.userId,
        formId: formId || undefined,
        submissionId: submissionId || undefined,
        fieldId: fieldId || undefined,
        originalName: files[0].name,
        config: {
          maxFileSizeBytes: maxFileSize,
          allowedMimeTypes,
        },
      });

      if (!result.success) {
        const statusCode = getStatusCode(result.code);
        return NextResponse.json(
          { error: result.error, code: result.code },
          { status: statusCode }
        );
      }

      // Get updated quota info
      const updatedQuota = await getStorageUsage(organizationId);

      return NextResponse.json({
        success: true,
        file: result.file,
        quota: {
          usedBytes: updatedQuota.usedBytes,
          limitBytes: updatedQuota.limitBytes,
          remainingBytes: updatedQuota.remainingBytes,
          percentUsed: updatedQuota.percentUsed,
          usedFormatted: formatBytes(updatedQuota.usedBytes),
          limitFormatted: formatBytes(updatedQuota.limitBytes),
          remainingFormatted: formatBytes(updatedQuota.remainingBytes),
        },
      });
    }

    // Multiple files
    const result = await uploadFiles(files, {
      organizationId,
      uploadedBy: platformUser.userId,
      formId: formId || undefined,
      submissionId: submissionId || undefined,
      fieldId: fieldId || undefined,
      originalNames: files.map(f => f.name),
      config: {
        maxFileSizeBytes: maxFileSize,
        allowedMimeTypes,
      },
    });

    // Get updated quota info
    const updatedQuota = await getStorageUsage(organizationId);

    return NextResponse.json({
      success: result.failed.length === 0,
      files: result.successful,
      failed: result.failed,
      quota: {
        usedBytes: updatedQuota.usedBytes,
        limitBytes: updatedQuota.limitBytes,
        remainingBytes: updatedQuota.remainingBytes,
        percentUsed: updatedQuota.percentUsed,
        usedFormatted: formatBytes(updatedQuota.usedBytes),
        limitFormatted: formatBytes(updatedQuota.limitBytes),
        remainingFormatted: formatBytes(updatedQuota.remainingBytes),
      },
    });
  } catch (error) {
    console.error('[API] File upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'UPLOAD_FAILED' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/files/upload
 *
 * Get upload limits and current quota for an organization
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }

    // Verify user belongs to organization
    const platformUser = await findUserById(session.userId);
    if (!platformUser) {
      return NextResponse.json(
        { error: 'User not found', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const belongsToOrg = platformUser.organizations.some(
      (org) => org.orgId === organizationId
    );

    if (!belongsToOrg) {
      return NextResponse.json(
        { error: 'You do not have access to this organization', code: 'UNAUTHORIZED' },
        { status: 403 }
      );
    }

    // Get organization tier
    const orgsCollection = await getOrganizationsCollection();
    const org = await orgsCollection.findOne({ orgId: organizationId });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const tier = org.subscription?.tier || 'free';
    const tierLimits = SUBSCRIPTION_TIERS[tier].limits;
    const maxFileSize = DEFAULT_MAX_FILE_SIZE[tier];

    // Get current quota
    const quota = await getStorageUsage(organizationId);

    return NextResponse.json({
      tier,
      limits: {
        maxFileSizeBytes: maxFileSize,
        maxFileSizeFormatted: formatBytes(maxFileSize),
        maxTotalStorageBytes: tierLimits.maxFileStorageMb === -1 ? -1 : tierLimits.maxFileStorageMb * 1024 * 1024,
        maxTotalStorageFormatted: tierLimits.maxFileStorageMb === -1 ? 'Unlimited' : formatBytes(tierLimits.maxFileStorageMb * 1024 * 1024),
        allowedImageTypes: IMAGE_MIME_TYPES,
        allowedDocumentTypes: DOCUMENT_MIME_TYPES,
        allowedAllTypes: ALL_ALLOWED_MIME_TYPES,
      },
      quota: {
        usedBytes: quota.usedBytes,
        limitBytes: quota.limitBytes,
        remainingBytes: quota.remainingBytes,
        percentUsed: quota.percentUsed,
        isUnlimited: quota.isUnlimited,
        usedFormatted: formatBytes(quota.usedBytes),
        limitFormatted: formatBytes(quota.limitBytes),
        remainingFormatted: formatBytes(quota.remainingBytes),
      },
    });
  } catch (error) {
    console.error('[API] Get upload info error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getStatusCode(code: string): number {
  switch (code) {
    case 'UNAUTHORIZED':
      return 401;
    case 'QUOTA_EXCEEDED':
    case 'FILE_TOO_LARGE':
    case 'INVALID_TYPE':
      return 400;
    case 'NOT_FOUND':
      return 404;
    default:
      return 500;
  }
}
