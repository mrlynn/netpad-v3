import nodemailer from 'nodemailer';

// Email configuration
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@netpad.io';
const FROM_NAME = process.env.FROM_NAME || 'NetPad';
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Create transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    // In development, use console logging if SMTP not configured
    if (!EMAIL_CONFIG.auth.user && process.env.NODE_ENV !== 'production') {
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    } else {
      transporter = nodemailer.createTransport(EMAIL_CONFIG);
    }
  }
  return transporter;
}

export interface SendMagicLinkEmailParams {
  to: string;
  token: string;
  expiresInMinutes?: number;
  returnUrl?: string;
  directUrl?: string; // Override the default /auth/verify URL (for CLI links)
}

export async function sendMagicLinkEmail({
  to,
  token,
  expiresInMinutes = 5,
  returnUrl,
  directUrl,
}: SendMagicLinkEmailParams): Promise<boolean> {
  // Build the magic link URL
  // If directUrl is provided (for CLI), use it directly
  // Otherwise, use the standard /auth/verify URL with optional returnUrl
  let magicLinkUrl: string;
  if (directUrl) {
    magicLinkUrl = directUrl;
  } else {
    magicLinkUrl = `${APP_URL}/auth/verify?token=${token}`;
    if (returnUrl) {
      magicLinkUrl += `&returnUrl=${encodeURIComponent(returnUrl)}`;
    }
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to NetPad</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #001E2B;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #001E2B; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #0a2633; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(0, 237, 100, 0.2);">
              <div style="display: inline-block; background: linear-gradient(135deg, #00ED64 0%, #00CC55 100%); padding: 12px 20px; border-radius: 8px; margin-bottom: 16px;">
                <span style="color: #001E2B; font-size: 20px; font-weight: 700;">NetPad</span>
              </div>
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0;">Sign in to your account</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: rgba(255, 255, 255, 0.7); font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Click the button below to securely sign in to NetPad. This link will expire in <strong style="color: #00ED64;">${expiresInMinutes} minutes</strong>.
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${magicLinkUrl}" style="display: inline-block; background: linear-gradient(135deg, #00ED64 0%, #00CC55 100%); color: #001E2B; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">
                      Sign In to NetPad
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: rgba(255, 255, 255, 0.5); font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="color: #00ED64; font-size: 13px; line-height: 1.6; margin: 0 0 24px; word-break: break-all; background: rgba(0, 237, 100, 0.1); padding: 12px; border-radius: 6px;">
                ${magicLinkUrl}
              </p>

              <!-- Security note -->
              <div style="background: rgba(255, 152, 0, 0.1); border: 1px solid rgba(255, 152, 0, 0.3); border-radius: 8px; padding: 16px; margin-top: 8px;">
                <p style="color: #ff9800; font-size: 13px; line-height: 1.5; margin: 0;">
                  <strong>Security note:</strong> If you didn't request this email, you can safely ignore it. Never share this link with anyone.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: rgba(0, 0, 0, 0.2); text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <p style="color: rgba(255, 255, 255, 0.4); font-size: 12px; line-height: 1.5; margin: 0;">
                NetPad - Build forms and workflows connected to MongoDB<br>
                This is an automated message. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `
Sign in to NetPad

Click the link below to sign in. This link expires in ${expiresInMinutes} minutes.

${magicLinkUrl}

If you didn't request this email, you can safely ignore it.

--
NetPad
`;

  try {
    const transport = getTransporter();
    const info = await transport.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject: 'Sign in to NetPad',
      text,
      html,
    });

    // In development without SMTP, log the link
    if (process.env.NODE_ENV !== 'production' && !EMAIL_CONFIG.auth.user) {
      console.log('\n📧 Magic Link Email (Dev Mode)');
      console.log('To:', to);
      console.log('Link:', magicLinkUrl);
      console.log('Expires in:', expiresInMinutes, 'minutes\n');
    }

    return true;
  } catch (error) {
    console.error('Failed to send magic link email:', error);
    console.error('SMTP config check:', {
      host: EMAIL_CONFIG.host,
      port: EMAIL_CONFIG.port,
      secure: EMAIL_CONFIG.secure,
      hasUser: !!EMAIL_CONFIG.auth.user,
      hasPass: !!EMAIL_CONFIG.auth.pass,
      fromEmail: FROM_EMAIL,
      appUrl: APP_URL,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export interface SendContactNotificationParams {
  name: string;
  email: string;
  company?: string;
  interest: string;
  message?: string;
}

const INTEREST_LABELS: Record<string, string> = {
  demo: 'Request a demo',
  pricing: 'Pricing inquiry',
  support: 'Technical support',
  partnership: 'Partnership opportunity',
  other: 'Other',
};

export async function sendContactNotification({
  name,
  email,
  company,
  interest,
  message,
}: SendContactNotificationParams): Promise<boolean> {
  const notifyEmail = process.env.SMTP_USER || 'michael@netpad.io';
  const interestLabel = INTEREST_LABELS[interest] || interest;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Form Submission</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #001E2B;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #001E2B; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #0a2633; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(0, 237, 100, 0.2);">
              <div style="display: inline-block; background: linear-gradient(135deg, #00ED64 0%, #00CC55 100%); padding: 12px 20px; border-radius: 8px; margin-bottom: 16px;">
                <span style="color: #001E2B; font-size: 20px; font-weight: 700;">NetPad</span>
              </div>
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0;">New Contact Form Submission</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                    <span style="color: rgba(255, 255, 255, 0.5); font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Name</span><br>
                    <span style="color: #ffffff; font-size: 16px; font-weight: 500;">${name}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                    <span style="color: rgba(255, 255, 255, 0.5); font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Email</span><br>
                    <a href="mailto:${email}" style="color: #00ED64; font-size: 16px; font-weight: 500; text-decoration: none;">${email}</a>
                  </td>
                </tr>
                ${company ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                    <span style="color: rgba(255, 255, 255, 0.5); font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Company</span><br>
                    <span style="color: #ffffff; font-size: 16px; font-weight: 500;">${company}</span>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                    <span style="color: rgba(255, 255, 255, 0.5); font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Interest</span><br>
                    <span style="display: inline-block; background: rgba(0, 237, 100, 0.15); color: #00ED64; padding: 4px 12px; border-radius: 4px; font-size: 14px; font-weight: 500; margin-top: 4px;">${interestLabel}</span>
                  </td>
                </tr>
                ${message ? `
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="color: rgba(255, 255, 255, 0.5); font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Message</span><br>
                    <p style="color: rgba(255, 255, 255, 0.85); font-size: 15px; line-height: 1.6; margin: 8px 0 0; white-space: pre-wrap;">${message}</p>
                  </td>
                </tr>
                ` : ''}
              </table>

              <!-- Reply Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="mailto:${email}?subject=Re: Your NetPad Inquiry" style="display: inline-block; background: linear-gradient(135deg, #00ED64 0%, #00CC55 100%); color: #001E2B; text-decoration: none; font-size: 15px; font-weight: 600; padding: 12px 28px; border-radius: 8px;">
                      Reply to ${name.split(' ')[0]}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background: rgba(0, 0, 0, 0.2); text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <p style="color: rgba(255, 255, 255, 0.4); font-size: 12px; line-height: 1.5; margin: 0;">
                This message was sent from the NetPad contact form.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `
New Contact Form Submission

Name: ${name}
Email: ${email}
${company ? `Company: ${company}\n` : ''}Interest: ${interestLabel}
${message ? `\nMessage:\n${message}` : ''}

--
NetPad Contact Form
`;

  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: notifyEmail,
      replyTo: email,
      subject: `[NetPad Contact] ${interestLabel} from ${name}`,
      text,
      html,
    });

    // In development without SMTP, log the submission
    if (process.env.NODE_ENV !== 'production' && !EMAIL_CONFIG.auth.user) {
      console.log('\n📧 Contact Form Notification (Dev Mode)');
      console.log('From:', name, `<${email}>`);
      console.log('Interest:', interestLabel);
      console.log('Message:', message || '(none)');
      console.log('');
    }

    return true;
  } catch (error) {
    console.error('Failed to send contact notification:', error);
    return false;
  }
}

/**
 * Parameters for collaborator intake notification
 */
export interface SendCollaboratorNotificationParams {
  name: string;
  email: string;
  lane: string;
  shipped: string;
  whyNetpad: string;
  availability?: string;
  location?: string;
  workLinks?: string;
  conversationId?: string;
  turnCount?: number;
}

const LANE_LABELS: Record<string, string> = {
  product_design: '🎨 Product & Design',
  engineering: '💻 Full-Stack Engineering',
  integrations: '🔌 Integrations & Ecosystem',
  undecided: '🤔 Not sure yet',
};

const AVAILABILITY_LABELS: Record<string, string> = {
  few_hours: 'A few hours/week',
  '5-10_hours': '5-10 hrs/week',
  '10+_hours': '10+ hrs/week',
  depends: 'Depends on the project',
};

/**
 * Send notification when someone submits the collaborator intake form
 */
export async function sendCollaboratorNotification(params: SendCollaboratorNotificationParams): Promise<boolean> {
  const notifyEmail = process.env.COLLABORATOR_NOTIFY_EMAIL || process.env.SMTP_USER || 'michael@netpad.io';
  const laneLabel = LANE_LABELS[params.lane] || params.lane;
  const availabilityLabel = params.availability ? (AVAILABILITY_LABELS[params.availability] || params.availability) : 'Not specified';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Collaborator Interest</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #001E2B;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #001E2B; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #0a2633; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(0, 237, 100, 0.2);">
              <div style="display: inline-block; background: linear-gradient(135deg, #00ED64 0%, #00CC55 100%); padding: 12px 20px; border-radius: 8px; margin-bottom: 16px;">
                <span style="color: #001E2B; font-size: 20px; font-weight: 700;">🤝 New Collaborator</span>
              </div>
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0;">Someone wants to build NetPad with you!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <!-- Quick Summary -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; background: rgba(0, 237, 100, 0.08); border-radius: 8px; padding: 16px;">
                <tr>
                  <td>
                    <span style="color: #00ED64; font-size: 18px; font-weight: 600;">${params.name}</span>
                    <span style="color: rgba(255, 255, 255, 0.5);"> • </span>
                    <span style="color: rgba(255, 255, 255, 0.7);">${laneLabel}</span>
                    <br>
                    <a href="mailto:${params.email}" style="color: #00ED64; font-size: 14px; text-decoration: none;">${params.email}</a>
                  </td>
                </tr>
              </table>

              <!-- Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                    <span style="color: rgba(255, 255, 255, 0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Lane</span><br>
                    <span style="color: #ffffff; font-size: 15px; font-weight: 500;">${laneLabel}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                    <span style="color: rgba(255, 255, 255, 0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Availability</span><br>
                    <span style="color: #ffffff; font-size: 15px;">${availabilityLabel}</span>
                  </td>
                </tr>
                ${params.location ? `
                <tr>
                  <td style="padding: 16px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                    <span style="color: rgba(255, 255, 255, 0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Location</span><br>
                    <span style="color: #ffffff; font-size: 15px;">${params.location}</span>
                  </td>
                </tr>
                ` : ''}
                ${params.workLinks ? `
                <tr>
                  <td style="padding: 16px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                    <span style="color: rgba(255, 255, 255, 0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Work Links</span><br>
                    <span style="color: #00ED64; font-size: 14px; white-space: pre-wrap;">${params.workLinks}</span>
                  </td>
                </tr>
                ` : ''}
              </table>

              <!-- What They've Shipped -->
              <div style="background: rgba(255, 255, 255, 0.03); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <span style="color: #00ED64; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">What They've Shipped</span>
                <p style="color: rgba(255, 255, 255, 0.85); font-size: 15px; line-height: 1.7; margin: 12px 0 0; white-space: pre-wrap;">${params.shipped}</p>
              </div>

              <!-- Why NetPad -->
              <div style="background: rgba(255, 255, 255, 0.03); border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <span style="color: #00ED64; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Why NetPad</span>
                <p style="color: rgba(255, 255, 255, 0.85); font-size: 15px; line-height: 1.7; margin: 12px 0 0; white-space: pre-wrap;">${params.whyNetpad}</p>
              </div>

              <!-- Reply Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="mailto:${params.email}?subject=Re: Collaborating on NetPad" style="display: inline-block; background: linear-gradient(135deg, #00ED64 0%, #00CC55 100%); color: #001E2B; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">
                      Reply to ${params.name.split(' ')[0]}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background: rgba(0, 0, 0, 0.2); text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <p style="color: rgba(255, 255, 255, 0.4); font-size: 12px; line-height: 1.5; margin: 0;">
                Submitted via NetPad Collaborator Form${params.conversationId ? ` • Conversation: ${params.conversationId}` : ''}${params.turnCount ? ` • ${params.turnCount} turns` : ''}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `
🤝 New Collaborator Interest

${params.name} wants to build NetPad with you!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTACT
Name: ${params.name}
Email: ${params.email}
Lane: ${laneLabel}
Availability: ${availabilityLabel}
${params.location ? `Location: ${params.location}\n` : ''}${params.workLinks ? `Work Links: ${params.workLinks}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT THEY'VE SHIPPED
${params.shipped}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHY NETPAD
${params.whyNetpad}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${params.conversationId ? `Conversation ID: ${params.conversationId}\n` : ''}${params.turnCount ? `Turns: ${params.turnCount}\n` : ''}
--
NetPad Collaborator Form
`;

  try {
    console.log('[Email] Preparing to send collaborator notification:', {
      to: notifyEmail,
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      replyTo: params.email,
      subject: `🤝 New Collaborator: ${params.name} (${laneLabel})`,
      hasSmtpAuth: !!EMAIL_CONFIG.auth.user,
      smtpHost: EMAIL_CONFIG.host,
    });

    const transport = getTransporter();
    const result = await transport.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: notifyEmail,
      replyTo: params.email,
      subject: `🤝 New Collaborator: ${params.name} (${laneLabel})`,
      text,
      html,
    });

    console.log('[Email] Collaborator notification sent to:', notifyEmail, 'Result:', result);

    // In development without SMTP, log the submission
    if (process.env.NODE_ENV !== 'production' && !EMAIL_CONFIG.auth.user) {
      console.log('\n📧 Collaborator Notification (Dev Mode)');
      console.log('From:', params.name, `<${params.email}>`);
      console.log('Lane:', laneLabel);
      console.log('');
    }

    return true;
  } catch (error) {
    console.error('Failed to send collaborator notification:', error);
    return false;
  }
}

export async function sendPasskeyRegisteredEmail(to: string, deviceName: string): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #001E2B;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #001E2B; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #0a2633; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 32px; text-align: center;">
              <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #00ED64 0%, #00CC55 100%); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 28px;">🔐</span>
              </div>
              <h1 style="color: #ffffff; font-size: 22px; font-weight: 600; margin: 0 0 16px;">Passkey Added</h1>
              <p style="color: rgba(255, 255, 255, 0.7); font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
                A new passkey was registered on your account:
              </p>
              <p style="color: #00ED64; font-size: 16px; font-weight: 600; margin: 0 0 24px;">
                ${deviceName}
              </p>
              <p style="color: rgba(255, 255, 255, 0.5); font-size: 13px; line-height: 1.5; margin: 0;">
                If you didn't add this passkey, please secure your account immediately.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject: 'New passkey added to your NetPad account',
      html,
    });
    return true;
  } catch (error) {
    console.error('Failed to send passkey notification:', error);
    return false;
  }
}

/**
 * Parameters for organization invitation email
 */
export interface SendOrganizationInviteEmailParams {
  to: string;
  inviterName: string;
  organizationName: string;
  role: string;
  token: string;
  expiresInDays?: number;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

/**
 * Send invitation email when someone is invited to join an organization
 */
export async function sendOrganizationInviteEmail({
  to,
  inviterName,
  organizationName,
  role,
  token,
  expiresInDays = 7,
}: SendOrganizationInviteEmailParams): Promise<boolean> {
  const inviteUrl = `${APP_URL}/invite/${token}`;
  const roleLabel = ROLE_LABELS[role] || role;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to join ${organizationName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #001E2B;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #001E2B; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #0a2633; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(0, 237, 100, 0.2);">
              <div style="display: inline-block; background: linear-gradient(135deg, #00ED64 0%, #00CC55 100%); padding: 12px 20px; border-radius: 8px; margin-bottom: 16px;">
                <span style="color: #001E2B; font-size: 20px; font-weight: 700;">NetPad</span>
              </div>
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0;">You're invited!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: rgba(255, 255, 255, 0.85); font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                <strong style="color: #00ED64;">${inviterName}</strong> has invited you to join <strong style="color: #ffffff;">${organizationName}</strong> on NetPad.
              </p>

              <!-- Role badge -->
              <div style="background: rgba(0, 237, 100, 0.1); border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
                <span style="color: rgba(255, 255, 255, 0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Your Role</span><br>
                <span style="color: #00ED64; font-size: 18px; font-weight: 600;">${roleLabel}</span>
              </div>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #00ED64 0%, #00CC55 100%); color: #001E2B; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: rgba(255, 255, 255, 0.5); font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="color: #00ED64; font-size: 13px; line-height: 1.6; margin: 0 0 24px; word-break: break-all; background: rgba(0, 237, 100, 0.1); padding: 12px; border-radius: 6px;">
                ${inviteUrl}
              </p>

              <!-- Expiration note -->
              <div style="background: rgba(255, 152, 0, 0.1); border: 1px solid rgba(255, 152, 0, 0.3); border-radius: 8px; padding: 16px; margin-top: 8px;">
                <p style="color: #ff9800; font-size: 13px; line-height: 1.5; margin: 0;">
                  <strong>Note:</strong> This invitation expires in <strong>${expiresInDays} days</strong>. If you don't recognize ${inviterName} or ${organizationName}, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: rgba(0, 0, 0, 0.2); text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <p style="color: rgba(255, 255, 255, 0.4); font-size: 12px; line-height: 1.5; margin: 0;">
                NetPad - Build forms and workflows connected to MongoDB<br>
                This is an automated message. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `
You're Invited to ${organizationName}!

${inviterName} has invited you to join ${organizationName} on NetPad.

Your Role: ${roleLabel}

Accept the invitation by clicking this link:
${inviteUrl}

This invitation expires in ${expiresInDays} days.

If you don't recognize ${inviterName} or ${organizationName}, you can safely ignore this email.

--
NetPad
`;

  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject: `You're invited to join ${organizationName} on NetPad`,
      text,
      html,
    });

    if (process.env.NODE_ENV !== 'production' && !EMAIL_CONFIG.auth.user) {
      console.log('\n📧 Organization Invite Email (Dev Mode)');
      console.log('To:', to);
      console.log('Organization:', organizationName);
      console.log('Role:', roleLabel);
      console.log('Invite URL:', inviteUrl);
      console.log('Expires in:', expiresInDays, 'days\n');
    }

    return true;
  } catch (error) {
    console.error('Failed to send organization invite email:', error);
    return false;
  }
}
