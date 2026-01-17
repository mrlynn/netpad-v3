import { NextRequest, NextResponse } from 'next/server';
import { signupForWaitlist, getUserWaitlistStatus } from '@/lib/platform/waitlist';
import { sendWaitlistConfirmationEmail } from '@/lib/auth/waitlist-emails';
import { getRateLimitsCollection } from '@/lib/platform/db';

// Rate limit: 5 signups per hour per email, 10 per hour per IP
const RATE_LIMIT_EMAIL = 5;
const RATE_LIMIT_IP = 10;
const RATE_WINDOW_HOURS = 1;

async function checkRateLimit(key: string, limit: number): Promise<boolean> {
  const collection = await getRateLimitsCollection();
  const windowStart = new Date(Date.now() - RATE_WINDOW_HOURS * 60 * 60 * 1000);

  const entry = await collection.findOne({
    key,
    resource: 'waitlist_signup',
    windowStart: { $gte: windowStart },
  });

  if (entry && entry.count >= limit) {
    return false;
  }

  // Update or create rate limit entry
  await collection.updateOne(
    { key, resource: 'waitlist_signup' },
    {
      $inc: { count: 1 },
      $setOnInsert: { windowStart: new Date() },
      $set: { expiresAt: new Date(Date.now() + RATE_WINDOW_HOURS * 60 * 60 * 1000) },
    },
    { upsert: true }
  );

  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      name,
      company,
      useCase,
      source,
      referralCode,
      // Extended fields
      howDidYouHear,
      howDidYouHearOther,
      role,
      teamSize,
      timeline,
      interests,
      currentTools,
      biggestChallenge,
    } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Get IP for rate limiting
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      'unknown';

    // Check rate limits
    const emailAllowed = await checkRateLimit(`email:${email.toLowerCase()}`, RATE_LIMIT_EMAIL);
    if (!emailAllowed) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const ipAllowed = await checkRateLimit(`ip:${ipAddress}`, RATE_LIMIT_IP);
    if (!ipAllowed) {
      return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Check if user is already on waitlist or approved
    const existingStatus = await getUserWaitlistStatus(email);
    if (existingStatus) {
      if (existingStatus === 'approved') {
        return NextResponse.json({
          success: true,
          message: 'You already have access! Please log in.',
          alreadyApproved: true,
        });
      }
      if (existingStatus === 'pending') {
        return NextResponse.json({
          success: true,
          message: "You're already on the waitlist! We'll notify you when approved.",
          alreadySignedUp: true,
        });
      }
      if (existingStatus === 'rejected') {
        return NextResponse.json(
          { success: false, message: 'Your application was not approved. Please contact support.' },
          { status: 403 }
        );
      }
    }

    // Sign up for waitlist
    const { user, isNew } = await signupForWaitlist({
      email,
      displayName: name,
      company,
      useCase,
      source: source || 'direct',
      referralCode,
      // Extended fields
      howDidYouHear,
      howDidYouHearOther,
      role,
      teamSize,
      timeline,
      interests,
      currentTools,
      biggestChallenge,
    });

    // Send confirmation email for new signups
    if (isNew) {
      await sendWaitlistConfirmationEmail(user.email, user.displayName);
    }

    return NextResponse.json({
      success: true,
      message: isNew
        ? "You're on the waitlist! We'll email you when your access is approved."
        : "You're already on the waitlist! We'll notify you when approved.",
      alreadySignedUp: !isNew,
    });
  } catch (error) {
    console.error('[Waitlist Signup] Error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
