/**
 * Sample Databases Index
 * Export all sample databases and helper functions
 */

import { SampleDatabase, SampleCollection } from '@/types/dataImport';
import { retailDatabase } from './retailDatabase';

export { retailDatabase } from './retailDatabase';

// All available sample databases
export const sampleDatabases: SampleDatabase[] = [
  retailDatabase,
];

/**
 * Get a sample database by ID
 */
export function getSampleDatabase(id: string): SampleDatabase | undefined {
  return sampleDatabases.find(db => db.id === id);
}

/**
 * Get a sample collection by database and collection name
 */
export function getSampleCollection(
  databaseId: string,
  collectionName: string
): SampleCollection | undefined {
  const db = getSampleDatabase(databaseId);
  return db?.collections.find(c => c.name === collectionName);
}

/**
 * Generate CSV content from sample documents
 */
export function generateSampleCSV(collection: SampleCollection): string {
  if (collection.sampleDocuments.length === 0) {
    return '';
  }

  // Get all unique keys from all documents
  const allKeys = new Set<string>();
  collection.sampleDocuments.forEach(doc => {
    Object.keys(doc).forEach(key => allKeys.add(key));
  });
  const headers = Array.from(allKeys);

  // Build CSV content
  const lines: string[] = [];

  // Header row
  lines.push(headers.map(h => `"${h}"`).join(','));

  // Data rows
  for (const doc of collection.sampleDocuments) {
    const row = headers.map(header => {
      const value = doc[header];
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'string') {
        // Escape quotes and wrap in quotes
        return `"${value.replace(/"/g, '""')}"`;
      }
      if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
      }
      return String(value);
    });
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

/**
 * Generate JSON content from sample documents
 */
export function generateSampleJSON(collection: SampleCollection): string {
  return JSON.stringify(collection.sampleDocuments, null, 2);
}

/**
 * Generate JSONL content from sample documents
 */
export function generateSampleJSONL(collection: SampleCollection): string {
  return collection.sampleDocuments
    .map(doc => JSON.stringify(doc))
    .join('\n');
}

/**
 * Get downloadable content for a sample collection
 */
export function getSampleDownload(
  collection: SampleCollection,
  format: 'csv' | 'json' | 'jsonl'
): { content: string; filename: string; mimeType: string } {
  switch (format) {
    case 'csv':
      return {
        content: generateSampleCSV(collection),
        filename: `${collection.name}.csv`,
        mimeType: 'text/csv',
      };
    case 'json':
      return {
        content: generateSampleJSON(collection),
        filename: `${collection.name}.json`,
        mimeType: 'application/json',
      };
    case 'jsonl':
      return {
        content: generateSampleJSONL(collection),
        filename: `${collection.name}.jsonl`,
        mimeType: 'application/x-ndjson',
      };
  }
}

/**
 * Get extended sample data (100 records) for a collection
 * This generates synthetic data based on the schema
 */
export function generateExtendedSampleData(
  collection: SampleCollection,
  count: number = 100
): Record<string, any>[] {
  const records: Record<string, any>[] = [];

  // Use existing samples as templates
  const templates = collection.sampleDocuments;

  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    const record: Record<string, any> = {};

    for (const field of collection.schema) {
      const baseValue = template[field.originalName];

      switch (field.inferredType) {
        case 'string':
          if (field.isUnique) {
            // Generate unique ID
            record[field.originalName] = `${baseValue?.toString().replace(/\d+$/, '') || field.suggestedPath.toUpperCase() + '-'}${String(i + 1).padStart(4, '0')}`;
          } else if (field.suggestedValidation?.options) {
            // Pick from options
            const options = field.suggestedValidation.options;
            record[field.originalName] = options[i % options.length];
          } else {
            record[field.originalName] = baseValue || `Sample ${field.suggestedLabel} ${i + 1}`;
          }
          break;

        case 'integer':
        case 'number':
          const min = field.suggestedValidation?.min ?? 0;
          const max = field.suggestedValidation?.max ?? 1000;
          record[field.originalName] = Math.floor(min + Math.random() * (max - min));
          break;

        case 'decimal':
          const minDec = field.suggestedValidation?.min ?? 0;
          const maxDec = field.suggestedValidation?.max ?? 1000;
          record[field.originalName] = Math.round((minDec + Math.random() * (maxDec - minDec)) * 100) / 100;
          break;

        case 'boolean':
          record[field.originalName] = Math.random() > 0.5;
          break;

        case 'date':
          // Generate date in last 2 years
          const start = new Date();
          start.setFullYear(start.getFullYear() - 2);
          const end = new Date();
          const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
          record[field.originalName] = randomDate.toISOString().split('T')[0];
          break;

        case 'datetime':
          const startDt = new Date();
          startDt.setFullYear(startDt.getFullYear() - 1);
          const endDt = new Date();
          const randomDateTime = new Date(startDt.getTime() + Math.random() * (endDt.getTime() - startDt.getTime()));
          record[field.originalName] = randomDateTime.toISOString();
          break;

        case 'email':
          const names = ['john', 'jane', 'mike', 'sarah', 'tom', 'lisa', 'alex', 'emma'];
          const domains = ['email.com', 'company.org', 'mail.net', 'example.com'];
          record[field.originalName] = `${names[i % names.length]}${i + 1}@${domains[i % domains.length]}`;
          break;

        case 'phone':
          record[field.originalName] = `555-${String(Math.floor(100 + Math.random() * 900))}-${String(Math.floor(1000 + Math.random() * 9000))}`;
          break;

        default:
          record[field.originalName] = baseValue;
      }
    }

    records.push(record);
  }

  return records;
}
