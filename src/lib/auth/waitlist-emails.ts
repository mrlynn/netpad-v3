import nodemailer from 'nodemailer';

// Email configuration (same as main email.ts)
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

/**
 * Send waitlist confirmation email to new signups
 */
export async function sendWaitlistConfirmationEmail(
  to: string,
  name?: string
): Promise<boolean> {
  const greeting = name ? `Hi ${name}` : 'Hi there';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're on the NetPad waitlist!</title>
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
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0;">You're on the list!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: rgba(255, 255, 255, 0.85); font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                ${greeting},
              </p>
              <p style="color: rgba(255, 255, 255, 0.7); font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Thanks for joining the NetPad waitlist! We're excited to have you.
              </p>
              <p style="color: rgba(255, 255, 255, 0.7); font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                We're carefully onboarding users to ensure everyone has a great experience. We'll email you as soon as your access is approved.
              </p>

              <!-- Info box -->
              <div style="background: rgba(0, 237, 100, 0.1); border: 1px solid rgba(0, 237, 100, 0.3); border-radius: 8px; padding: 20px; margin-top: 8px;">
                <p style="color: #00ED64; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong>What's next?</strong><br>
                  We'll review your application and send you an email when your account is ready. This usually takes 1-2 business days.
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
${greeting},

Thanks for joining the NetPad waitlist! We're excited to have you.

We're carefully onboarding users to ensure everyone has a great experience. We'll email you as soon as your access is approved.

What's next?
We'll review your application and send you an email when your account is ready. This usually takes 1-2 business days.

--
NetPad
`;

  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject: "You're on the NetPad waitlist!",
      text,
      html,
    });

    if (process.env.NODE_ENV !== 'production' && !EMAIL_CONFIG.auth.user) {
      console.log('\n📧 Waitlist Confirmation Email (Dev Mode)');
      console.log('To:', to);
      console.log('Name:', name || '(not provided)');
      console.log('');
    }

    return true;
  } catch (error) {
    console.error('Failed to send waitlist confirmation email:', error);
    return false;
  }
}

/**
 * Send approval email when user is approved from waitlist
 */
export async function sendWaitlistApprovalEmail(
  to: string,
  name?: string
): Promise<boolean> {
  const greeting = name ? `Hi ${name}` : 'Hi there';
  const loginUrl = `${APP_URL}/auth/login`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're approved! Welcome to NetPad</title>
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
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0;">You're approved!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: rgba(255, 255, 255, 0.85); font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                ${greeting},
              </p>
              <p style="color: rgba(255, 255, 255, 0.7); font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Great news! Your NetPad account has been approved and you now have full access to the platform.
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #00ED64 0%, #00CC55 100%); color: #001E2B; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">
                      Get Started
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: rgba(255, 255, 255, 0.7); font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                With NetPad, you can:
              </p>
              <ul style="color: rgba(255, 255, 255, 0.7); font-size: 15px; line-height: 1.8; margin: 0 0 24px; padding-left: 20px;">
                <li>Build forms connected directly to MongoDB</li>
                <li>Create automated workflows</li>
                <li>Use AI to generate forms and extract data</li>
                <li>Deploy apps to production with one click</li>
              </ul>

              <p style="color: rgba(255, 255, 255, 0.5); font-size: 14px; line-height: 1.6; margin: 0;">
                Need help getting started? Check out our documentation or reach out to our team.
              </p>
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
${greeting},

Great news! Your NetPad account has been approved and you now have full access to the platform.

Get started here: ${loginUrl}

With NetPad, you can:
- Build forms connected directly to MongoDB
- Create automated workflows
- Use AI to generate forms and extract data
- Deploy apps to production with one click

Need help getting started? Check out our documentation or reach out to our team.

--
NetPad
`;

  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject: "You're approved! Welcome to NetPad",
      text,
      html,
    });

    if (process.env.NODE_ENV !== 'production' && !EMAIL_CONFIG.auth.user) {
      console.log('\n📧 Waitlist Approval Email (Dev Mode)');
      console.log('To:', to);
      console.log('Name:', name || '(not provided)');
      console.log('Login URL:', loginUrl);
      console.log('');
    }

    return true;
  } catch (error) {
    console.error('Failed to send waitlist approval email:', error);
    return false;
  }
}

/**
 * Send rejection email when user is rejected from waitlist
 */
export async function sendWaitlistRejectionEmail(
  to: string,
  name?: string,
  reason?: string
): Promise<boolean> {
  const greeting = name ? `Hi ${name}` : 'Hi there';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Update on your NetPad application</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #001E2B;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #001E2B; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #0a2633; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
              <div style="display: inline-block; background: linear-gradient(135deg, #00ED64 0%, #00CC55 100%); padding: 12px 20px; border-radius: 8px; margin-bottom: 16px;">
                <span style="color: #001E2B; font-size: 20px; font-weight: 700;">NetPad</span>
              </div>
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0;">Update on your application</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: rgba(255, 255, 255, 0.85); font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                ${greeting},
              </p>
              <p style="color: rgba(255, 255, 255, 0.7); font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Thank you for your interest in NetPad. After reviewing your application, we're unable to grant access at this time.
              </p>
              ${reason ? `
              <div style="background: rgba(255, 255, 255, 0.05); border-left: 3px solid rgba(255, 255, 255, 0.3); padding: 16px; margin: 0 0 24px;">
                <p style="color: rgba(255, 255, 255, 0.6); font-size: 14px; line-height: 1.6; margin: 0;">
                  ${reason}
                </p>
              </div>
              ` : ''}
              <p style="color: rgba(255, 255, 255, 0.5); font-size: 14px; line-height: 1.6; margin: 0;">
                If you have any questions, please reach out to our support team.
              </p>
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
${greeting},

Thank you for your interest in NetPad. After reviewing your application, we're unable to grant access at this time.

${reason ? `Reason: ${reason}\n` : ''}
If you have any questions, please reach out to our support team.

--
NetPad
`;

  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject: 'Update on your NetPad application',
      text,
      html,
    });

    if (process.env.NODE_ENV !== 'production' && !EMAIL_CONFIG.auth.user) {
      console.log('\n📧 Waitlist Rejection Email (Dev Mode)');
      console.log('To:', to);
      console.log('Name:', name || '(not provided)');
      console.log('Reason:', reason || '(none provided)');
      console.log('');
    }

    return true;
  } catch (error) {
    console.error('Failed to send waitlist rejection email:', error);
    return false;
  }
}
