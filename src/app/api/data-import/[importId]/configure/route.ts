/**
 * Data Import API - Configure column mappings
 *
 * POST /api/data-import/[importId]/configure - Set mapping configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, ensureSessionId, SessionData } from '@/lib/session';
import { getPlatformDb } from '@/lib/platform/db';
import { ImportService } from '@/lib/dataImport';
import { createTargetClientGetter } from '@/lib/dataImport/connectionHelper';
import { ImportMappingConfig } from '@/types/dataImport';

export const dynamic = 'force-dynamic';

/**
 * Configure mapping for import
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

    let mappingConfig: ImportMappingConfig;
    let content: string | ArrayBuffer;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const mappingConfigStr = formData.get('mappingConfig');

      if (!file || !mappingConfigStr) {
        return NextResponse.json(
          { error: 'Missing file or mappingConfig' },
          { status: 400 }
        );
      }

      mappingConfig = JSON.parse(mappingConfigStr.toString());

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
      mappingConfig = body.mappingConfig;
      content = body.content;

      if (!mappingConfig || !content) {
        return NextResponse.json(
          { error: 'Missing mappingConfig or content' },
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

    // Configure mappings and validate
    const result = await importService.configureMappings(
      importId,
      mappingConfig,
      content
    );

    return NextResponse.json({
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
      sampleOutput: result.sampleOutput,
      message: result.valid
        ? 'Mapping configuration validated'
        : 'Validation errors found',
    });
  } catch (error) {
    console.error('Error configuring mappings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to configure mappings' },
      { status: 500 }
    );
  }
}
