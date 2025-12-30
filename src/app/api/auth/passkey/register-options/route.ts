import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { getSession } from '@/lib/auth/session';
import { findUserById as findAuthUserById, storeChallenge } from '@/lib/auth/db';
import { findUserById as findPlatformUserById } from '@/lib/platform/users';
import crypto from 'crypto';

const RP_NAME = 'NetPad';
const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
const RP_ORIGIN = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    // User must be authenticated to register a passkey
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { success: false, message: 'You must be signed in to register a passkey' },
        { status: 401 }
      );
    }

    // The session now stores platform userId (user_xxx), we need to get the auth user
    // First, try to find the platform user to get the authId
    const platformUser = await findPlatformUserById(session.userId);

    let authUser;
    if (platformUser?.authId) {
      // New flow: get auth user via authId link
      authUser = await findAuthUserById(platformUser.authId);
    } else {
      // Fallback for legacy sessions: try using session.userId as auth _id
      authUser = await findAuthUserById(session.userId);
    }

    if (!authUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get existing passkey credential IDs to exclude
    const excludeCredentials = authUser.passkeys?.map((passkey) => ({
      id: passkey.id,
      transports: passkey.transports as ('usb' | 'nfc' | 'ble' | 'internal' | 'hybrid')[],
    })) || [];

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: new TextEncoder().encode(authUser._id),
      userName: authUser.email,
      userDisplayName: authUser.displayName || authUser.email.split('@')[0],
      attestationType: 'none', // We don't need attestation for most use cases
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform', // Prefer platform authenticators (Face ID, Touch ID)
      },
      timeout: 60000, // 1 minute
    });

    // Store challenge for verification
    const challengeId = crypto.randomUUID();
    await storeChallenge(challengeId, options.challenge, authUser._id);

    return NextResponse.json({
      success: true,
      options,
      challengeId,
    });
  } catch (error) {
    console.error('Error generating passkey registration options:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate registration options' },
      { status: 500 }
    );
  }
}
