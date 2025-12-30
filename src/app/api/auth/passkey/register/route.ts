import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { getSession } from '@/lib/auth/session';
import { findUserById as findAuthUserById, getAndDeleteChallenge, addPasskeyToUser } from '@/lib/auth/db';
import { findUserById as findPlatformUserById } from '@/lib/platform/users';
import { sendPasskeyRegisteredEmail } from '@/lib/auth/email';
import { PasskeyCredential } from '@/types/auth';

const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
const RP_ORIGIN = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { success: false, message: 'You must be signed in to register a passkey' },
        { status: 401 }
      );
    }

    const { challengeId, credential, friendlyName } = await req.json();

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

    // Verify the registration response
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: RP_ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { success: false, message: 'Passkey verification failed' },
        { status: 400 }
      );
    }

    const { registrationInfo } = verification;

    console.log('[Passkey Register] Registration info credential ID type:', typeof registrationInfo.credential.id);
    console.log('[Passkey Register] Registration info credential ID:', registrationInfo.credential.id);

    // Determine device type for friendly name
    const userAgent = req.headers.get('user-agent') || '';
    let deviceType = 'Unknown Device';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      deviceType = 'iPhone/iPad';
    } else if (userAgent.includes('Mac')) {
      deviceType = 'Mac';
    } else if (userAgent.includes('Windows')) {
      deviceType = 'Windows PC';
    } else if (userAgent.includes('Android')) {
      deviceType = 'Android';
    } else if (userAgent.includes('Linux')) {
      deviceType = 'Linux';
    }

    // Create passkey credential record
    // In simplewebauthn v13+, credential.id is already a base64url string
    const credentialIdString = typeof registrationInfo.credential.id === 'string'
      ? registrationInfo.credential.id
      : Buffer.from(registrationInfo.credential.id).toString('base64url');

    console.log('[Passkey Register] Storing credential ID:', credentialIdString);

    const passkeyCredential: PasskeyCredential = {
      id: credentialIdString,
      publicKey: typeof registrationInfo.credential.publicKey === 'string'
        ? registrationInfo.credential.publicKey
        : Buffer.from(registrationInfo.credential.publicKey).toString('base64url'),
      counter: registrationInfo.credential.counter,
      deviceType,
      backedUp: registrationInfo.credentialBackedUp,
      transports: credential.response.transports,
      createdAt: new Date(),
      friendlyName: friendlyName || `${deviceType} Passkey`,
    };

    // Save to database
    await addPasskeyToUser(authUser._id, passkeyCredential);

    // Send notification email
    await sendPasskeyRegisteredEmail(authUser.email, passkeyCredential.friendlyName || deviceType);

    return NextResponse.json({
      success: true,
      message: 'Passkey registered successfully',
      passkey: {
        id: passkeyCredential.id,
        deviceType: passkeyCredential.deviceType,
        friendlyName: passkeyCredential.friendlyName,
        createdAt: passkeyCredential.createdAt,
      },
    });
  } catch (error) {
    console.error('Error registering passkey:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to register passkey' },
      { status: 500 }
    );
  }
}
