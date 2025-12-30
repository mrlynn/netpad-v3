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
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
}

export async function sendMagicLinkEmail({
  to,
  token,
  expiresInMinutes = 5,
  returnUrl,
}: SendMagicLinkEmailParams): Promise<boolean> {
  // Build the magic link URL, optionally including returnUrl
  let magicLinkUrl = `${APP_URL}/auth/verify?token=${token}`;
  if (returnUrl) {
    magicLinkUrl += `&returnUrl=${encodeURIComponent(returnUrl)}`;
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
