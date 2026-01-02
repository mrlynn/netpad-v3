/**
 * Atlas User Invitation Service
 *
 * Handles inviting netpad users to their Atlas projects
 * so they can access the MongoDB Atlas console directly.
 *
 * When a user accepts the invitation, they can:
 * - Log into cloud.mongodb.com
 * - View their project's cluster, metrics, and logs
 * - Access the Data Explorer to read/write data
 * - They CANNOT see other projects in the organization
 */

import { getAtlasClient } from './client';
import { AtlasProjectRole } from './types';
import { getAtlasInvitationsCollection } from '../platform/db';
import { generateSecureId } from '../encryption';
import { AtlasInvitationRecord, AtlasInvitationStatus } from '@/types/platform';

const ATLAS_ORG_ID = process.env.ATLAS_ORG_ID || '';

// ============================================
// Types
// ============================================

export interface InviteUserToAtlasOptions {
  organizationId: string;      // Our netpad org ID
  atlasProjectId: string;      // Atlas project ID (from provisioned cluster)
  email: string;               // User's email address
  userId?: string;             // Our user ID if known
  role?: AtlasProjectRole;     // Default: GROUP_DATA_ACCESS_READ_WRITE
}

export interface AtlasInviteResult {
  success: boolean;
  invitationId?: string;
  atlasInvitationId?: string;
  error?: string;
  alreadyPending?: boolean;
}

// ============================================
// Main Functions
// ============================================

/**
 * Invite a user to access their Atlas project via the Atlas console
 *
 * This sends an email from MongoDB Atlas to the user.
 * Once they accept, they can log into cloud.mongodb.com and see their project.
 */
export async function inviteUserToAtlasProject(
  options: InviteUserToAtlasOptions
): Promise<AtlasInviteResult> {
  const {
    organizationId,
    atlasProjectId,
    email,
    userId,
    role = 'GROUP_DATA_ACCESS_READ_WRITE',
  } = options;

  console.log(`[AtlasInvite] Inviting ${email} to project ${atlasProjectId}`);

  const client = getAtlasClient();

  // Check Atlas API configuration
  if (!client.isConfigured()) {
    console.warn('[AtlasInvite] Atlas API not configured');
    return { success: false, error: 'Atlas API not configured' };
  }

  if (!ATLAS_ORG_ID) {
    console.warn('[AtlasInvite] ATLAS_ORG_ID not set');
    return { success: false, error: 'Atlas organization ID not configured' };
  }

  const collection = await getAtlasInvitationsCollection();
  const normalizedEmail = email.toLowerCase();

  // Check for existing pending invitation
  const existing = await collection.findOne({
    organizationId,
    email: normalizedEmail,
    status: 'pending',
  });

  if (existing) {
    console.log(`[AtlasInvite] Invitation already pending for ${email}`);
    return {
      success: true,
      invitationId: existing.invitationId,
      atlasInvitationId: existing.atlasInvitationId,
      alreadyPending: true,
    };
  }

  // Send invitation via Atlas API
  const result = await client.inviteUserToProject(
    ATLAS_ORG_ID,
    email,
    atlasProjectId,
    [role]
  );

  if (!result.success || !result.data) {
    console.error('[AtlasInvite] Failed to create Atlas invitation:', result.error);
    return {
      success: false,
      error: result.error?.detail || 'Failed to create Atlas invitation',
    };
  }

  // Store tracking record
  const invitationId = generateSecureId('atlasinv');
  const record: AtlasInvitationRecord = {
    invitationId,
    atlasInvitationId: result.data.id,
    organizationId,
    atlasProjectId,
    userId,
    email: normalizedEmail,
    atlasRole: role,
    status: 'pending',
    createdAt: new Date(),
    expiresAt: new Date(result.data.expiresAt),
    lastCheckedAt: new Date(),
  };

  await collection.insertOne(record);

  console.log(`[AtlasInvite] Successfully invited ${email} to Atlas project`);
  console.log(`[AtlasInvite] User will receive an email from MongoDB Atlas`);

  return {
    success: true,
    invitationId,
    atlasInvitationId: result.data.id,
  };
}

/**
 * Get the Atlas invitation status for a user in an organization
 */
export async function getAtlasInvitationStatus(
  organizationId: string,
  email: string
): Promise<AtlasInvitationRecord | null> {
  const collection = await getAtlasInvitationsCollection();
  return collection.findOne(
    {
      organizationId,
      email: email.toLowerCase(),
    },
    { sort: { createdAt: -1 } }
  );
}

/**
 * Get all Atlas invitations for an organization
 */
