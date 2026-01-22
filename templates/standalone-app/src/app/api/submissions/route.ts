/**
 * Form Submissions API
 *
 * POST /api/submissions
 * Submit a form response.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFormBySlug } from '@/lib/bundle';
import { getSubmissionsCollection } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Conversational form data for transcript storage
 */
interface ConversationalData {
  conversationId: string;
  transcript?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
  }>;
  topicsCovered?: Array<{
    topicId: string;
    name: string;
    covered: boolean;
    depth: number;
  }>;
  overallConfidence: number;
  turnCount: number;
  durationSeconds?: number;
  startedAt?: Date;
  completedAt?: Date;
}

interface SubmissionPayload {
  formSlug: string;
  data: Record<string, any>;
  metadata?: {
    userAgent?: string;
    referrer?: string;
    submittedAt?: string;
  };
  /** Conversational form data - transcript, topics, confidence metrics */
  conversationalData?: ConversationalData;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmissionPayload;
    const { formSlug, data, metadata, conversationalData } = body;

    if (!formSlug) {
      return NextResponse.json(
        { error: 'Form slug is required' },
        { status: 400 }
      );
    }

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Form data is required' },
        { status: 400 }
      );
    }

    // Verify form exists
    const form = await getFormBySlug(formSlug);
    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    const requiredFields = form.fieldConfigs
      ?.filter((f) => f.required && f.included !== false)
      .map((f) => f.name) || [];

    const missingFields = requiredFields.filter(
      (fieldName) => data[fieldName] === undefined || data[fieldName] === ''
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          missingFields,
        },
        { status: 400 }
      );
    }

    // Create submission record
    const submissionId = generateSubmissionId();
    const submission = {
      submissionId,
      formSlug,
      formName: form.name,
      data,
      status: 'submitted',
      metadata: {
        userAgent: metadata?.userAgent || request.headers.get('user-agent') || undefined,
        referrer: metadata?.referrer || request.headers.get('referer') || undefined,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
      },
      // Include conversational data if this was a conversational form submission
      // This keeps the transcript, topics covered, and confidence metrics with the submission
      ...(conversationalData && {
        conversational: {
          conversationId: conversationalData.conversationId,
          transcript: conversationalData.transcript,
          topicsCovered: conversationalData.topicsCovered,
          overallConfidence: conversationalData.overallConfidence,
          turnCount: conversationalData.turnCount,
          durationSeconds: conversationalData.durationSeconds,
          startedAt: conversationalData.startedAt,
          completedAt: conversationalData.completedAt,
        },
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to database
    const collection = await getSubmissionsCollection();
    await collection.insertOne(submission as any);

    // Trigger connected workflows
    try {
      const { triggerWorkflowsForFormSubmission } = await import('@/lib/workflows/trigger');
      await triggerWorkflowsForFormSubmission({
        formSlug,
        submissionId,
        submissionData: data,
      });
    } catch (error) {
      // Log but don't fail the submission if workflow trigger fails
      console.error('[Submissions API] Failed to trigger workflows:', error);
    }

    return NextResponse.json({
      success: true,
      submissionId,
      message: 'Form submitted successfully',
    });
  } catch (error) {
    console.error('[Submissions API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to submit form',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function generateSubmissionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `sub_${timestamp}${randomPart}`;
}
