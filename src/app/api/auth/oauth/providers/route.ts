import { NextResponse } from 'next/server';
import { getAvailableProviders } from '@/lib/platform/oauth';

/**
 * GET /api/auth/oauth/providers
 * Returns which OAuth providers are configured and available
 */
export async function GET() {
  const providers = getAvailableProviders();

  return NextResponse.json({
    providers,
  });
}
