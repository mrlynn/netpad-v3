/**
 * Google Forms URL Parser API
 *
 * POST /api/integrations/google-forms/parse-url
 *
 * Parses a publicly accessible Google Form from its URL
 * without requiring OAuth authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  parseGoogleFormUrl,
  mapParsedFormToNetPad,
} from '@/lib/integrations/googleForms';

export const dynamic = 'force-dynamic';

interface ParseUrlRequest {
  url: string;
}

interface ParseUrlResponse {
  success: boolean;
  form?: {
    formId: string;
    title: string;
    description?: string;
    fieldCount: number;
    pageCount: number;
    sourceUrl: string;
  };
  preview?: {
    fields: Array<{
      path: string;
      label: string;
      type: string;
      required: boolean;
      hasOptions: boolean;
    }>;
    warnings: string[];
    statistics: {
      totalFields: number;
      mappedFields: number;
      unmappedFields: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<ParseUrlResponse>> {
  try {
    // Authentication still required to prevent abuse
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    const body: ParseUrlRequest = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'URL is required',
          },
        },
        { status: 400 }
      );
    }

    // Validate it looks like a Google Forms URL
    const normalizedUrl = url.trim();
    if (!normalizedUrl.includes('google.com/forms') && !normalizedUrl.includes('forms.gle')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_URL',
            message: 'Please provide a valid Google Forms URL (docs.google.com/forms/... or forms.gle/...)',
          },
        },
        { status: 400 }
      );
    }

    // Parse the form
    console.log('[Google Forms URL Parse] Parsing URL:', normalizedUrl);
    const parseResult = await parseGoogleFormUrl(normalizedUrl);

    if (!parseResult.success || !parseResult.form) {
      console.error('[Google Forms URL Parse] Parse failed:', parseResult.error);
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error || {
            code: 'PARSE_FAILED',
            message: 'Failed to parse form',
          },
        },
        { status: 400 }
      );
    }

    const form = parseResult.form;

    // Map to NetPad fields
    const mappingResult = mapParsedFormToNetPad(form);

    console.log('[Google Forms URL Parse] Success:', {
      title: form.title,
      fields: form.fields.length,
      mapped: mappingResult.statistics.mappedFields,
    });

    return NextResponse.json({
      success: true,
      form: {
        formId: form.formId,
        title: form.title,
        description: form.description,
        fieldCount: form.fields.length,
        pageCount: form.pageCount,
        sourceUrl: form.sourceUrl,
      },
      preview: {
        fields: mappingResult.fields.map((f) => ({
          path: f.path,
          label: f.label,
          type: f.type,
          required: f.required || false,
          hasOptions: !!(f.validation?.options && f.validation.options.length > 0),
        })),
        warnings: mappingResult.warnings,
        statistics: mappingResult.statistics,
      },
    });
  } catch (error) {
    console.error('[Google Forms URL Parse] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
        },
      },
      { status: 500 }
    );
  }
}
