import { NextRequest, NextResponse } from 'next/server';
import { getSession, destroySession } from '@/lib/auth/session';
import { findUserById as findPlatformUserById } from '@/lib/platform/users';
import { getUsersCollection, getOrganizationsCollection } from '@/lib/platform/db';
import { getAuthDb } from '@/lib/auth/db';
import { deleteConsentRecord } from '@/lib/consent/db';
import { ObjectId } from 'mongodb';

/**
 * POST /api/user/data-deletion
 *
 * GDPR Article 17 - Right to Erasure ("Right to be Forgotten")
 * Request account and data deletion
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

    const { confirmEmail, reason } = await req.json();

    // Get platform user
    const platformUser = await findPlatformUserById(session.userId);
    if (!platformUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Verify email confirmation
    if (confirmEmail?.toLowerCase() !== platformUser.email.toLowerCase()) {
      return NextResponse.json(
        { success: false, message: 'Email confirmation does not match' },
        { status: 400 }
      );
    }

    // Check if user is owner of any organizations
    const userOrgs = platformUser.organizations || [];
    const ownedOrgs = userOrgs.filter(o => o.role === 'owner');

    if (ownedOrgs.length > 0) {
      const orgsCollection = await getOrganizationsCollection();
      const orgDetails = await orgsCollection
        .find({ orgId: { $in: ownedOrgs.map(o => o.orgId) } })
        .toArray();

      // Check if any org has other members
      const usersCollection = await getUsersCollection();
      for (const org of orgDetails) {
        const memberCount = await usersCollection.countDocuments({
          'organizations.orgId': org.orgId,
        });

        if (memberCount > 1) {
          return NextResponse.json({
            success: false,
            message: `You are the owner of organization "${org.name}" which has other members. Please transfer ownership or remove all members before deleting your account.`,
            blockedBy: {
              type: 'organization_ownership',
              orgId: org.orgId,
              orgName: org.name,
              memberCount,
            },
          }, { status: 400 });
        }
      }
    }

    // Log deletion request for audit
    console.log('[Data Deletion] Deletion requested:', {
      userId: platformUser.userId,
      email: platformUser.email,
      reason: reason || 'Not provided',
      timestamp: new Date().toISOString(),
    });

    // In a production system, you might:
    // 1. Schedule deletion for 30 days (grace period)
    // 2. Send confirmation email
    // 3. Allow cancellation within grace period
    // For this implementation, we'll perform immediate deletion

    try {
      // 1. Delete consent records
      await deleteConsentRecord(platformUser.userId);
      console.log('[Data Deletion] Consent records deleted');

      // 2. Delete from auth database
      if (platformUser.authId) {
        const authDb = await getAuthDb();
        await authDb.collection('users').deleteOne({
          _id: new ObjectId(platformUser.authId),
        });
        console.log('[Data Deletion] Auth user deleted');
      }

      // 3. Remove from organizations
      const usersCollection = await getUsersCollection();

      // 4. Delete owned organizations (only ones with no other members)
      const orgsCollection = await getOrganizationsCollection();
      for (const ownedOrg of ownedOrgs) {
        await orgsCollection.deleteOne({ orgId: ownedOrg.orgId });
        console.log('[Data Deletion] Organization deleted:', ownedOrg.orgId);
        // Note: In production, also delete the org's database
      }

      // 5. Delete platform user
      await usersCollection.deleteOne({ userId: platformUser.userId });
      console.log('[Data Deletion] Platform user deleted');

      // 6. Destroy session
      await destroySession();

      return NextResponse.json({
        success: true,
        message: 'Your account and data have been permanently deleted.',
        deletedAt: new Date().toISOString(),
        note: 'You have been logged out. Thank you for using NetPad.',
      });
    } catch (deleteError) {
      console.error('[Data Deletion] Error during deletion:', deleteError);
      return NextResponse.json(
        { success: false, message: 'An error occurred during deletion. Please contact support.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Data Deletion] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process deletion request' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/data-deletion
 *
 * Check deletion eligibility and requirements
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

    const platformUser = await findPlatformUserById(session.userId);
    if (!platformUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Check for blocking conditions
    const blockers: { type: string; message: string; details?: any }[] = [];

    // Check organization ownership
    const userOrgs = platformUser.organizations || [];
    const ownedOrgs = userOrgs.filter(o => o.role === 'owner');

    if (ownedOrgs.length > 0) {
      const orgsCollection = await getOrganizationsCollection();
      const usersCollection = await getUsersCollection();

      for (const org of ownedOrgs) {
        const orgDetails = await orgsCollection.findOne({ orgId: org.orgId });
        const memberCount = await usersCollection.countDocuments({
          'organizations.orgId': org.orgId,
        });

        if (memberCount > 1) {
          blockers.push({
            type: 'organization_ownership',
            message: `You own organization "${orgDetails?.name}" which has ${memberCount - 1} other member(s). Transfer ownership or remove members first.`,
            details: {
              orgId: org.orgId,
              orgName: orgDetails?.name,
              memberCount,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      canDelete: blockers.length === 0,
      email: platformUser.email,
      blockers,
      dataToBeDeleted: [
        'Account information (email, display name, avatar)',
        'Authentication data (passkeys, trusted devices)',
        'Organization memberships',
        'Owned organizations (if no other members)',
        'Cookie consent preferences',
        'Session data',
      ],
      dataRetained: [
        'Anonymized form submissions (if configured for retention)',
        'Audit logs (required for legal compliance)',
      ],
      instructions: blockers.length > 0
        ? 'Please resolve the issues above before requesting deletion.'
        : 'To confirm deletion, submit your email address. This action cannot be undone.',
    });
  } catch (error) {
    console.error('[Data Deletion] Check error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to check deletion eligibility' },
      { status: 500 }
    );
  }
}
