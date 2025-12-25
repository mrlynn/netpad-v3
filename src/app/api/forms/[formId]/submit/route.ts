import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies, headers } from 'next/headers';
import { sessionOptions, ensureSessionId } from '@/lib/session';
import { FormSubmission, BotProtectionConfig } from '@/types/form';
import { randomBytes } from 'crypto';
import { MongoClient } from 'mongodb';
import { executeWebhookAsync } from '@/lib/hooks/executeWebhook';

/**
 * Validate bot protection on server side
 * Checks honeypot field, timing constraints, and Turnstile token
 */
async function validateBotProtection(
  config: BotProtectionConfig,
  data: Record<string, any>,
  ipAddress: string
): Promise<{ valid: boolean; reason?: string }> {
  const botData = data._botProtection;

  // If no bot protection metadata sent, allow (might be legacy client)
  if (!botData) {
    return { valid: true };
  }

  // Check honeypot - should be empty
  if (config.honeypot?.enabled !== false) {
    const honeypotValue = botData.honeypotValue;
    if (honeypotValue && honeypotValue.trim() !== '') {
      return { valid: false, reason: 'honeypot_filled' };
    }
  }

  // Check timing - should be within reasonable bounds
  if (config.timing?.enabled !== false) {
    const timeSpent = botData.timeSpent; // seconds
    const minTime = config.timing?.minSubmitTime ?? 3;
    const maxTime = config.timing?.maxSubmitTime ?? 3600;

    if (typeof timeSpent === 'number') {
      if (timeSpent < minTime) {
        return { valid: false, reason: `submitted_too_fast_${timeSpent}s` };
      }
      // Don't block on maxTime, just log (form might have been left open)
    }
  }

  // Verify Turnstile token if enabled
  if (config.turnstile?.enabled && config.turnstile?.siteKey) {
    const turnstileToken = botData.turnstileToken;

    if (!turnstileToken) {
      return { valid: false, reason: 'turnstile_token_missing' };
    }

    const turnstileResult = await verifyTurnstileToken(turnstileToken, ipAddress);
    if (!turnstileResult.valid) {
      return { valid: false, reason: `turnstile_failed_${turnstileResult.reason}` };
    }
  }

  return { valid: true };
}

/**
 * Verify Turnstile token with Cloudflare API
 */
async function verifyTurnstileToken(
  token: string,
  ipAddress: string
): Promise<{ valid: boolean; reason?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    // If no secret key configured, skip verification (dev mode)
    console.warn('TURNSTILE_SECRET_KEY not configured, skipping verification');
    return { valid: true };
  }

  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
          remoteip: ipAddress,
        }),
      }
    );

    const result = await response.json();

    if (result.success) {
      return { valid: true };
    }

    // Log error codes for debugging
    console.warn('Turnstile verification failed:', result['error-codes']);
    return {
      valid: false,
      reason: result['error-codes']?.join(',') || 'verification_failed'
    };
  } catch (error) {
    console.error('Turnstile API error:', error);
    // Don't block on API errors - might be network issue
    return { valid: true };
  }
}
import {
  getPublishedFormBySlug,
  getPublishedFormById,
  addGlobalSubmission,
} from '@/lib/storage';
import { getSession } from '@/lib/auth/session';

// Platform imports for production mode
import {
  createSubmission,
  checkFormAccess,
  checkPublicSubmissionLimit,
  checkAuthSubmissionLimit,
  getRateLimitHeaders,
} from '@/lib/platform';

