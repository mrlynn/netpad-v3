import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, ensureSessionId } from '@/lib/session';
import { MongoClient } from 'mongodb';
import { getForms, getPublishedFormById, getPublishedFormBySlug } from '@/lib/storage';
import { getDecryptedConnectionString } from '@/lib/platform/connectionVault';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formId, collection, displayField, valueField, filter = {} } = body;

    if (!formId || !collection || !displayField || !valueField) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get session ID
    const session = await getIronSession(await cookies(), sessionOptions);
    const sessionId = ensureSessionId(session);
    await session.save();

    // Find form - check session forms first, then published forms
    const sessionForms = await getForms(sessionId);
    let form = sessionForms.find((f) => f.id === formId || f.slug === formId);

    if (!form) {
      // Try published forms
      const publishedForm = await getPublishedFormBySlug(formId) || await getPublishedFormById(formId);
      form = publishedForm || undefined;
    }

    if (!form) {
      return NextResponse.json(
        { success: false, error: 'Form not found' },
        { status: 404 }
      );
    }

    // Get connection string - support both legacy connectionString and new dataSource.vaultId
    let connectionString: string | undefined;
    let database: string | undefined;

    if (form.dataSource?.vaultId && form.organizationId) {
      // New vault-based connection
      const credentials = await getDecryptedConnectionString(form.organizationId, form.dataSource.vaultId);
      if (credentials) {
        connectionString = credentials.connectionString;
        database = credentials.database;
      }
    } else if (form.connectionString && form.database) {
      // Legacy direct connection string
      connectionString = form.connectionString;
      database = form.database;
    }

    if (!connectionString || !database) {
      return NextResponse.json(
        { success: false, error: 'Form does not have database connection configured' },
        { status: 400 }
      );
    }

    const client = new MongoClient(connectionString);

    try {
      await client.connect();
      const db = client.db(database);
      const coll = db.collection(collection);

      // Build projection for only the fields we need
      const projection: Record<string, 1> = {
        [displayField]: 1,
        [valueField]: 1,
      };

      // Fetch options with optional filter
      const options = await coll
        .find(filter)
        .project(projection)
        .limit(500)
        .toArray();

      await client.close();

      return NextResponse.json({
        success: true,
        options,
      });
    } catch (error: any) {
      await client.close().catch(() => {});
      throw error;
    }
  } catch (error: any) {
    console.error('Lookup options error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch lookup options' },
      { status: 500 }
    );
  }
}