export async function getAtlasInvitationsForOrg(
  organizationId: string
): Promise<AtlasInvitationRecord[]> {
  const collection = await getAtlasInvitationsCollection();
  return collection
    .find({ organizationId })
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * Get Atlas invitation by our internal ID
 */
export async function getAtlasInvitationById(
  invitationId: string
): Promise<AtlasInvitationRecord | null> {
  const collection = await getAtlasInvitationsCollection();
  return collection.findOne({ invitationId });
}

/**
 * Update the status of an Atlas invitation
 */
export async function updateAtlasInvitationStatus(
  invitationId: string,
  status: AtlasInvitationStatus,
  updates: Partial<AtlasInvitationRecord> = {}
): Promise<void> {
  const collection = await getAtlasInvitationsCollection();
  await collection.updateOne(
    { invitationId },
    {
      $set: {
        status,
        lastCheckedAt: new Date(),
        ...updates,
      },
    }
  );
}

/**
 * Sync invitation status with Atlas API
 *
 * This checks if the invitation has been accepted or expired.
 * Can be called periodically or on-demand.
 */
export async function syncAtlasInvitationStatus(
  invitationId: string
): Promise<{ status: AtlasInvitationStatus; changed: boolean }> {
  const invitation = await getAtlasInvitationById(invitationId);
  if (!invitation) {
    return { status: 'cancelled', changed: false };
  }

  // If already in a terminal state, no need to check
  if (invitation.status !== 'pending') {
    return { status: invitation.status, changed: false };
  }

  const client = getAtlasClient();
  if (!client.isConfigured() || !ATLAS_ORG_ID) {
    return { status: invitation.status, changed: false };
  }

  // Check with Atlas API
  const result = await client.getOrgInvitation(
    ATLAS_ORG_ID,
    invitation.atlasInvitationId
  );

  // If invitation not found, it was either accepted or deleted
  if (!result.success) {
    // Check if it's a 404 (invitation consumed/accepted)
    if (result.error?.error === 404) {
      await updateAtlasInvitationStatus(invitationId, 'accepted', {
        acceptedAt: new Date(),
      });
      return { status: 'accepted', changed: true };
    }
    // Other error - keep current status
    return { status: invitation.status, changed: false };
  }

  // Check expiration
  const expiresAt = new Date(result.data!.expiresAt);
  if (expiresAt < new Date()) {
    await updateAtlasInvitationStatus(invitationId, 'expired');
    return { status: 'expired', changed: true };
  }

  // Still pending - update lastCheckedAt
  await updateAtlasInvitationStatus(invitationId, 'pending');
  return { status: 'pending', changed: false };
}

/**
 * Cancel a pending Atlas invitation
 */
export async function cancelAtlasInvitation(
  invitationId: string
): Promise<{ success: boolean; error?: string }> {
  const invitation = await getAtlasInvitationById(invitationId);
  if (!invitation) {
    return { success: false, error: 'Invitation not found' };
  }

  if (invitation.status !== 'pending') {
    return { success: false, error: `Cannot cancel invitation with status: ${invitation.status}` };
  }

  const client = getAtlasClient();
  if (!client.isConfigured() || !ATLAS_ORG_ID) {
    return { success: false, error: 'Atlas API not configured' };
  }

  // Delete from Atlas
  const result = await client.deleteOrgInvitation(
    ATLAS_ORG_ID,
    invitation.atlasInvitationId
  );

  if (!result.success && result.error?.error !== 404) {
    return { success: false, error: result.error?.detail || 'Failed to cancel invitation' };
  }

  // Update our record
  await updateAtlasInvitationStatus(invitationId, 'cancelled');

  console.log(`[AtlasInvite] Cancelled invitation ${invitationId}`);
  return { success: true };
}

/**
 * Resend an Atlas invitation (cancel old one and create new)
 */
export async function resendAtlasInvitation(
  invitationId: string
): Promise<AtlasInviteResult> {
  const invitation = await getAtlasInvitationById(invitationId);
  if (!invitation) {
    return { success: false, error: 'Invitation not found' };
  }

  // Cancel the old invitation if it's still pending
  if (invitation.status === 'pending') {
    await cancelAtlasInvitation(invitationId);
  }

  // Create a new invitation
  return inviteUserToAtlasProject({
    organizationId: invitation.organizationId,
    atlasProjectId: invitation.atlasProjectId,
    email: invitation.email,
    userId: invitation.userId,
    role: invitation.atlasRole as AtlasProjectRole,
  });
}

/**
 * Build the Atlas console URL for a project
 */
export function getAtlasConsoleUrl(atlasProjectId: string): string {
  return `https://cloud.mongodb.com/v2/${atlasProjectId}`;
}