/**
 * Form Submission API
 *
 * Supports two modes:
 * 1. Production (dataSource) - Uses encrypted connection vault
 * 2. Legacy (connectionString) - Direct connection for development
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const body = await request.json();
    const { data } = body;

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Form data is required' },
        { status: 400 }
      );
    }

    // Ensure session exists (for rate limiting, etc.)
    const session = await getIronSession(await cookies(), sessionOptions);
    ensureSessionId(session);
    await session.save();

    // Get auth session for authenticated submissions
    const authSession = await getSession();
    const userId = authSession.userId;

    // Find published form by ID or slug
    let form = await getPublishedFormBySlug(formId);
    if (!form) {
      form = await getPublishedFormById(formId);
    }

    if (!form) {
      return NextResponse.json(
        { success: false, error: 'Form not found' },
        { status: 404 }
      );
    }

    if (!form.isPublished) {
      return NextResponse.json(
        { success: false, error: 'Form is not published' },
        { status: 403 }
      );
    }

    // Get request metadata
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || '';
    const forwarded = headersList.get('x-forwarded-for');
    const ipAddress = forwarded?.split(',')[0].trim() || '127.0.0.1';
    const referrer = headersList.get('referer') || undefined;

    // Determine device type
    const deviceType = getDeviceType(userAgent);

    // ============================================
    // Access Control Check
    // ============================================
    if (form.accessControl) {
      const accessResult = await checkFormAccess(
        form.accessControl,
        userId,
        authSession.email
      );

      if (!accessResult.allowed) {
        if (accessResult.requiresAuth) {
          return NextResponse.json(
            {
              success: false,
              error: 'Authentication required',
              requiresAuth: true,
              allowedAuthMethods: accessResult.allowedAuthMethods,
            },
            { status: 401 }
          );
        }

        return NextResponse.json(
          { success: false, error: accessResult.reason || 'Access denied' },
          { status: 403 }
        );
      }
    }

    // ============================================
    // Rate Limiting
    // ============================================
    const rateLimitResult = userId
      ? await checkAuthSubmissionLimit(formId, userId)
      : await checkPublicSubmissionLimit(formId, ipAddress);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many submissions. Please try again later.',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // ============================================
    // Bot Protection Validation
    // ============================================
    if (form.botProtection?.enabled) {
      const botProtectionResult = await validateBotProtection(form.botProtection, data, ipAddress);

      if (!botProtectionResult.valid) {
        console.warn(`Bot detected for form ${formId}: ${botProtectionResult.reason}`, {
          ipAddress,
          userAgent,
          reason: botProtectionResult.reason,
        });

        // Return generic error to avoid revealing detection method
        return NextResponse.json(
          { success: false, error: 'Unable to process submission' },
          { status: 400 }
        );
      }
    }

    // Strip bot protection metadata from data before storing
    const cleanData = { ...data };
    delete cleanData._botProtection;
    delete cleanData._fieldInteractions;
    delete cleanData._formMeta;

    // ============================================
    // Production Mode: Use dataSource + Vault
    // ============================================
    if (form.dataSource && form.organizationId) {
      const result = await createSubmission({
        formId: form.id!,
        formVersion: form.currentVersion || 1,
        organizationId: form.organizationId,
        data: cleanData,
        dataSource: form.dataSource,
        respondent: userId
          ? {
              userId,
              email: authSession.email,
              authMethod: authSession.isPasskeyAuth ? 'passkey' : 'magic-link',
            }
          : undefined,
        metadata: {
          ipAddress,
          userAgent,
          referrer,
          deviceType,
        },
        // Pass form config for encryption support
        formConfig: form,
      });

      if (!result.success) {
        // Execute error webhook if configured
        if (form.hooks?.onError?.webhook) {
          executeWebhookAsync(form.hooks.onError.webhook, {
            formId: form.id!,
            formName: form.name,
            data: cleanData,
            isError: true,
            errorMessage: result.error,
          });
        }

        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      // Execute success webhook if configured
      if (form.hooks?.onSuccess?.webhook) {
        executeWebhookAsync(form.hooks.onSuccess.webhook, {
          formId: form.id!,
          formName: form.name,
          responseId: result.submissionId,
          data: cleanData,
        });
      }

      return NextResponse.json({
        success: true,
        submissionId: result.submissionId,
        responseId: result.submissionId, // Also return as responseId for consistency
        syncStatus: result.syncStatus,
        message: 'Form submitted successfully',
      });
    }

    // ============================================
    // Legacy Mode: Direct connectionString
    // ============================================

    // Create submission record
    const submission: FormSubmission = {
      id: randomBytes(16).toString('hex'),
      formId: form.id!,
      formName: form.name,
      data: cleanData,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      metadata: {
        userAgent,
        ipAddress,
        referrer,
        deviceType,
      },
    };

    // Store submission in global file storage (not session-specific)
    await addGlobalSubmission(submission);

    // If form has connection string, also insert into MongoDB
    if (form.connectionString && form.database && form.collection) {
      try {
        const client = new MongoClient(form.connectionString);
        await client.connect();
        const db = client.db(form.database);
        const collection = db.collection(form.collection);

        // Add submission metadata to the document
        const documentToInsert = {
          ...cleanData,
          _formSubmission: {
            formId: form.id,
            formName: form.name,
            submittedAt: submission.submittedAt,
            respondent: userId
              ? { userId, email: authSession.email }
              : undefined,
          },
        };

        await collection.insertOne(documentToInsert);
        await client.close();
      } catch (mongoError: any) {
        console.error('MongoDB insert error:', mongoError);
        // Don't fail the submission if MongoDB insert fails
        // The submission is still stored in file storage
      }
    }

    // Execute success webhook if configured
    if (form.hooks?.onSuccess?.webhook) {
      executeWebhookAsync(form.hooks.onSuccess.webhook, {
        formId: form.id!,
        formName: form.name,
        responseId: submission.id,
        data: cleanData,
      });
    }

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      responseId: submission.id, // Also return as responseId for consistency
      message: 'Form submitted successfully',
    });
  } catch (error: any) {
    console.error('Error submitting form:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit form' },
      { status: 500 }
    );
  }
}

/**
 * Determine device type from user agent
 */
function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  const ua = userAgent.toLowerCase();

  if (/ipad|tablet|playbook|silk/i.test(ua)) {
    return 'tablet';
  }

  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'mobile';
  }

  return 'desktop';
}
