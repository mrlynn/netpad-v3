/**
 * Data Import API - Execute import
 *
 * POST /api/data-import/[importId]/execute - Execute the import
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
 * Execute the import
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    ensureSessionId(session);
    await session.save();

    const { importId } = await params;
    const contentType = request.headers.get('content-type') || '';

    let content: string | ArrayBuffer;
    let dryRun = false;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const dryRunParam = formData.get('dryRun');

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      dryRun = dryRunParam === 'true';

      // Check if it's an Excel file
      if (
        file.type.includes('excel') ||
        file.type.includes('spreadsheet') ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls')
      ) {
        content = await file.arrayBuffer();
      } else {
        content = await file.text();
      }
    } else {
      const body = await request.json();
      content = body.content;
      dryRun = body.dryRun || false;

      if (!content) {
        return NextResponse.json(
          { error: 'Missing content' },
          { status: 400 }
        );
      }
    }

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

    // Execute import
    const job = await importService.executeImport(importId, content, {
      dryRun,
    });

    return NextResponse.json({
      status: job.status,
      progress: job.progress,
      results: job.results,
      message: dryRun
        ? 'Dry run completed'
        : job.status === 'completed'
        ? 'Import completed successfully'
        : 'Import finished with errors',
    });
  } catch (error) {
    console.error('Error executing import:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute import' },
      { status: 500 }
    );
  }
}
