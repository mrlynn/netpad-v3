/**
 * Email Send Node Handler
 *
 * Sends an email using user-provided credentials from the integration vault.
 * Supports both SMTP and SendGrid providers.
 *
 * IMPORTANT: This node REQUIRES user-provided email credentials.
 * System/environment SMTP is reserved for authentication emails only.
 *
 * Config:
 *   - credentialId: REQUIRED - Integration credential ID for SMTP or SendGrid
 *   - to: Recipient email address(es)
 *   - subject: Email subject line
 *   - body: Email body content (HTML or plain text)
 *   - from: Optional sender address (overrides credential default)
 *   - replyTo: Optional reply-to address
 *
 * Input: Data from previous nodes (can use template variables)
 * Output: { sent: boolean, messageId, recipients, subject, timestamp, provider }
 */

import nodemailer from 'nodemailer';
import { registerHandler } from './registry';
import {
  ExtendedNodeContext,
  NodeHandler,
  HandlerMetadata,
  successResult,
  failureResult,
  NodeErrorCodes,
} from './types';
import type { SmtpCredentials, SendGridCredentials } from '@/lib/platform/integrationCredentials';

const metadata: HandlerMetadata = {
  type: 'email-send',
  name: 'Send Email',
  description: 'Sends an email via user-provided SMTP or SendGrid credentials',
  version: '2.0.0',
};

// SMTP transporter cache (keyed by credential config hash)
const transporterCache = new Map<string, nodemailer.Transporter>();

/**
 * Get or create SMTP transporter for given credentials
 */
function getSmtpTransporter(creds: SmtpCredentials): nodemailer.Transporter {
  const cacheKey = `${creds.host}:${creds.port}:${creds.username}`;

  let transporter = transporterCache.get(cacheKey);
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: creds.host,
      port: creds.port,
      secure: creds.secure ?? (creds.port === 465),
      auth: {
        user: creds.username,
        pass: creds.password,
      },
    });
    transporterCache.set(cacheKey, transporter);
  }
  return transporter;
}

/**
 * Send email via SMTP using nodemailer
 */
async function sendViaSMTP(
  creds: SmtpCredentials,
  options: {
    to: string[];
    subject: string;
    body: string;
    from?: string;
    replyTo?: string;
    isHtml: boolean;
  }
): Promise<{ messageId: string; accepted: string[]; rejected: string[] }> {
  const transporter = getSmtpTransporter(creds);

  // Build from address
  const fromEmail = options.from || creds.fromEmail || creds.username;
  const fromName = creds.fromName;
  const from = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;

  const mailOptions: nodemailer.SendMailOptions = {
    from,
    to: options.to.join(', '),
    subject: options.subject,
    ...(options.isHtml ? { html: options.body } : { text: options.body }),
    ...(options.replyTo ? { replyTo: options.replyTo } : {}),
  };

  const result = await transporter.sendMail(mailOptions);

  return {
    messageId: result.messageId,
    accepted: result.accepted as string[],
    rejected: result.rejected as string[],
  };
}

/**
 * Send email via SendGrid API
 *
 * SendGrid is an email API service that uses HTTP requests instead of SMTP.
 * This is simpler and more reliable for high-volume sending.
 */
