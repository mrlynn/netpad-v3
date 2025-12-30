import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { sendContactNotification } from '@/lib/auth/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, company, interest, message } = body;

    // Validate required fields
    if (!name || !email || !interest) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and interest are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Store the contact submission
    const db = await connectDB();
    const contactSubmission = {
      name,
      email,
      company: company || null,
      interest,
      message: message || null,
      submittedAt: new Date(),
      status: 'new',
      source: 'chat-widget',
    };

    const result = await db.collection('contact_submissions').insertOne(contactSubmission);

    console.log('[Contact API] New submission:', {
      id: result.insertedId,
      email,
      interest,
    });

    // Send email notification to michael@netpad.io
    const emailSent = await sendContactNotification({
      name,
      email,
      company: company || undefined,
      interest,
      message: message || undefined,
    });

    if (!emailSent) {
      console.warn('[Contact API] Email notification failed, but submission was saved');
    }

    return NextResponse.json({
      success: true,
      submissionId: result.insertedId.toString(),
    });
  } catch (error: any) {
    console.error('[Contact API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit contact form' },
      { status: 500 }
    );
  }
}
