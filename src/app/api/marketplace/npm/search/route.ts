/**
 * npm Package Search API
 * 
 * GET /api/marketplace/npm/search - Search npm registry for NetPad packages
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { searchNpmRegistry } from '@/lib/npm/registry-client';
import { discoverNetPadPackages, discoverPackagesByCriteria } from '@/lib/npm/package-discovery';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/npm/search
 * Search npm registry for NetPad packages
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') as 'application' | 'plugin' | null;
    const category = searchParams.get('category') || undefined;
    const verified = searchParams.get('verified') === 'true' ? true : searchParams.get('verified') === 'false' ? false : undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // If query is provided, search npm registry directly
    if (query) {
      const searchResults = await searchNpmRegistry(query, {
        size: limit,
        from: offset,
      });

      return NextResponse.json({
        success: true,
        query,
        total: searchResults.total,
        packages: searchResults.objects.map(result => ({
          name: result.package.name,
          version: result.package.version,
          description: result.package.description,
          keywords: result.package.keywords,
          score: result.score.final,
        })),
      });
    }

    // Otherwise, discover NetPad packages with filters
    let packages;
    
    if (type || category || verified !== undefined) {
      // Use filtered discovery
      packages = await discoverPackagesByCriteria({
        packageName: query || undefined,
        type: type || undefined,
        category: category || undefined,
        verified: verified,
        limit: limit + offset, // Fetch more to handle offset
      });
      
      // Apply offset manually
      packages = packages.slice(offset, offset + limit);
    } else {
      // Use general discovery
      packages = await discoverNetPadPackages({
        includeOfficial: true,
        includeCommunity: true,
        limit: limit + offset, // Fetch more to handle offset
      });
      
      // Apply offset manually
      packages = packages.slice(offset, offset + limit);
    }

    return NextResponse.json({
      success: true,
      total: packages.length, // Note: This is approximate, actual total may be higher
      packages: packages.map(pkg => ({
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        netpad: {
          type: pkg.netpad.type,
          category: pkg.netpad.category,
          tags: pkg.netpad.tags,
        },
        isOfficial: pkg.isOfficial,
        isVerified: pkg.isVerified,
        publishedAt: pkg.publishedAt,
      })),
    });
  } catch (error) {
    console.error('[npm Search API] Search error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to search npm registry',
      },
      { status: 500 }
    );
  }
}
