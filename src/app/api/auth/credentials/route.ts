/**
 * Credentials Login API Route
 *
 * SECURITY: This endpoint is ONLY available in development/test environments.
 * It provides email/password authentication for Playwright automation and local testing.
 *
 * In production, this endpoint returns 404 to prevent any credential-based attacks.
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUsersCollection } from '@/lib/platform/db';
import { createSession } from '@/lib/auth/session';
import { nanoid } from 'nanoid';
import { PlatformUser } from '@/types/platform';

// Only allow in development or test environments
const IS_TEST_ENV = process.env.NODE_ENV === 'development' ||
                    process.env.NODE_ENV === 'test' ||
                    process.env.ENABLE_TEST_AUTH === 'true';

export async function POST(req: NextRequest) {
  // Strict environment check - return 404 in production
  if (!IS_TEST_ENV) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const { email, password, createIfNotExists } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const usersCollection = await getUsersCollection();
    let user: PlatformUser | null = await usersCollection.findOne({ email: email.toLowerCase() });

    if (!user) {
      // In test mode, optionally create user if they don't exist
      if (createIfNotExists) {
        const passwordHash = await bcrypt.hash(password, 10);
        const userId = `user_${nanoid(12)}`;

        const newUser: Omit<PlatformUser, '_id'> = {
          userId,
          email: email.toLowerCase(),
          emailVerified: true, // Auto-verify for test users
          passwordHash,
          organizations: [],
          oauthConnections: [],
          passkeys: [],
          trustedDevices: [],
          waitlistStatus: 'pending', // Test users also start as pending
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await usersCollection.insertOne(newUser as PlatformUser);
        user = { ...newUser, _id: result.insertedId } as PlatformUser;

        console.log(`[Test Auth] Created test user: ${email}`);
      } else {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }
    }

    // At this point, user is guaranteed to exist
    // Verify password
    if (user.passwordHash) {
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }
    } else if (!createIfNotExists) {
      // User exists but has no password - they use magic link/passkey/OAuth
      return NextResponse.json(
        { error: 'This account does not support password login' },
        { status: 401 }
      );
    } else {
      // Set password for existing user (test mode only)
      const passwordHash = await bcrypt.hash(password, 10);
      await usersCollection.updateOne(
        { userId: user.userId },
        { $set: { passwordHash, updatedAt: new Date() } }
      );
      console.log(`[Test Auth] Set password for existing user: ${email}`);
    }

    // Update last login
    await usersCollection.updateOne(
      { userId: user.userId },
      { $set: { lastLoginAt: new Date() } }
    );

    // Create session with waitlist status
    await createSession(user.userId, user.email, {
      waitlistStatus: user.waitlistStatus,
    });

    return NextResponse.json({
      success: true,
      user: {
        userId: user.userId,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    console.error('[Credentials Auth] Error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check if credentials auth is available
 */
export async function GET() {
  return NextResponse.json({
    available: IS_TEST_ENV,
    environment: process.env.NODE_ENV,
  });
}
