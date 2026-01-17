import { NextRequest, NextResponse } from 'next/server';
import {
  findMagicLinkByToken,
  markMagicLinkUsed,
  findUserByEmail,
  createUser,
  updateUserLastLogin,
  addTrustedDevice,
} from '@/lib/auth/db';
import {
  createSession,
  generateDeviceFingerprint,
  setDeviceTrustCookie,
} from '@/lib/auth/session';
import { ensurePlatformUser } from '@/lib/platform/users';
import { TrustedDevice, DEVICE_TRUST_CONFIG } from '@/types/auth';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { token, trustDevice } = await req.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 400 }
      );
    }

    // Find and validate magic link
    const magicLink = await findMagicLinkByToken(token);

    if (!magicLink) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired link. Please request a new one.' },
        { status: 400 }
      );
    }

    // Mark as used immediately to prevent reuse
    await markMagicLinkUsed(token);

    // Find or create user
    let user = await findUserByEmail(magicLink.email);

    if (!user) {
      user = await createUser(magicLink.email);
    }

    // Update last login
    await updateUserLastLogin(user._id);

    // Handle device trust
    let deviceId: string | undefined;

    if (trustDevice) {
      const userAgent = req.headers.get('user-agent') || 'unknown';
      const acceptLanguage = req.headers.get('accept-language') || undefined;
      const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                        req.headers.get('x-real-ip') ||
                        undefined;

      const fingerprint = generateDeviceFingerprint(userAgent, acceptLanguage);
      deviceId = crypto.randomUUID();

      const trustedDevice: TrustedDevice = {
        id: deviceId,
        fingerprint,
        userAgent,
        ipAddress,
        createdAt: new Date(),
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + DEVICE_TRUST_CONFIG.expiresInDays * 24 * 60 * 60 * 1000),
      };

      await addTrustedDevice(user._id, trustedDevice);

      // Set device trust cookie
      const trustToken = crypto.randomBytes(32).toString('hex');
      await setDeviceTrustCookie(trustToken);
    }

    // Ensure platform user exists (creates one if needed, links auth user)
    const platformUser = await ensurePlatformUser(user._id, user.email, {
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    });

    // Create session with platform userId (not auth _id)
    console.log('[MagicLink] Creating session for user:', {
      platformUserId: platformUser.userId,
      email: user.email,
      deviceId,
      trustDevice,
      waitlistStatus: platformUser.waitlistStatus,
    });

    await createSession(platformUser.userId, user.email, {
      deviceId,
      trustDevice,
      waitlistStatus: platformUser.waitlistStatus,
    });

    console.log('[MagicLink] Session created successfully');

    // Return user data (without sensitive fields)
    const safeUser = {
      _id: user._id,
      userId: platformUser.userId,
      email: user.email,
      displayName: platformUser.displayName || user.displayName,
      avatarUrl: platformUser.avatarUrl || user.avatarUrl,
      hasPasskey: (user.passkeys?.length || 0) > 0,
      trustedDeviceCount: user.trustedDevices?.length || 0,
    };

    return NextResponse.json({
      success: true,
      user: safeUser,
      message: 'Successfully signed in',
    });
  } catch (error) {
    console.error('Error verifying magic link:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
