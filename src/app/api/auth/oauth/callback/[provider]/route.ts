/**
 * OAuth Callback Route
 *
 * GET /api/auth/oauth/callback/google
 * GET /api/auth/oauth/callback/github
 *
 * Handles OAuth provider callback after user authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleOAuthCallback, isProviderAvailable } from '@/lib/platform/oauth';
import { createSession } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  // Validate provider
  if (provider !== 'google' && provider !== 'github') {
    return NextResponse.redirect(
      new URL('/auth/error?error=invalid_provider', request.url)
    );
  }

  // Check if provider is configured
  if (!isProviderAvailable(provider)) {
    return NextResponse.redirect(
      new URL('/auth/error?error=provider_not_configured', request.url)
    );
  }

  // Get code and state from query params
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error(`[OAuth ${provider}] Provider returned error:`, error);
    return NextResponse.redirect(
      new URL(`/auth/error?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/auth/error?error=missing_params', request.url)
    );
  }

  try {
    // Handle the OAuth callback
    const result = await handleOAuthCallback(provider, code, state);

    // Create session with waitlist status
    await createSession(result.user.userId, result.user.email, {
      isPasskeyAuth: false,
      waitlistStatus: result.user.waitlistStatus,
    });

    // If user is pending/rejected waitlist status, redirect to waitlist page
    // This prevents them from seeing onboarding or protected routes
    if (result.user.waitlistStatus === 'pending' || result.user.waitlistStatus === 'rejected') {
      return NextResponse.redirect(new URL('/waitlist/pending', request.url));
    }

    // Determine redirect URL for approved users
    const redirectUrl = result.redirectTo || '/';

    // Add success message for new users
    if (result.isNewUser) {
      const url = new URL(redirectUrl, request.url);
      url.searchParams.set('welcome', 'true');
      return NextResponse.redirect(url);
    }

    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error(`[OAuth ${provider}] Callback error:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(
      new URL(`/auth/error?error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
