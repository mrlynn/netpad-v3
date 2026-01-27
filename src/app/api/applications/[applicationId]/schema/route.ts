/**
 * Application Schema API
 *
 * GET /api/applications/[applicationId]/schema - Get inferred schema for application
 *
 * Returns the JSON Schema inferred from all forms in the application,
 * grouped by target collection. This provides visibility into the data
 * model that forms will create in MongoDB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getApplication } from '@/lib/platform/applications';
import { checkApplicationPermission } from '@/lib/platform/applicationPermissions';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { inferApplicationSchema, FormForSchema } from '@/lib/schema/inferSchema';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const session = await getSession();
    const { applicationId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId query parameter is required' },
        { status: 400 }
      );
    }

    // Get application
    const application = await getApplication(orgId, applicationId);
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check permission to read application
    const permissionCheck = await checkApplicationPermission(
      session.userId,
      orgId,
      applicationId,
      'read'
    );

    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: 'Insufficient permissions', reason: permissionCheck.reason },
        { status: 403 }
      );
    }

    // Get all forms for this application
    const formsCollection = await getOrgFormsCollection(orgId);
    const forms = await formsCollection
      .find({ applicationId })
      .project({
        formId: 1,
        id: 1,
        name: 1,
        collection: 1,
        database: 1,
        dataSource: 1,
        fieldConfigs: 1,
      })
      .toArray();

    // Convert to FormForSchema type
    const formsForSchema: FormForSchema[] = forms.map((form: any) => ({
      formId: form.formId || form.id,
      id: form.id,
      name: form.name || 'Unnamed Form',
      collection: form.collection,
      database: form.database,
      dataSource: form.dataSource,
      fieldConfigs: form.fieldConfigs || [],
    }));

    // Infer schema from forms
    const schema = inferApplicationSchema(formsForSchema, application.name);

    return NextResponse.json({
      success: true,
      schema,
      application: {
        applicationId: application.applicationId,
        name: application.name,
      },
    });
  } catch (error) {
    console.error('[Application Schema API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate schema', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
