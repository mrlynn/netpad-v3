/**
 * Data Import API - Single import job operations
 *
 * GET /api/data-import/[importId] - Get import job details
 * DELETE /api/data-import/[importId] - Delete import job
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, ensureSessionId, SessionData } from '@/lib/session';
import { getPlatformDb } from '@/lib/platform/db';
import { ImportService } from '@/lib/dataImport';
import { createTargetClientGetter } from '@/lib/dataImport/connectionHelper';

export const dynamic = 'force-dynamic';

/**
 * Get import job details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    ensureSessionId(session);
    await session.save();

    const { importId } = await params;

    const platformDb = await getPlatformDb();

    // First get the job to find the organizationId
    const importsCollection = platformDb.collection('data_imports');
    const existingJob = await importsCollection.findOne({ importId });

    if (!existingJob) {
      return NextResponse.json(
        { error: 'Import job not found' },
        { status: 404 }
      );
    }

    const importService = new ImportService({
      platformDb,
      getTargetClient: createTargetClientGetter(existingJob.organizationId),
    });

    const job = await importService.getImportJob(importId);

    // Check if job can be resumed or cancelled
    const canResume = ['paused', 'failed'].includes(job!.status);
    const canCancel = ['pending', 'uploading', 'analyzing', 'mapping', 'validating', 'importing'].includes(job!.status);

    return NextResponse.json({
      job,
      canResume,
      canCancel,
    });
  } catch (error) {
    console.error('Error getting import job:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get import job' },
      { status: 500 }
    );
  }
}

/**
 * Delete import job
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    ensureSessionId(session);
    await session.save();

    const { importId } = await params;
    const { searchParams } = new URL(request.url);
    const deleteData = searchParams.get('deleteData') === 'true';

    const platformDb = await getPlatformDb();

    // First get the job to find the organizationId
    const importsCollection = platformDb.collection('data_imports');
    const existingJob = await importsCollection.findOne({ importId });

    if (!existingJob) {
      return NextResponse.json(
        { error: 'Import job not found' },
        { status: 404 }
      );
    }

    const importService = new ImportService({
      platformDb,
      getTargetClient: createTargetClientGetter(existingJob.organizationId),
    });

    await importService.deleteImportJob(importId, {
      deleteImportedData: deleteData,
    });

    return NextResponse.json({
      success: true,
      message: 'Import job deleted',
    });
  } catch (error) {
    console.error('Error deleting import job:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete import job' },
      { status: 500 }
    );
  }
}
