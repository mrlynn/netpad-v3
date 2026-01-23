/**
 * GET /api/extensions/features
 *
 * Returns the list of enabled extension features.
 * Used by client-side hooks to check feature availability.
 */

import { NextResponse } from 'next/server';
import { getEnabledFeatures, loadExtensions, extensionsLoaded } from '@/lib/extensions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Ensure extensions are loaded
    if (!extensionsLoaded()) {
      await loadExtensions();
    }

    const features = getEnabledFeatures();

    return NextResponse.json({
      features,
      count: features.length,
    });
  } catch (error) {
    console.error('[API] Failed to get extension features:', error);
    return NextResponse.json(
      { error: 'Failed to get extension features' },
      { status: 500 }
    );
  }
}
