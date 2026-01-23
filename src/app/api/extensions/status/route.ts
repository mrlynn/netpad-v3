/**
 * GET /api/extensions/status
 *
 * Returns the extension system status including deployment mode,
 * registered extensions, and enabled features.
 */

import { NextResponse } from 'next/server';
import { getRegistryStatus, loadExtensions, extensionsLoaded } from '@/lib/extensions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Ensure extensions are loaded
    if (!extensionsLoaded()) {
      await loadExtensions();
    }

    const status = getRegistryStatus();

    return NextResponse.json(status);
  } catch (error) {
    console.error('[API] Failed to get extension status:', error);
    return NextResponse.json(
      { error: 'Failed to get extension status' },
      { status: 500 }
    );
  }
}
