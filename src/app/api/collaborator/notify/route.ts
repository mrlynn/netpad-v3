/**
 * Collaborator Notification API
 *
 * Sends email notification when someone submits the collaborator form.
 * This is separate from form submission to keep concerns separated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendCollaboratorNotification } from '@/lib/auth/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('[Collaborator Notify] Received request:', {
      hasName: !!body.name,
      hasEmail: !!body.email,
      hasLane: !!body.lane,
      hasShipped: !!body.shipped,
      hasWhyNetpad: !!body.whyNetpad,
      body: JSON.stringify(body).substring(0, 500),
    });

    // Validate required fields - at minimum need name and email
    const { name, email } = body;

    if (!name || !email) {
      console.error('[Collaborator Notify] Missing required fields:', { name, email });
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, email',
        },
        { status: 400 }
      );
    }

    // Use defaults for optional fields that might be missing
    const lane = body.lane || 'undecided';
    const shipped = body.shipped || '(Not provided during conversation)';
    const whyNetpad = body.whyNetpad || '(Not provided during conversation)';

    // Send notification
    const sent = await sendCollaboratorNotification({
      name,
      email,
      lane,
      shipped,
      whyNetpad,
      availability: body.availability,
      location: body.location,
      workLinks: body.workLinks,
      conversationId: body.conversationId,
      turnCount: body.turnCount,
    });

    if (!sent) {
      console.error('[Collaborator Notify] Failed to send email notification');
      // Don't fail the request - email is secondary to the form submission
      return NextResponse.json({
        success: true,
        emailSent: false,
        message: 'Notification queued but may not have been sent',
      });
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      message: 'Notification sent successfully',
    });
  } catch (error) {
    console.error('[Collaborator Notify] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send notification',
      },
      { status: 500 }
    );
  }
}
