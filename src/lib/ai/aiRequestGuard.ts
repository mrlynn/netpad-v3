/**
 * AI Request Guard
 *
 * Shared utilities for validating AI requests, checking authentication,
 * and enforcing usage limits across all AI endpoints.
 */

import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { findUserById } from '@/lib/platform/users';
import { checkAILimit, incrementAIUsage, hasAIFeature } from '@/lib/platform/billing';
import { AIFeature } from '@/types/platform';
import { getOrganizationsCollection } from '@/lib/platform/db';

// Guest usage limits
const GUEST_DAILY_LIMIT = 5;

// In-memory guest usage tracking (resets on server restart, but that's fine for rate limiting)
const guestUsage = new Map<string, { count: number; resetAt: number }>();

export interface AIRequestContext {
  userId: string;
  orgId: string;
  isGuest?: boolean;
}

export type AIGuardResult =
  | {
      success: true;
      context: AIRequestContext;
    }
  | {
      success: false;
      response: NextResponse;
    };

/**
 * Get a unique identifier for guest users based on IP address
 */
function getGuestIdentifier(request?: NextRequest): string {
  if (!request) return 'unknown';

  // Try to get real IP from various headers (Vercel, Cloudflare, etc.)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  return cfConnectingIp || realIp || forwardedFor?.split(',')[0]?.trim() || 'unknown';
}

/**
 * Check if guest has remaining queries
 */
function checkGuestLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;

  const usage = guestUsage.get(identifier);

  // Reset if past reset time
  if (!usage || now > usage.resetAt) {
    return { allowed: true, remaining: GUEST_DAILY_LIMIT };
  }

  const remaining = GUEST_DAILY_LIMIT - usage.count;
  return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
}

/**
 * Increment guest usage
 */
function incrementGuestUsage(identifier: string): void {
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;

  const usage = guestUsage.get(identifier);

  if (!usage || now > usage.resetAt) {
    guestUsage.set(identifier, { count: 1, resetAt: now + dayInMs });
  } else {
    usage.count++;
  }
}

/**
 * Validates an AI request and checks feature access and usage limits.
 * Returns either a context object for valid requests or an error response.
 */
export async function validateAIRequest(
  feature: AIFeature,
  checkUsageLimit: boolean = true
): Promise<AIGuardResult> {
  // Check authentication
  const session = await getSession();
  if (!session?.userId) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  // Get user and their organization
  const user = await findUserById(session.userId);
  if (!user || user.organizations.length === 0) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: 'No organization found. Please create a workspace first.' },
        { status: 403 }
      ),
    };
  }

  // Find the first valid organization (one that actually exists in the database)
  let orgId: string | null = null;
  const orgsCollection = await getOrganizationsCollection();
  const staleOrgIds: string[] = [];

  for (const userOrg of user.organizations) {
    const org = await orgsCollection.findOne({ orgId: userOrg.orgId });
    if (org) {
      orgId = userOrg.orgId;
      break;
    } else {
      console.warn(`[AI Guard] User ${session.userId} has stale org reference: ${userOrg.orgId}`);
      staleOrgIds.push(userOrg.orgId);
    }
  }

  // Clean up stale org references asynchronously (don't wait for it)
  if (staleOrgIds.length > 0) {
    const { getUsersCollection } = await import('@/lib/platform/db');
    const usersCollection = await getUsersCollection();
    usersCollection.updateOne(
      { userId: session.userId },
      {
        $pull: { organizations: { orgId: { $in: staleOrgIds } } },
        $set: { updatedAt: new Date() },
      }
    ).catch(err => console.error('[AI Guard] Failed to clean up stale org refs:', err));
  }

  if (!orgId) {
    console.error(`[AI Guard] User ${session.userId} has no valid organizations. Org references: ${user.organizations.map(o => o.orgId).join(', ')}`);
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Your organization could not be found. Please try signing out and signing back in, or create a new workspace.',
          code: 'ORG_NOT_FOUND'
        },
        { status: 403 }
      ),
    };
  }

  // Check if user has access to the feature
  const featureAccess = await hasAIFeature(orgId, feature);
  if (!featureAccess.allowed) {
    // Determine the appropriate error code and message
    const isClusterIssue = featureAccess.requiredClusterTier !== undefined;
    const errorCode = isClusterIssue ? 'CLUSTER_UPGRADE_REQUIRED' : 'FEATURE_NOT_AVAILABLE';
    const errorMessage = featureAccess.reason ||
      (isClusterIssue
        ? `This feature requires an Atlas ${featureAccess.requiredClusterTier}+ cluster.`
        : `This AI feature is not available on your current plan. Please upgrade to access this feature.`);

    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: errorMessage,
          code: errorCode,
          requiredTier: featureAccess.requiredTier,
          requiredClusterTier: featureAccess.requiredClusterTier,
          currentClusterTier: featureAccess.currentClusterTier,
        },
        { status: 403 }
      ),
    };
  }

  // Check AI usage limits if requested
  if (checkUsageLimit) {
    const limitCheck = await checkAILimit(orgId, 'generations');
    if (!limitCheck.allowed) {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: `AI generation limit reached (${limitCheck.current}/${limitCheck.limit}). Please upgrade your plan for more generations.`,
            code: 'LIMIT_REACHED',
            usage: limitCheck,
          },
          { status: 429 }
        ),
      };
    }
  }

  return {
    success: true,
    context: {
      userId: session.userId,
      orgId,
    },
  };
}

/**
 * Validates an AI request with optional guest access.
 * Allows unauthenticated users limited queries per day.
 */
export async function validateAIRequestWithGuestAccess(
  feature: AIFeature,
  request: NextRequest,
  checkUsageLimit: boolean = true
): Promise<AIGuardResult> {
  // First try authenticated access
  const session = await getSession();

  if (session?.userId) {
    // User is logged in - use normal validation
    return validateAIRequest(feature, checkUsageLimit);
  }

  // Guest access - check IP-based limits
  const identifier = getGuestIdentifier(request);
  const guestLimit = checkGuestLimit(identifier);

  if (!guestLimit.allowed) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: `You've reached the daily limit for guest queries. Sign in for unlimited access.`,
          code: 'GUEST_LIMIT_REACHED',
          remaining: 0,
        },
        { status: 429 }
      ),
    };
  }

  return {
    success: true,
    context: {
      userId: 'guest',
      orgId: 'guest',
      isGuest: true,
    },
  };
}

/**
 * Record guest usage after successful query
 */
export function recordGuestUsage(request: NextRequest): void {
  const identifier = getGuestIdentifier(request);
  incrementGuestUsage(identifier);
}

/**
 * Increment AI usage after a successful operation.
 * Call this after the AI operation completes successfully.
 */
export async function recordAIUsage(orgId: string): Promise<void> {
  await incrementAIUsage(orgId, 'generations', 1);
}
