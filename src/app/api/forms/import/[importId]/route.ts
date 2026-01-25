/**
 * Form Import Detail API Endpoint
 *
 * GET /api/forms/import/[importId] - Fetch import details
 * POST /api/forms/import/[importId]/claim - Claim an import (mark as used)
 *
 * @see docs/specs/CLAUDE-NETPAD-INTEGRATION-SPEC.md Phase 1
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getFormImport,
  claimFormImport,
  completeFormImport,
} from '@/lib/platform/formImportsDbOps';
import { getSession } from '@/lib/auth/session';

// ============================================
// GET /api/forms/import/[importId]
// ============================================

/**
 * Get import details by ID
 *
 * Returns the form configuration and metadata for an import.
 * Does NOT require authentication (import links should be shareable).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  try {
    const { importId } = await params;

    // Validate import ID format
    if (!importId || !importId.startsWith('imp_')) {
      return NextResponse.json(
        { error: 'Invalid import ID', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const importRecord = await getFormImport(importId);

    if (!importRecord) {
      return NextResponse.json(
        { error: 'Import not found or expired', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check if already completed (form was created)
    if (importRecord.resultFormId) {
      return NextResponse.json(
        {
          error: 'This import has already been used to create a form',
          code: 'ALREADY_USED',
          formId: importRecord.resultFormId,
        },
        { status: 410 } // Gone
      );
    }

    // Return import data (without internal fields)
    return NextResponse.json({
      importId: importRecord.importId,
      config: importRecord.config,
      projectId: importRecord.projectId,
      source: importRecord.source,
      expiresAt: importRecord.expiresAt.toISOString(),
      claimed: !!importRecord.claimedAt,
    });
  } catch (error) {
    console.error('[Form Import] GET error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch import',
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/forms/import/[importId]
// ============================================

/**
 * Claim an import or mark it as completed
 *
 * Body:
 * - action: "claim" | "complete"
 * - formId: (required for "complete" action)
 *
 * Requires authentication.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { importId } = await params;
    const userId = session.userId;

    // Validate import ID format
    if (!importId || !importId.startsWith('imp_')) {
      return NextResponse.json(
        { error: 'Invalid import ID', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Parse body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body', code: 'INVALID_JSON' },
        { status: 400 }
      );
    }

    const action = body.action as string;

    if (action === 'claim') {
      // Claim the import
      const result = await claimFormImport(importId, userId);

      if (!result.success) {
        const statusMap: Record<string, number> = {
          NOT_FOUND: 404,
          EXPIRED: 410,
          ALREADY_CLAIMED: 409,
        };
        return NextResponse.json(
          { error: result.error?.message, code: result.error?.code },
          { status: statusMap[result.error?.code || ''] || 400 }
        );
      }

      return NextResponse.json({
        success: true,
        claimed: true,
        claimedAt: result.import?.claimedAt?.toISOString(),
      });
    }

    if (action === 'complete') {
      // Mark import as completed (form was created)
      const formId = body.formId as string;

      if (!formId) {
        return NextResponse.json(
          { error: 'formId is required for complete action', code: 'MISSING_FORM_ID' },
          { status: 400 }
        );
      }

      await completeFormImport(importId, formId);

      return NextResponse.json({
        success: true,
        completed: true,
        formId,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "claim" or "complete"', code: 'INVALID_ACTION' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Form Import] POST error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
