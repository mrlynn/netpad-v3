import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import {
  findUserByPasskeyId,
  getAndDeleteChallenge,
  updatePasskeyCounter,
  updateUserLastLogin,
} from '@/lib/auth/db';
import { createSession } from '@/lib/auth/session';
import { ensurePlatformUser } from '@/lib/platform/users';

const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
const RP_ORIGIN = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const { challengeId, credential } = await req.json();

    if (!challengeId || !credential) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get and delete the challenge (one-time use)
    const expectedChallenge = await getAndDeleteChallenge(challengeId);

    if (!expectedChallenge) {
      return NextResponse.json(
        { success: false, message: 'Challenge expired or invalid' },
        { status: 400 }
      );
    }

    // Find user by credential ID
    const credentialId = credential.id;
    console.log('[Passkey Login] Looking up credential ID:', credentialId);
    console.log('[Passkey Login] Credential ID type:', typeof credentialId);
    console.log('[Passkey Login] Credential ID length:', credentialId?.length);

    const user = await findUserByPasskeyId(credentialId);

    if (!user) {
      console.log('[Passkey Login] No user found for credential ID:', credentialId);
      return NextResponse.json(
        { success: false, message: 'Passkey not recognized' },
        { status: 401 }
      );
    }

    console.log('[Passkey Login] Found user:', user.email);
    console.log('[Passkey Login] User passkeys:', user.passkeys?.map(p => ({ id: p.id, idLength: p.id?.length })));

    // Find the matching passkey
    const passkey = user.passkeys?.find((p) => p.id === credentialId);

    if (!passkey) {
      return NextResponse.json(
        { success: false, message: 'Passkey not found' },
        { status: 401 }
      );
    }

    // Verify the authentication response
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: RP_ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: passkey.id,
        publicKey: Buffer.from(passkey.publicKey, 'base64url'),
        counter: passkey.counter,
        transports: passkey.transports,
      },
    });

    if (!verification.verified) {
      return NextResponse.json(
        { success: false, message: 'Passkey verification failed' },
        { status: 401 }
      );
    }

    // Update counter to prevent replay attacks
    await updatePasskeyCounter(
      user._id,
      credentialId,
      verification.authenticationInfo.newCounter
    );

    // Update last login
    await updateUserLastLogin(user._id);

    // Ensure platform user exists (creates one if needed, links auth user)
    const platformUser = await ensurePlatformUser(user._id, user.email, {
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    });

    // Create session with platform userId (not auth _id)
    await createSession(platformUser.userId, user.email, {
      isPasskeyAuth: true,
    });

    // Return user data
    const safeUser = {
      _id: user._id,
      userId: platformUser.userId,
      email: user.email,
      displayName: platformUser.displayName || user.displayName,
      avatarUrl: platformUser.avatarUrl || user.avatarUrl,
      hasPasskey: true,
      trustedDeviceCount: user.trustedDevices?.length || 0,
    };

    return NextResponse.json({
      success: true,
      user: safeUser,
      message: 'Successfully signed in with passkey',
    });
  } catch (error) {
    console.error('Error verifying passkey login:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to verify passkey' },
      { status: 500 }
    );
  }
}
