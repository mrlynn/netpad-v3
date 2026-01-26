import { NextRequest, NextResponse } from 'next/server';
import { Document } from 'mongodb';
import { getUserClient } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface FieldInfo {
  name: string;
  types: Set<string>;
  isNested: boolean;
  nestedFields?: FieldInfo[];
}

function inferFieldType(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'array';
    const itemType = inferFieldType(value[0]);
    return `array<${itemType}>`;
  }
  if (value instanceof Date) return 'date';
  if (typeof value === 'object') {
    if (value._bsontype === 'ObjectId' || value.constructor?.name === 'ObjectId') {
      return 'ObjectId';
    }
    return 'object';
  }
  return typeof value;
}

function extractFields(doc: Document, prefix: string = ''): Map<string, FieldInfo> {
  const fields = new Map<string, FieldInfo>();

  for (const [key, value] of Object.entries(doc)) {
    const fieldName = prefix ? `${prefix}.${key}` : key;
    const fieldType = inferFieldType(value);

    const fieldInfo: FieldInfo = {
      name: fieldName,
      types: new Set([fieldType]),
      isNested: typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date),
    };

    // Recursively extract nested fields for objects (but not arrays)
    if (fieldInfo.isNested && typeof value === 'object' && !Array.isArray(value)) {
      const nestedFields = extractFields(value as Document, fieldName);
      if (nestedFields.size > 0) {
        fieldInfo.nestedFields = Array.from(nestedFields.values());
      }
    }

    fields.set(fieldName, fieldInfo);
  }

  return fields;
}

function mergeFieldTypes(existing: FieldInfo, newInfo: FieldInfo): FieldInfo {
  newInfo.types.forEach(type => existing.types.add(type));
  return existing;
}

export async function POST(request: NextRequest) {
  try {
    const { connectionString, databaseName, collectionName, sampleSize = 10 } = await request.json();

    if (!connectionString || typeof connectionString !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Connection string is required' },
        { status: 400 }
      );
    }

    if (!databaseName || typeof databaseName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Database name is required' },
        { status: 400 }
      );
    }

    if (!collectionName || typeof collectionName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Collection name is required' },
        { status: 400 }
      );
    }

    // Use pooled connection instead of creating new one each request
    const client = await getUserClient(connectionString);
    const db = client.db(databaseName);
    const collection = db.collection(collectionName);

    // Run count and sample fetch in parallel, use estimatedDocumentCount for speed
    const [totalCount, sampleDocuments] = await Promise.all([
      collection.estimatedDocumentCount(),
      collection.find({}).limit(Math.min(sampleSize, 20)).toArray(),
    ]);

    // Infer schema from sample documents
    const allFields = new Map<string, FieldInfo>();

    for (const doc of sampleDocuments) {
      const docFields = extractFields(doc);
      for (const [fieldName, fieldInfo] of docFields.entries()) {
        if (allFields.has(fieldName)) {
          mergeFieldTypes(allFields.get(fieldName)!, fieldInfo);
        } else {
          allFields.set(fieldName, fieldInfo);
        }
      }
    }

    // Convert to array and format types
    const fields = Array.from(allFields.values()).map(field => ({
      name: field.name,
      types: Array.from(field.types),
      isNested: field.isNested,
      nestedFields: field.nestedFields,
    }));

    // Note: Don't close the client - it's pooled and will be reused
    return NextResponse.json({
      success: true,
      data: {
        collectionName,
        totalCount,
        sampleSize: sampleDocuments.length,
        documents: sampleDocuments,
        fields: fields.sort((a, b) => a.name.localeCompare(b.name)),
      },
    });
  } catch (error: any) {
    console.error('Sample data fetch error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch sample data',
      },
      { status: 500 }
    );
  }
}
