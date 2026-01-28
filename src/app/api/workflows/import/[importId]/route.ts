/**
 * Workflow Import API - Get specific import by ID
 *
 * GET /api/workflows/import/[importId]
 * Returns the workflow import record for the import page to display
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowImport } from '@/lib/platform/workflowImportsDbOps';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  try {
    const { importId } = await params;

    if (!importId) {
      return NextResponse.json(
        { error: 'Import ID is required', code: 'MISSING_ID' },
        { status: 400 }
      );
    }

    const importRecord = await getWorkflowImport(importId);

    if (!importRecord) {
      return NextResponse.json(
        { error: 'Import not found or expired', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check if already used
    if (importRecord.resultWorkflowId) {
      return NextResponse.json(
        { error: 'This import has already been used', code: 'ALREADY_CLAIMED' },
        { status: 410 }
      );
    }

    // Return the import data
    return NextResponse.json({
      importId: importRecord.importId,
      config: importRecord.config,
      projectId: importRecord.projectId,
      source: importRecord.source,
      expiresAt: importRecord.expiresAt.toISOString(),
      claimed: !!importRecord.claimedAt,
    });
  } catch (error) {
    console.error('[Workflow Import] GET by ID error:', error);
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
