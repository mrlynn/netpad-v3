/**
 * Admin Authentication
 *
 * Simple authentication system for admin interface.
 * Supports password-based authentication and API key authentication.
 */

import { cookies } from 'next/headers';
import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.VAULT_ENCRYPTION_KEY || 'default-secret-change-in-production';

/**
 * Session configuration
 */
const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// In-memory rate limiting (in production, use Redis or similar)
const loginAttempts = new Map<string, { count: number; lockedUntil?: number }>();

/**
 * Hash a password using SHA-256
 */
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Generate a session token
 */
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a session signature
 */
function createSessionSignature(token: string): string {
  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(token)
    .digest('hex');
}

/**
 * Verify session signature
 */
function verifySessionSignature(token: string, signature: string): boolean {
  const expectedSignature = createSessionSignature(token);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Check if login is rate limited
 */
function checkRateLimit(identifier: string): { allowed: boolean; lockedUntil?: number } {
  const attempts = loginAttempts.get(identifier);

  if (!attempts) {
    return { allowed: true };
  }

  // Check if locked
  if (attempts.lockedUntil && attempts.lockedUntil > Date.now()) {
    return {
      allowed: false,
      lockedUntil: attempts.lockedUntil,
    };
  }

  // Reset if lockout expired
  if (attempts.lockedUntil && attempts.lockedUntil <= Date.now()) {
    loginAttempts.delete(identifier);
    return { allowed: true };
  }

  // Check if max attempts reached
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    const lockedUntil = Date.now() + LOCKOUT_DURATION;
    attempts.lockedUntil = lockedUntil;
    return {
      allowed: false,
      lockedUntil,
    };
  }

  return { allowed: true };
}

/**
 * Record a failed login attempt
 */
function recordFailedAttempt(identifier: string): void {
  const attempts = loginAttempts.get(identifier) || { count: 0 };
  attempts.count += 1;
  loginAttempts.set(identifier, attempts);
}

/**
 * Clear login attempts (on successful login)
 */
function clearLoginAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
}

/**
 * Authenticate with password
 */
export async function authenticateWithPassword(
  password: string,
  ipAddress?: string
): Promise<{ success: boolean; error?: string; sessionToken?: string }> {
  // Check if admin password is configured
  if (!ADMIN_PASSWORD) {
    return {
      success: false,
      error: 'Admin authentication is not configured. Set ADMIN_PASSWORD environment variable.',
    };
  }

  const identifier = ipAddress || 'unknown';

  // Check rate limiting
  const rateLimit = checkRateLimit(identifier);
  if (!rateLimit.allowed) {
    const minutesLeft = Math.ceil((rateLimit.lockedUntil! - Date.now()) / 60000);
    return {
      success: false,
      error: `Too many failed login attempts. Please try again in ${minutesLeft} minute(s).`,
    };
  }

  // Verify password
  const hashedPassword = hashPassword(password);
  const expectedHash = hashPassword(ADMIN_PASSWORD);

  if (!crypto.timingSafeEqual(Buffer.from(hashedPassword), Buffer.from(expectedHash))) {
    recordFailedAttempt(identifier);
    return {
      success: false,
      error: 'Invalid password',
    };
  }

  // Clear failed attempts on success
  clearLoginAttempts(identifier);

  // Generate session token
  const sessionToken = generateSessionToken();
  const signature = createSessionSignature(sessionToken);

  // Store session in cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, `${sessionToken}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/admin',
  });

  return {
    success: true,
    sessionToken,
  };
}

/**
 * Authenticate with API key
 */
export async function authenticateWithApiKey(
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  if (!ADMIN_API_KEY) {
    return {
      success: false,
      error: 'API key authentication is not configured. Set ADMIN_API_KEY environment variable.',
    };
  }

  if (!crypto.timingSafeEqual(Buffer.from(apiKey), Buffer.from(ADMIN_API_KEY))) {
    return {
      success: false,
      error: 'Invalid API key',
    };
  }

  return {
    success: true,
  };
}

/**
 * Get current session from cookie
 */
export async function getSession(): Promise<{ authenticated: boolean; error?: string }> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie) {
    return { authenticated: false };
  }

  const [token, signature] = sessionCookie.value.split('.');

  if (!token || !signature) {
    return { authenticated: false, error: 'Invalid session format' };
  }

  if (!verifySessionSignature(token, signature)) {
    return { authenticated: false, error: 'Invalid session signature' };
  }

  return { authenticated: true };
}

/**
 * Require authentication (middleware helper)
 */
export async function requireAuth(): Promise<{ authenticated: boolean; error?: string }> {
  const session = await getSession();

  if (!session.authenticated) {
    return {
      authenticated: false,
      error: 'Authentication required',
    };
  }

  return { authenticated: true };
}

/**
 * Logout (clear session)
 */
export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Check if authentication is configured
 */
export function isAuthConfigured(): boolean {
  return !!(ADMIN_PASSWORD || ADMIN_API_KEY);
}
