/**
 * Google Forms Integration API - Preview Import
 *
 * GET /api/integrations/google-forms/preview?orgId=xxx&credentialId=xxx&formId=xxx
 *
 * Fetches a Google Form and returns a preview of how it would be mapped to NetPad.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  createGoogleFormsClient,
  mapGoogleFormToNetPad,
  countFormQuestions,
  buildFormResponderUrl,
} from '@/lib/integrations/googleForms';
import { GoogleFormsPreviewResponse } from '@/types/googleFormsImport';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');
    const credentialId = searchParams.get('credentialId');
    const formId = searchParams.get('formId');

    if (!orgId || !credentialId || !formId) {
      return NextResponse.json(
        { error: 'Missing required parameters: orgId, credentialId, formId' },
        { status: 400 }
      );
    }

    // Create Google Forms client
    const client = createGoogleFormsClient(orgId, credentialId);

    // Fetch the form
    const formResult = await client.getForm(formId);

    if (!formResult.success || !formResult.data) {
      console.error('[Google Forms Preview] Fetch failed:', formResult.error);
      return NextResponse.json(
        { error: formResult.error?.message || 'Failed to fetch form' },
        { status: formResult.error?.status || 500 }
      );
    }

    const googleForm = formResult.data;

    // Map the form to NetPad field configs
    const mappingResult = mapGoogleFormToNetPad(googleForm);

    // Build the preview response
    const response: GoogleFormsPreviewResponse = {
      sourceForm: {
        id: googleForm.formId,
        title: googleForm.info.title,
        description: googleForm.info.description,
        itemCount: googleForm.items?.length || 0,
        responderUri: googleForm.responderUri || buildFormResponderUrl(formId),
      },
      mappingResult,
      previewConfig: {
        name: googleForm.info.title,
        description: googleForm.info.description,
        fieldConfigs: mappingResult.fields,
        multiPage: mappingResult.pages && mappingResult.pages.length > 1
          ? {
              enabled: true,
              pages: mappingResult.pages.map((page) => ({
                id: page.id,
                title: page.title,
                description: page.description,
                fields: page.fieldPaths,
              })),
            }
          : undefined,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Google Forms Preview] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
