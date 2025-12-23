/**
 * File Delete API Route
 *
 * DELETE /api/files/delete
 *
 * Handles file deletion with:
 * - Authentication required
 * - Organization membership verification
 * - Storage quota adjustment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { findUserById } from '@/lib/platform/users';
import {
  deleteFile,
  deleteFiles,
  deleteSubmissionFiles,
  getStorageUsage,
  formatBytes,
} from '@/lib/storage/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DeleteRequestBody {
  organizationId: string;
  // Single file deletion
  url?: string;
  // Multiple file deletion
  urls?: string[];
  // Submission-level deletion
  formId?: string;
  submissionId?: string;
}

export async function DELETE(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body: DeleteRequestBody = await request.json();
    const { organizationId, url, urls, formId, submissionId } = body;

    // 3. Validate required fields
    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }

    // Must provide either url, urls, or (formId + submissionId)
    const hasUrl = !!url;
    const hasUrls = urls && urls.length > 0;
    const hasSubmission = formId && submissionId;

    if (!hasUrl && !hasUrls && !hasSubmission) {
      return NextResponse.json(
        { error: 'Provide either url, urls, or (formId + submissionId)', code: 'BAD_REQUEST' },
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

    // 5. Handle different deletion types
    let result: { deleted: number; failed: number };

    if (hasSubmission) {
      // Delete all files for a submission
      result = await deleteSubmissionFiles(organizationId, formId!, submissionId!);
    } else if (hasUrls) {
      // Delete multiple files
      result = await deleteFiles(urls!, organizationId);
    } else {
      // Delete single file
      const singleResult = await deleteFile(url!, organizationId);
      result = singleResult.success
        ? { deleted: 1, failed: 0 }
        : { deleted: 0, failed: 1 };

      if (!singleResult.success) {
        return NextResponse.json(
          { error: singleResult.error || 'Delete failed', code: 'DELETE_FAILED' },
          { status: 500 }
        );
      }
    }

    // 6. Get updated quota info
    const updatedQuota = await getStorageUsage(organizationId);

    return NextResponse.json({
      success: result.failed === 0,
      deleted: result.deleted,
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
    console.error('[API] File delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'DELETE_FAILED' },
      { status: 500 }
    );
  }
}
