import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  saveConsent,
  findConsentByVisitorId,
  findConsentByUserId,
  generateVisitorId,
  hashIpAddress,
} from '@/lib/consent/db';
import { SaveConsentRequest } from '@/types/consent';

export const dynamic = 'force-dynamic';

// GET - Retrieve current consent preferences
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const visitorId = req.cookies.get('mdb_visitor_id')?.value;

    if (!visitorId && !session.userId) {
      return NextResponse.json({
        success: true,
        hasConsent: false,
        preferences: null,
      });
    }

    // Try to find consent by user ID first, then visitor ID
    let consent = null;
    if (session.userId) {
      consent = await findConsentByUserId(session.userId);
    }
    if (!consent && visitorId) {
      consent = await findConsentByVisitorId(visitorId);
    }

    if (!consent) {
      return NextResponse.json({
        success: true,
        hasConsent: false,
        preferences: null,
      });
    }

    return NextResponse.json({
      success: true,
      hasConsent: true,
      preferences: consent.preferences,
      consentedAt: consent.consentedAt,
      consentVersion: consent.consentVersion,
    });
  } catch (error) {
    console.error('[Consent API] Error getting consent:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve consent' },
      { status: 500 }
    );
  }
}

// POST - Save consent preferences
export async function POST(req: NextRequest) {
  try {
    const body: SaveConsentRequest & { visitorId?: string } = await req.json();
    const { preferences, source, visitorId: clientVisitorId } = body;

    if (!preferences) {
      return NextResponse.json(
        { success: false, message: 'Missing preferences' },
        { status: 400 }
      );
    }

    // Get session for user ID (if logged in)
    const session = await getSession();

    // Get or generate visitor ID
    let visitorId = clientVisitorId || req.cookies.get('mdb_visitor_id')?.value;
    if (!visitorId) {
      const userAgent = req.headers.get('user-agent') || '';
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                 req.headers.get('x-real-ip') ||
                 undefined;
      visitorId = generateVisitorId(userAgent, ip);
    }

    // Get IP and user agent for audit
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                      req.headers.get('x-real-ip') ||
                      undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    // Detect Do Not Track
    const dnt = req.headers.get('dnt') === '1' ||
                req.headers.get('sec-gpc') === '1';

    // Try to detect geo location from headers (set by CDN/proxy)
    const geoLocation = {
      country: req.headers.get('cf-ipcountry') || // Cloudflare
               req.headers.get('x-vercel-ip-country') || // Vercel
               undefined,
      region: req.headers.get('x-vercel-ip-country-region') || undefined,
    };

    // Save consent
    const consent = await saveConsent(visitorId, preferences, {
      userId: session.userId,
      source: source || 'api',
      ipAddress,
      userAgent,
      geoLocation: geoLocation.country ? geoLocation : undefined,
      doNotTrack: dnt,
    });

    console.log('[Consent API] Saved consent:', {
      visitorId: visitorId.substring(0, 8) + '...',
      userId: session.userId?.substring(0, 8),
      preferences,
      source,
    });

    // Create response with visitor ID cookie
    const response = NextResponse.json({
      success: true,
      preferences: consent.preferences,
      consentedAt: consent.consentedAt,
    });

    // Set visitor ID cookie if not present
    if (!req.cookies.get('mdb_visitor_id')) {
      response.cookies.set('mdb_visitor_id', visitorId, {
        httpOnly: false, // Needs to be accessible by client JS
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 365 * 24 * 60 * 60, // 1 year
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('[Consent API] Error saving consent:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save consent' },
      { status: 500 }
    );
  }
}

// DELETE - Withdraw all consent (GDPR right to withdraw)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    const visitorId = req.cookies.get('mdb_visitor_id')?.value;

    if (!visitorId && !session.userId) {
      return NextResponse.json(
        { success: false, message: 'No consent record found' },
        { status: 404 }
      );
    }

    // Save with all non-essential cookies rejected
    const consent = await saveConsent(
      visitorId || 'unknown',
      {
        functional: false,
        analytics: false,
        marketing: false,
      },
      {
        userId: session.userId,
        source: 'api',
      }
    );

    console.log('[Consent API] Consent withdrawn:', {
      visitorId: visitorId?.substring(0, 8),
      userId: session.userId?.substring(0, 8),
    });

    return NextResponse.json({
      success: true,
      message: 'Consent withdrawn successfully',
      preferences: consent.preferences,
    });
  } catch (error) {
    console.error('[Consent API] Error withdrawing consent:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to withdraw consent' },
      { status: 500 }
    );
  }
}
