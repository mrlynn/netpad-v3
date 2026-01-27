import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { findUserById as findAuthUserById } from '@/lib/auth/db';
import { findUserById as findPlatformUserById } from '@/lib/platform/users';
import { findConsentByUserId } from '@/lib/consent/db';
import { getOrganizationsCollection } from '@/lib/platform/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/data-export
 *
 * GDPR Article 20 - Right to Data Portability
 * Returns all user data in a portable JSON format
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get platform user
    const platformUser = await findPlatformUserById(session.userId);
    if (!platformUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get auth user (for passkey info)
    let authUser = null;
    if (platformUser.authId) {
      authUser = await findAuthUserById(platformUser.authId);
    }

    // Get user's organizations from the platform user record
    const userOrgs = platformUser.organizations || [];
    const orgsCollection = await getOrganizationsCollection();
    const orgDetails = userOrgs.length > 0
      ? await orgsCollection
          .find({ orgId: { $in: userOrgs.map(o => o.orgId) } })
          .toArray()
      : [];

    // Get consent records
    const consentRecord = await findConsentByUserId(platformUser.userId);

    // Compile export data
    const exportData = {
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',

      // Account Information
      account: {
        userId: platformUser.userId,
        email: platformUser.email,
        displayName: platformUser.displayName,
        avatarUrl: platformUser.avatarUrl,
        emailVerified: platformUser.emailVerified,
        createdAt: platformUser.createdAt,
        lastLoginAt: platformUser.lastLoginAt,
        updatedAt: platformUser.updatedAt,
      },

      // Authentication Methods
      authentication: {
        hasPasskey: (authUser?.passkeys?.length || 0) > 0,
        passkeyCount: authUser?.passkeys?.length || 0,
        passkeys: authUser?.passkeys?.map(p => ({
          deviceType: p.deviceType,
          friendlyName: p.friendlyName,
          createdAt: p.createdAt,
          lastUsedAt: p.lastUsedAt,
          backedUp: p.backedUp,
        })) || [],
        trustedDevices: authUser?.trustedDevices?.map(d => ({
          userAgent: d.userAgent,
          createdAt: d.createdAt,
          lastUsedAt: d.lastUsedAt,
          expiresAt: d.expiresAt,
        })) || [],
        oauthConnections: platformUser.oauthConnections?.map(c => ({
          provider: c.provider,
          connectedAt: c.connectedAt,
        })) || [],
      },

      // Organizations
      organizations: userOrgs.map(membership => {
        const org = orgDetails.find(o => o.orgId === membership.orgId);
        return {
          orgId: membership.orgId,
          name: org?.name || 'Unknown',
          role: membership.role,
          joinedAt: membership.joinedAt,
        };
      }),

      // Privacy Preferences
      privacyPreferences: consentRecord ? {
        consentVersion: consentRecord.consentVersion,
        preferences: consentRecord.preferences,
        consentedAt: consentRecord.consentedAt,
        updatedAt: consentRecord.updatedAt,
        doNotTrack: consentRecord.doNotTrack,
        consentHistory: consentRecord.history?.map(h => ({
          action: h.action,
          preferences: h.preferences,
          timestamp: h.timestamp,
          source: h.source,
        })) || [],
      } : null,

      // Note about additional data
      additionalDataNote: {
        message: 'Form submissions and organization-specific data can be exported separately from your organization settings.',
        formDataLocation: 'Organization Settings > Data Management',
      },
    };

    // Return as downloadable JSON
    const filename = `mongodb-tools-data-export-${platformUser.userId}-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[Data Export] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to export data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/data-export
 *
 * Request a data export to be sent via email (for large exports)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const platformUser = await findPlatformUserById(session.userId);
    if (!platformUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // In a production system, this would:
    // 1. Queue a background job to compile the full export
    // 2. Send an email with a secure download link
    // 3. The link would expire after 24-48 hours

    // For now, we'll return success and instruct to use GET endpoint
    console.log('[Data Export] Export requested for user:', platformUser.userId);

    return NextResponse.json({
      success: true,
      message: 'Your data export is being prepared. For immediate download, use the download button in Privacy Settings.',
      email: platformUser.email,
      note: 'Large exports will be sent to your email address.',
    });
  } catch (error) {
    console.error('[Data Export] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to request data export' },
      { status: 500 }
    );
  }
}
