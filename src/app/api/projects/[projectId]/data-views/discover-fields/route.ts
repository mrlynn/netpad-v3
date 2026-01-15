/**
 * Data View Field Discovery API
 *
 * POST /api/projects/[projectId]/data-views/discover-fields - Discover fields from collection sample
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getProject } from '@/lib/platform/projects';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { getDecryptedConnectionString } from '@/lib/platform/connectionVault';
import { getClient } from '@/lib/mongodb/clientCache';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Extract all field paths from a document (recursive)
 */
function extractFieldPaths(obj: any, prefix = '', paths: Set<string> = new Set()): Set<string> {
  if (obj === null || obj === undefined) {
    return paths;
  }

  if (Array.isArray(obj)) {
    // For arrays, check if it's an array of objects or primitives
    if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null && !(obj[0] instanceof Date)) {
      // Array of objects - add array path and recurse into first element
      const arrayPath = prefix || 'array';
      paths.add(arrayPath);
      extractFieldPaths(obj[0], `${prefix}[0]`, paths);
    } else {
      // Array of primitives - just add the path
      if (prefix) paths.add(prefix);
    }
    return paths;
  }

  if (obj instanceof Date) {
    if (prefix) paths.add(prefix);
    return paths;
  }

  if (typeof obj === 'object') {
    // Add current path if it's not empty
    if (prefix) paths.add(prefix);

    // Recurse into object properties
    for (const [key, value] of Object.entries(obj)) {
      const newPrefix = prefix ? `${prefix}.${key}` : key;
      extractFieldPaths(value, newPrefix, paths);
    }
    return paths;
  }

  // Primitive value
  if (prefix) paths.add(prefix);
  return paths;
}

/**
 * Infer field type from value
 */
function inferFieldType(value: any): string {
  if (value === null || value === undefined) return 'string';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (value instanceof Date) return 'date';
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === 'string') return 'stringArray';
    return 'array';
  }
  if (typeof value === 'object') {
    // Check if it looks like an ObjectId
    if (ObjectId.isValid(value) && value.toString().length === 24) return 'objectId';
    return 'json';
  }
  if (typeof value === 'string') {
    // Check for common patterns
    if (/^[\w.-]+@[\w.-]+\.\w+$/.test(value)) return 'string'; // email (handled by format)
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
    return 'string';
  }
  return 'string';
}

/**
 * Discover fields from a collection sample
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getSession();
    const { projectId } = await params;

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check permission
    const permissions = await getUserOrgPermissions(session.userId, project.organizationId);
    if (!permissions.orgRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { connectionId, db, collection, sampleSize = 100 } = body;

    if (!connectionId || !db || !collection) {
      return NextResponse.json(
        { error: 'Connection ID, database, and collection are required' },
        { status: 400 }
      );
    }

    // Get connection string
    const connectionInfo = await getDecryptedConnectionString(
      project.organizationId,
      connectionId
    );

    if (!connectionInfo) {
      return NextResponse.json(
        { error: 'Failed to get connection string' },
        { status: 500 }
      );
    }

    // Get MongoDB client
    const client = await getClient(connectionInfo.connectionString);
    const mongoDb = client.db(db);
    const coll = mongoDb.collection(collection);

    // Sample documents
    const sampleSizeNum = Math.min(100, Math.max(10, parseInt(String(sampleSize), 10) || 100));
    const sampleDocs = await coll.find({}).limit(sampleSizeNum).toArray();

    if (sampleDocs.length === 0) {
      return NextResponse.json({
        success: true,
        fields: [],
        message: 'Collection is empty - no fields to discover',
      });
    }

    // Extract all field paths from sample documents
    const allPaths = new Set<string>();
    const fieldStats = new Map<string, {
      type: string;
      count: number;
      sampleValues: any[];
      isRequired: boolean;
    }>();

    for (const doc of sampleDocs) {
      const paths = extractFieldPaths(doc);
      paths.forEach(path => {
        allPaths.add(path);
        
        // Get value at path
        const value = path.split('.').reduce((obj: any, key: string) => {
          // Handle array indices
          const arrayMatch = key.match(/^(.+)\[(\d+)\]$/);
          if (arrayMatch) {
            const arrayKey = arrayMatch[1];
            const index = parseInt(arrayMatch[2], 10);
            return obj?.[arrayKey]?.[index];
          }
          return obj?.[key];
        }, doc);

        // Update stats
        const existing = fieldStats.get(path) || {
          type: inferFieldType(value),
          count: 0,
          sampleValues: [],
          isRequired: true,
        };

        existing.count++;
        if (value === null || value === undefined) {
          existing.isRequired = false;
        } else if (existing.sampleValues.length < 5) {
          existing.sampleValues.push(value);
        }

        // Refine type based on multiple samples
        if (existing.count > 1 && existing.type !== inferFieldType(value)) {
          // Mixed types - default to json
          existing.type = 'json';
        }

        fieldStats.set(path, existing);
      });
    }

    // Convert to array and sort by frequency, then alphabetically
    const fields = Array.from(allPaths)
      .map(path => {
        const stats = fieldStats.get(path) || {
          type: 'string',
          count: 0,
          sampleValues: [],
          isRequired: false,
        };
        return {
          path,
          type: stats.type,
          frequency: stats.count,
          sampleValues: stats.sampleValues.slice(0, 3),
          isRequired: stats.isRequired,
          // Generate a label from path
          label: path.split('.').pop() || path,
        };
      })
      .sort((a, b) => {
        // Sort by frequency (desc), then alphabetically
        if (b.frequency !== a.frequency) {
          return b.frequency - a.frequency;
        }
        return a.path.localeCompare(b.path);
      });

    return NextResponse.json({
      success: true,
      fields,
      sampleSize: sampleDocs.length,
      totalFields: fields.length,
    });
  } catch (error) {
    console.error('[Field Discovery API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to discover fields',
      },
      { status: 500 }
    );
  }
}
