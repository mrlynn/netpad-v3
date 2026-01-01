/**
 * Email Send Node Handler
 *
 * Sends an email using SMTP via nodemailer.
 *
 * Environment variables:
 *   - SMTP_HOST: SMTP server hostname
 *   - SMTP_PORT: SMTP server port
 *   - SMTP_USER: SMTP username
 *   - SMTP_PASS: SMTP password
 *   - FROM_EMAIL: Default sender email address
 *
 * Config:
 *   - to: Recipient email address(es)
 *   - subject: Email subject line
 *   - body: Email body content (HTML or plain text)
 *   - from: Optional sender address (overrides FROM_EMAIL)
 *   - replyTo: Optional reply-to address
 *
 * Input: Data from previous nodes (can use template variables)
 * Output: { sent: boolean, messageId, recipients, subject, timestamp }
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

const metadata: HandlerMetadata = {
  type: 'email-send',
  name: 'Send Email',
  description: 'Sends an email notification via SMTP',
  version: '1.0.0',
};

// Create reusable transporter (lazy initialization)
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new Error('SMTP configuration missing. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });
  }
  return transporter;
}

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Processing email send', {
    nodeId: context.nodeId,
  });

  const { resolvedConfig } = context;

  // Extract email configuration
  const to = resolvedConfig.to as string | string[] | undefined;
  const subject = resolvedConfig.subject as string | undefined;
  const body = resolvedConfig.body as string | undefined;
  const from = (resolvedConfig.from as string | undefined) || process.env.FROM_EMAIL;
  const replyTo = resolvedConfig.replyTo as string | undefined;

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

  await context.log('info', 'Sending email', {
    to: recipients,
    subject,
    from: from || '(not set)',
  });

  try {
    // Get SMTP transporter
    const transport = getTransporter();

    // Determine if body is HTML or plain text
    const isHtml = body.trim().startsWith('<') || body.includes('<br') || body.includes('<p>');

    // Build email options
    const mailOptions: nodemailer.SendMailOptions = {
      from: from,
      to: recipients.join(', '),
      subject: subject,
      ...(isHtml ? { html: body } : { text: body }),
      ...(replyTo ? { replyTo } : {}),
    };

    // Send the email
    const result = await transport.sendMail(mailOptions);

    await context.log('info', 'Email sent successfully', {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    });

    const outputData = {
      sent: true,
      messageId: result.messageId,
      recipients,
      accepted: result.accepted,
      rejected: result.rejected,
      subject,
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
    });

    // SMTP errors are often transient (network issues, rate limits), so mark as retryable
    const isRetryable = errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many');

    return failureResult(
      NodeErrorCodes.OPERATION_FAILED,
      `Failed to send email: ${errorMessage}`,
      isRetryable
    );
  }
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
