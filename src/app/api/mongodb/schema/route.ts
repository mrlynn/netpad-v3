import { NextRequest, NextResponse } from 'next/server';
import { getUserClient } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface CollectionInfo {
  name: string;
  fields: string[];
  sampleDoc?: any;
  count: number;
}

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

    // Parallelize all collection queries instead of sequential loop
    const collectionInfos = await Promise.all(
      collections.map(async (collInfo): Promise<CollectionInfo> => {
        const coll = db.collection(collInfo.name);

        // Run count and sample in parallel
        const [count, sampleDoc] = await Promise.all([
          coll.estimatedDocumentCount(), // Much faster than countDocuments() for large collections
          coll.findOne({}),
        ]);

        // Extract field names from sample document
        const fields = sampleDoc ? Object.keys(sampleDoc) : [];

        return {
          name: collInfo.name,
          fields,
          sampleDoc: sampleDoc || undefined,
          count,
        };
      })
    );

    // Note: Don't close the client - it's pooled and will be reused
    return NextResponse.json({
      collections: collectionInfos,
    });
  } catch (error: any) {
    console.error('Schema fetch error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch database schema',
      },
      { status: 500 }
    );
  }
}

