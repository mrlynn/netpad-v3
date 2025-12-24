/**
 * Data Import API - Analyze data and infer schema
 *
 * POST /api/data-import/[importId]/analyze - Upload data and analyze schema
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
 * Analyze uploaded data and infer schema
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
    let sampleSize = 1000;

    // Handle different content types
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const sampleSizeParam = formData.get('sampleSize');

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      if (sampleSizeParam) {
        sampleSize = parseInt(sampleSizeParam.toString(), 10);
      }

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
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      content = body.content;
      sampleSize = body.sampleSize || 1000;
    } else {
      // Assume raw text
      content = await request.text();
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

    // Analyze data
    const result = await importService.analyzeData(importId, content, sampleSize);

    return NextResponse.json({
      schema: result.schema,
      preview: result.preview,
      suggestedMappings: result.suggestedMappings,
      message: 'Data analyzed successfully',
    });
  } catch (error) {
    console.error('Error analyzing data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze data' },
      { status: 500 }
    );
  }
}
