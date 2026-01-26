import { NextRequest, NextResponse } from 'next/server';
import { getUserClient } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { connectionString, databaseName } = await request.json();

    if (!connectionString || typeof connectionString !== 'string') {
      return NextResponse.json(
        { error: 'Connection string is required' },
        { status: 400 }
      );
    }

    if (!databaseName || typeof databaseName !== 'string') {
      return NextResponse.json(
        { error: 'Database name is required' },
        { status: 400 }
      );
    }

    // Use pooled connection instead of creating new one each request
    const client = await getUserClient(connectionString);
    const db = client.db(databaseName);
    const collections = await db.listCollections().toArray();

    // Note: Don't close the client - it's pooled and will be reused
    return NextResponse.json({
      collections: collections.map((coll) => ({
        name: coll.name,
        type: coll.type || 'collection',
      })),
    });
  } catch (error: any) {
    console.error('List collections error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to list collections',
      },
      { status: 500 }
    );
  }
}

