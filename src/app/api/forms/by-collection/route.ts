/**
 * Forms By Collection API
 *
 * GET /api/forms/by-collection - Find form schema for a collection/database
 *
 * Used by the Data Browser to provide schema-aware document editing
 * with proper field types and encrypted field handling.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import { getPlatformDb } from '@/lib/platform/db';
import type { FormConfiguration } from '@/types/form';

export const dynamic = 'force-dynamic';

interface StoredForm {
  ownerId: string;
  form: FormConfiguration;
  savedAt: Date;
}

/**
 * GET - Find form by collection and database
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

    const { searchParams } = new URL(request.url);
    const collection = searchParams.get('collection');
    const database = searchParams.get('database');
    const organizationId = searchParams.get('organizationId');

    if (!collection || !database) {
      return NextResponse.json(
        { error: 'Missing required parameters: collection, database' },
        { status: 400 }
      );
    }

    const db = await getPlatformDb();

    // Build query to find forms matching this collection/database
    const query: Record<string, unknown> = {
      'form.collection': collection,
      'form.database': database,
    };

    // If organizationId provided, prioritize org forms
    if (organizationId) {
      query['form.organizationId'] = organizationId;
    }

    // Find the most recently updated form for this collection
    const forms = await db.collection<StoredForm>('user_forms')
      .find(query)
      .sort({ savedAt: -1 })
      .limit(1)
      .toArray();

    if (forms.length === 0) {
      // No form found - return null (Data Browser will fall back to raw JSON)
      return NextResponse.json({ form: null });
    }

    const formConfig = forms[0].form;

    // Extract relevant information for the editor
    const response = {
      form: {
        id: formConfig.id,
        name: formConfig.name,
        collection: formConfig.collection,
        database: formConfig.database,
        fieldConfigs: formConfig.fieldConfigs.map(field => ({
          path: field.path,
          label: field.label,
          type: field.type,
          required: field.required,
          placeholder: field.placeholder,
          validation: field.validation,
          encryption: field.encryption ? {
            enabled: field.encryption.enabled,
            algorithm: field.encryption.algorithm,
            queryType: field.encryption.queryType,
            sensitivityLevel: field.encryption.sensitivityLevel,
          } : undefined,
        })),
        // Include encryption config for handling re-encryption
        collectionEncryption: formConfig.collectionEncryption,
        dataSource: formConfig.dataSource,
      },
      // Summary info
      hasEncryptedFields: formConfig.fieldConfigs.some(f => f.encryption?.enabled),
      encryptedFieldPaths: formConfig.fieldConfigs
        .filter(f => f.encryption?.enabled)
        .map(f => f.path),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Form lookup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to find form' },
      { status: 500 }
    );
  }
}
