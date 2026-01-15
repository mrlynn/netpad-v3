import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/mongodb/clientCache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Query documents in a MongoDB collection using form-based filters
 *
 * Supports various query operators based on field type:
 * - string: regex search (case-insensitive) or exact match
 * - number: exact match, $gte, $lte, or range
 * - date: exact match or range
 * - boolean: exact match
 * - array: $in or $all
 */
export async function POST(request: NextRequest) {
  try {
    const {
      connectionString,
      databaseName,
      collection,
      query = {},
      projection,
      sort,
      limit = 50,
      skip = 0
    } = await request.json();

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

    if (!collection || typeof collection !== 'string') {
      return NextResponse.json(
        { error: 'Collection name is required' },
        { status: 400 }
      );
    }

    // Sanitize limit and skip
    const queryLimit = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
    const querySkip = Math.max(0, parseInt(String(skip), 10) || 0);

    // Use cached client for better performance
    const client = await getClient(connectionString);
    const db = client.db(databaseName);
    const coll = db.collection(collection);

    // Build the MongoDB query from the provided filters
    const mongoQuery = buildMongoQuery(query);

    // Execute query with pagination
    let cursor = coll.find(mongoQuery);

    // Apply projection if provided
    if (projection && typeof projection === 'object') {
      cursor = cursor.project(projection);
    }

    // Apply sort if provided
    if (sort && typeof sort === 'object') {
      cursor = cursor.sort(sort);
    } else {
      // Default sort by _id descending (newest first)
      cursor = cursor.sort({ _id: -1 });
    }

    // Apply pagination
    cursor = cursor.skip(querySkip).limit(queryLimit);

    // Execute query and count in parallel for better performance
    const [documents, totalCount] = await Promise.all([
      cursor.toArray(),
      // Use estimatedDocumentCount for empty queries (faster), countDocuments otherwise
      Object.keys(mongoQuery).length === 0
        ? coll.estimatedDocumentCount()
        : coll.countDocuments(mongoQuery),
    ]);

    // Note: Don't close client - it's cached and reused

    return NextResponse.json({
      success: true,
      documents,
      count: documents.length,
      totalCount,
      page: Math.floor(querySkip / queryLimit) + 1,
      totalPages: Math.ceil(totalCount / queryLimit),
      query: mongoQuery // Return the constructed query for debugging
    });
  } catch (error: unknown) {
    console.error('Query error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to query documents'
      },
      { status: 500 }
    );
  }
}

/**
 * Builds a MongoDB query from form field filters
 *
 * Filter format:
 * {
 *   fieldPath: {
 *     value: any,           // The value to search for
 *     operator: string,     // 'eq', 'contains', 'gte', 'lte', 'range', 'in', 'exists'
 *     type: string          // 'string', 'number', 'date', 'boolean', 'array'
 *   }
 * }
 */
function buildMongoQuery(filters: Record<string, any>): Record<string, any> {
  const query: Record<string, any> = {};

  for (const [fieldPath, filter] of Object.entries(filters)) {
    // Skip empty values
    if (filter === null || filter === undefined) continue;

    // Handle simple value (direct equality)
    if (typeof filter !== 'object' || filter instanceof Date) {
      if (filter !== '' && filter !== null && filter !== undefined) {
        query[fieldPath] = filter;
      }
      continue;
    }

    const { value, operator = 'eq', type = 'string', value2 } = filter;

    // Skip empty values
    if (value === '' || value === null || value === undefined) continue;

    switch (operator) {
      case 'eq':
      case 'equals':
        query[fieldPath] = value;
        break;

      case 'contains':
      case 'regex':
        // Case-insensitive contains search for strings
        query[fieldPath] = { $regex: escapeRegex(String(value)), $options: 'i' };
        break;

      case 'startsWith':
        query[fieldPath] = { $regex: `^${escapeRegex(String(value))}`, $options: 'i' };
        break;

      case 'endsWith':
        query[fieldPath] = { $regex: `${escapeRegex(String(value))}$`, $options: 'i' };
        break;

      case 'gt':
        query[fieldPath] = { $gt: parseValue(value, type) };
        break;

      case 'gte':
        query[fieldPath] = { $gte: parseValue(value, type) };
        break;

      case 'lt':
        query[fieldPath] = { $lt: parseValue(value, type) };
        break;

      case 'lte':
        query[fieldPath] = { $lte: parseValue(value, type) };
        break;

      case 'range':
        // Range query requires value (min) and value2 (max)
        query[fieldPath] = {};
        if (value !== '' && value !== null && value !== undefined) {
          query[fieldPath].$gte = parseValue(value, type);
        }
        if (value2 !== '' && value2 !== null && value2 !== undefined) {
          query[fieldPath].$lte = parseValue(value2, type);
        }
        // Remove empty range query
        if (Object.keys(query[fieldPath]).length === 0) {
          delete query[fieldPath];
        }
        break;

      case 'in':
        // Value should be an array
        const inValues = Array.isArray(value) ? value : [value];
        query[fieldPath] = { $in: inValues.map(v => parseValue(v, type)) };
        break;

      case 'all':
        // All values must be present (for arrays)
        const allValues = Array.isArray(value) ? value : [value];
        query[fieldPath] = { $all: allValues.map(v => parseValue(v, type)) };
        break;

      case 'exists':
        query[fieldPath] = { $exists: Boolean(value) };
        break;

      case 'ne':
      case 'notEquals':
        query[fieldPath] = { $ne: parseValue(value, type) };
        break;

      default:
        // Default to equality
        query[fieldPath] = parseValue(value, type);
    }
  }

  return query;
}

/**
 * Parse value based on field type
 */
function parseValue(value: any, type: string): any {
  switch (type) {
    case 'number':
      const num = parseFloat(value);
      return isNaN(num) ? value : num;

    case 'date':
      if (value instanceof Date) return value;
      const date = new Date(value);
      return isNaN(date.getTime()) ? value : date;

    case 'boolean':
      if (typeof value === 'boolean') return value;
      return value === 'true' || value === '1' || value === 1;

    default:
      return value;
  }
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
