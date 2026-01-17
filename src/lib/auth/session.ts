import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export interface SessionData {
  userId?: string;
  email?: string;
  deviceId?: string;
  isPasskeyAuth?: boolean;
  deviceTrustToken?: string;
  createdAt?: number;
  waitlistStatus?: 'pending' | 'approved' | 'rejected';
}

const SESSION_OPTIONS = {
  cookieName: 'mdb_tools_session',
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_iron_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

// For App Router API routes
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, SESSION_OPTIONS);
}

// For middleware/edge runtime
export async function getSessionFromRequest(
  req: NextRequest
): Promise<IronSession<SessionData>> {
  const res = NextResponse.next();
  return getIronSession<SessionData>(req, res, SESSION_OPTIONS);
}

// Create a new session
export async function createSession(
  userId: string,
  email: string,
  options?: {
    isPasskeyAuth?: boolean;
    deviceId?: string;
    trustDevice?: boolean;
    waitlistStatus?: 'pending' | 'approved' | 'rejected';
  }
): Promise<void> {
  const session = await getSession();

  session.userId = userId;
  session.email = email;
  session.createdAt = Date.now();

  if (options?.isPasskeyAuth) {
    session.isPasskeyAuth = true;
  }

  if (options?.deviceId) {
    session.deviceId = options.deviceId;
  }

  if (options?.trustDevice) {
    session.deviceTrustToken = crypto.randomBytes(32).toString('hex');
  }

  if (options?.waitlistStatus) {
    session.waitlistStatus = options.waitlistStatus;
  }

  await session.save();
}

// Destroy session
export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

// Check if session is valid
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session.userId;
}

// Get current user from session
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session.userId || null;
}

// Device fingerprinting helpers
export function generateDeviceFingerprint(
  userAgent: string,
  acceptLanguage?: string,
  ip?: string
): string {
  // Create a fingerprint from available data
  // In production, you'd want more sophisticated fingerprinting
  const data = [
    userAgent,
    acceptLanguage || '',
    // Don't include IP in fingerprint as it can change
  ].join('|');

  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

// Device trust token cookie
const DEVICE_TRUST_COOKIE = 'mdb_device_trust';
const DEVICE_TRUST_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function setDeviceTrustCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(DEVICE_TRUST_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: DEVICE_TRUST_MAX_AGE,
    path: '/',
  });
}

export async function getDeviceTrustCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(DEVICE_TRUST_COOKIE);
  return cookie?.value || null;
}

export async function clearDeviceTrustCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DEVICE_TRUST_COOKIE);
}
