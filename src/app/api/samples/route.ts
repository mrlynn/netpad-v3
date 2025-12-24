/**
 * Sample Data API
 * Provides sample databases and downloadable data for testing imports
 *
 * GET /api/samples - List available sample databases
 * GET /api/samples?database=retail-sample&collection=products&format=csv - Download sample data
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  sampleDatabases,
  getSampleDatabase,
  getSampleCollection,
  getSampleDownload,
  generateExtendedSampleData,
  generateSampleCSV,
  generateSampleJSON,
  generateSampleJSONL,
} from '@/data/samples';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const databaseId = searchParams.get('database');
  const collectionName = searchParams.get('collection');
  const format = searchParams.get('format') as 'csv' | 'json' | 'jsonl' | null;
  const extended = searchParams.get('extended') === 'true';
  const count = parseInt(searchParams.get('count') || '100', 10);

  // If no database specified, return list of all databases
  if (!databaseId) {
    return NextResponse.json({
      databases: sampleDatabases.map(db => ({
        id: db.id,
        name: db.name,
        description: db.description,
        collectionCount: db.collections.length,
        collections: db.collections.map(c => ({
          name: c.name,
          description: c.description,
          documentCount: c.documentCount,
          fieldCount: c.schema.length,
        })),
      })),
    });
  }

  // Get specific database
  const database = getSampleDatabase(databaseId);
  if (!database) {
    return NextResponse.json(
      { error: `Database '${databaseId}' not found` },
      { status: 404 }
    );
  }

  // If no collection specified, return database details
  if (!collectionName) {
    return NextResponse.json({
      id: database.id,
      name: database.name,
      description: database.description,
      collections: database.collections.map(c => ({
        name: c.name,
        description: c.description,
        documentCount: c.documentCount,
        schema: c.schema,
        suggestedForms: c.suggestedForms,
        sampleDocuments: c.sampleDocuments.slice(0, 5),
      })),
    });
  }

  // Get specific collection
  const collection = getSampleCollection(databaseId, collectionName);
  if (!collection) {
    return NextResponse.json(
      { error: `Collection '${collectionName}' not found in database '${databaseId}'` },
      { status: 404 }
    );
  }

  // If no format specified, return collection details
  if (!format) {
    return NextResponse.json({
      name: collection.name,
      description: collection.description,
      documentCount: collection.documentCount,
      schema: collection.schema,
      suggestedForms: collection.suggestedForms,
      sampleDocuments: collection.sampleDocuments,
      availableFormats: ['csv', 'json', 'jsonl'],
    });
  }

  // Generate downloadable content
  let content: string;
  let filename: string;
  let mimeType: string;

  // Use extended data if requested
  const documents = extended
    ? generateExtendedSampleData(collection, count)
    : collection.sampleDocuments;

  // Create a temporary collection object with the documents
  const tempCollection = { ...collection, sampleDocuments: documents };

  switch (format) {
    case 'csv':
      content = generateSampleCSV(tempCollection);
      filename = `${collection.name}${extended ? `_${count}` : ''}.csv`;
      mimeType = 'text/csv';
      break;
    case 'json':
      content = generateSampleJSON(tempCollection);
      filename = `${collection.name}${extended ? `_${count}` : ''}.json`;
      mimeType = 'application/json';
      break;
    case 'jsonl':
      content = generateSampleJSONL(tempCollection);
      filename = `${collection.name}${extended ? `_${count}` : ''}.jsonl`;
      mimeType = 'application/x-ndjson';
      break;
    default:
      return NextResponse.json(
        { error: `Unsupported format '${format}'. Use csv, json, or jsonl.` },
        { status: 400 }
      );
  }

  // Return as downloadable file
  return new NextResponse(content, {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