async function sendViaSendGrid(
  creds: SendGridCredentials,
  options: {
    to: string[];
    subject: string;
    body: string;
    from?: string;
    replyTo?: string;
    isHtml: boolean;
  }
): Promise<{ messageId: string; accepted: string[]; rejected: string[] }> {
  const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

  // Build from address
  const fromEmail = options.from || creds.fromEmail;
  const fromName = creds.fromName;

  // Build the SendGrid API payload
  // See: https://docs.sendgrid.com/api-reference/mail-send/mail-send
  const payload = {
    personalizations: [
      {
        to: options.to.map(email => ({ email })),
      },
    ],
    from: {
      email: fromEmail,
      ...(fromName ? { name: fromName } : {}),
    },
    subject: options.subject,
    content: [
      {
        type: options.isHtml ? 'text/html' : 'text/plain',
        value: options.body,
      },
    ],
    ...(options.replyTo ? {
      reply_to: { email: options.replyTo },
    } : {}),
  };

  const response = await fetch(SENDGRID_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${creds.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = `SendGrid API error (${response.status})`;
    try {
      const errorData = await response.json();
      if (errorData.errors && Array.isArray(errorData.errors)) {
        errorMessage = errorData.errors.map((e: { message?: string }) => e.message).join(', ');
      }
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }

  // SendGrid returns 202 Accepted with message ID in header
  const messageId = response.headers.get('X-Message-Id') || `sg-${Date.now()}`;

  return {
    messageId,
    accepted: options.to,
    rejected: [],
  };
}

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Processing email send', {
    nodeId: context.nodeId,
  });

  const { resolvedConfig, getEmailCredentials } = context;

  // Extract email configuration
  const credentialId = resolvedConfig.credentialId as string | undefined;
  const to = resolvedConfig.to as string | string[] | undefined;
  const subject = resolvedConfig.subject as string | undefined;
  const bodyRaw = resolvedConfig.body;
  const from = resolvedConfig.from as string | undefined;
  const replyTo = resolvedConfig.replyTo as string | undefined;

  // Convert body to string (handles objects, arrays, etc. from variable substitution)
  const body = bodyRaw !== undefined && bodyRaw !== null
    ? (typeof bodyRaw === 'string' ? bodyRaw : JSON.stringify(bodyRaw, null, 2))
    : undefined;

  // ====================================
  // REQUIRE user-provided credentials
  // ====================================
  if (!credentialId) {
    await context.log('error', 'Email credential ID is required. Please configure an email integration (SMTP or SendGrid) in your organization settings.');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'Email credential ID is required. Configure an SMTP or SendGrid integration in Settings > Integrations.',
      false
    );
  }

  // Validate required fields
  if (!to) {
    await context.log('error', 'Missing recipient (to) in email configuration');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'Email recipient (to) is required',
      false
    );
  }

  if (!subject) {
    await context.log('error', 'Missing subject in email configuration');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'Email subject is required',
      false
    );
  }

  if (!body) {
    await context.log('error', 'Missing body in email configuration');
    return failureResult(
      NodeErrorCodes.MISSING_CONFIG,
      'Email body is required',
      false
    );
  }

  // Normalize recipients to array
  const recipients = Array.isArray(to) ? to : [to];

  // Get email credentials from vault
  const emailCreds = await getEmailCredentials(credentialId);

  if (!emailCreds) {
    await context.log('error', 'Email credentials not found or invalid', { credentialId });
    return failureResult(
      NodeErrorCodes.MISSING_CONNECTION,
      `Email credentials not found for ID: ${credentialId}. Ensure the integration is active and properly configured.`,
      false
    );
  }

  await context.log('info', 'Sending email', {
    to: recipients,
    subject,
    provider: emailCreds.provider,
    from: from || '(default)',
  });

  try {
    // Determine if body is HTML or plain text
    const isHtml = body.trim().startsWith('<') || body.includes('<br') || body.includes('<p>');

    let result: { messageId: string; accepted: string[]; rejected: string[] };

    if (emailCreds.provider === 'smtp') {
      result = await sendViaSMTP(emailCreds.credentials, {
        to: recipients,
        subject,
        body,
        from,
        replyTo,
        isHtml,
      });
    } else if (emailCreds.provider === 'sendgrid') {
      result = await sendViaSendGrid(emailCreds.credentials, {
        to: recipients,
        subject,
        body,
        from,
        replyTo,
        isHtml,
      });
    } else {
      // TypeScript exhaustiveness check
      const _exhaustive: never = emailCreds;
      throw new Error(`Unknown email provider: ${(_exhaustive as { provider: string }).provider}`);
    }

    await context.log('info', 'Email sent successfully', {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      provider: emailCreds.provider,
    });

    const outputData = {
      sent: true,
      messageId: result.messageId,
      recipients,
      accepted: result.accepted,
      rejected: result.rejected,
      subject,
      provider: emailCreds.provider,
      timestamp: new Date().toISOString(),
    };

    return successResult(outputData, {
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error sending email';

    await context.log('error', 'Failed to send email', {
      error: errorMessage,
      to: recipients,
      subject,
      provider: emailCreds.provider,
    });

    // Determine if error is retryable
    const isRetryable =
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many') ||
      errorMessage.includes('429') ||
      errorMessage.includes('503') ||
      errorMessage.includes('temporarily');

    return failureResult(
      NodeErrorCodes.OPERATION_FAILED,
      `Failed to send email via ${emailCreds.provider}: ${errorMessage}`,
      isRetryable
    );
  }
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
