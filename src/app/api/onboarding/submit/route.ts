import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { connectDB } from '@/lib/mongodb';
import {
  OnboardingSubmission,
  OnboardingFormData,
  SubmitOnboardingRequest,
  SubmitOnboardingResponse,
  generateSubmissionId,
} from '@/types/onboarding';

/**
 * Determine device type from user agent
 */
function getDeviceType(userAgent: string): 'mobile' | 'desktop' | 'tablet' {
  const ua = userAgent.toLowerCase();

  if (/ipad|tablet|playbook|silk/i.test(ua)) {
    return 'tablet';
  }

  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * Submit onboarding form
 * POST /api/onboarding/submit
 */
export async function POST(request: NextRequest): Promise<NextResponse<SubmitOnboardingResponse>> {
  try {
    const body: SubmitOnboardingRequest = await request.json();
    const { data, startedAt } = body;

    // Validate required data
    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Form data is required' },
        { status: 400 }
      );
    }

    // Basic validation of required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'phone'];
    for (const field of requiredFields) {
      if (!data[field as keyof OnboardingFormData]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Get request metadata
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || '';
    const forwarded = headersList.get('x-forwarded-for');
    const ipAddress = forwarded?.split(',')[0].trim() || '127.0.0.1';
    const referrer = headersList.get('referer') || undefined;

    // Calculate completion time
    const startTime = startedAt ? new Date(startedAt) : new Date();
    const completionTimeSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);

    // Generate unique submission ID
    const submissionId = generateSubmissionId();
    const now = new Date();

    // Create submission document
    const submission: OnboardingSubmission = {
      submissionId,
      data: data as OnboardingFormData,
      status: 'submitted',
      statusHistory: [
        {
          status: 'submitted',
          changedAt: now,
          notes: 'Initial submission',
        },
      ],
      metadata: {
        ipAddress,
        userAgent,
        deviceType: getDeviceType(userAgent),
        referrer,
        completionTimeSeconds,
        startedAt: startTime,
      },
      submittedAt: now,
      updatedAt: now,
    };

    // Connect to database and insert
    const db = await connectDB();
    const collection = db.collection<OnboardingSubmission>('onboarding_submissions');

    // Create indexes if they don't exist (only happens once)
    await collection.createIndex({ submissionId: 1 }, { unique: true });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ submittedAt: -1 });
    await collection.createIndex({ 'data.email': 1 });

    // Insert submission
    await collection.insertOne(submission);

    console.log(`Onboarding submission created: ${submissionId} for ${data.email}`);

    return NextResponse.json({
      success: true,
      submissionId,
      referenceNumber: submissionId.toUpperCase(),
    });
  } catch (error) {
    console.error('Onboarding submission error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred while processing your submission',
      },
      { status: 500 }
    );
  }
}
