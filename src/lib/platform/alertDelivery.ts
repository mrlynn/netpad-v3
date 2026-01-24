/**
 * Alert Delivery Service
 *
 * Handles sending alerts through various channels (email, webhook, slack)
 */

import { createTransport } from 'nodemailer';
import { AlertRule, AlertMetric } from '@/types/observability';

/**
 * Get SMTP transporter
 */
function getTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error('SMTP not configured');
  }

  return createTransport({
    host: smtpHost,
    port: parseInt(smtpPort || '587', 10),
    secure: smtpPort === '465',
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

/**
 * Get metric display name
 */
function getMetricDisplayName(metric: AlertMetric): string {
  const names: Record<AlertMetric, string> = {
    error_rate: 'Error Rate',
    error_count_5m: 'Error Count (5 min)',
    error_count_1h: 'Error Count (1 hour)',
    api_latency_avg: 'API Latency (Avg)',
    api_latency_p95: 'API Latency (P95)',
    api_latency_p99: 'API Latency (P99)',
    ai_cost_daily: 'Daily AI Cost',
    ai_cost_hourly: 'Hourly AI Cost',
    ai_error_rate: 'AI Error Rate',
    ai_latency_avg: 'AI Latency (Avg)',
    database_latency: 'Database Latency',
    failed_logins_5m: 'Failed Logins (5 min)',
    failed_logins_1h: 'Failed Logins (1 hour)',
    submission_failure_rate: 'Form Submission Failure Rate',
    workflow_failure_rate: 'Workflow Failure Rate',
    cluster_inactive_count: 'Inactive Clusters',
    memory_usage_percent: 'Memory Usage',
  };
  return names[metric] || metric;
}

/**
 * Get metric unit
 */
function getMetricUnit(metric: AlertMetric): string {
  if (metric.includes('latency')) return 'ms';
  if (metric.includes('rate')) return '%';
  if (metric.includes('cost')) return '$';
  return '';
}

/**
 * Get severity color
 */
function getSeverityColor(metricValue: number, threshold: number): string {
  const ratio = metricValue / threshold;
  if (ratio >= 2) return '#d32f2f'; // Critical red
  if (ratio >= 1.5) return '#f44336'; // Red
  if (ratio >= 1) return '#FF9800'; // Orange
  return '#00ED64'; // Green
}

/**
 * Generate branded HTML email template for alerts
 */
function generateAlertEmailHTML(params: {
  rule: AlertRule;
  metricValue: number;
  triggeredAt: Date;
}): string {
  const { rule, metricValue, triggeredAt } = params;
  const threshold = rule.condition.value;
  const severityColor = getSeverityColor(metricValue, threshold);
  const metricUnit = getMetricUnit(rule.metric);
  const metricDisplayName = getMetricDisplayName(rule.metric);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NetPad Alert: ${rule.name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="padding: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #0a0a0a 100%); border-radius: 16px 16px 0 0; border: 1px solid #333;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <img src="https://netpad.io/logo.png" alt="NetPad" width="120" style="display: block;">
                  </td>
                  <td align="right">
                    <span style="background-color: ${severityColor}; color: #fff; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                      🚨 Alert Triggered
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px; background-color: #111; border-left: 1px solid #333; border-right: 1px solid #333;">

              <!-- Alert Title -->
              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #fff;">
                ${rule.name}
              </h1>

              ${rule.description ? `<p style="margin: 0 0 24px 0; font-size: 14px; color: #888;">${rule.description}</p>` : ''}

              <!-- Metric Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #1a1a1a; border-radius: 12px; border: 1px solid #333; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50%" style="vertical-align: top;">
                          <p style="margin: 0 0 4px 0; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">
                            Current Value
                          </p>
                          <p style="margin: 0; font-size: 36px; font-weight: 700; color: ${severityColor};">
                            ${metricValue.toLocaleString()}${metricUnit}
                          </p>
                        </td>
                        <td width="50%" style="vertical-align: top; text-align: right;">
                          <p style="margin: 0 0 4px 0; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">
                            Threshold
                          </p>
                          <p style="margin: 0; font-size: 36px; font-weight: 700; color: #fff;">
                            ${threshold.toLocaleString()}${metricUnit}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Details -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #333;">
                    <span style="color: #888; font-size: 13px;">Metric</span>
                    <span style="float: right; color: #fff; font-size: 13px; font-weight: 500;">${metricDisplayName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #333;">
                    <span style="color: #888; font-size: 13px;">Condition</span>
                    <span style="float: right; color: #fff; font-size: 13px; font-weight: 500;">${rule.condition.operator} ${threshold}${metricUnit}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #333;">
                    <span style="color: #888; font-size: 13px;">Triggered At</span>
                    <span style="float: right; color: #fff; font-size: 13px; font-weight: 500;">${triggeredAt.toLocaleString()}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="color: #888; font-size: 13px;">Rule ID</span>
                    <span style="float: right; color: #888; font-size: 12px; font-family: monospace;">${rule.ruleId}</span>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://netpad.io'}/admin/alerts"
                       style="display: inline-block; background: linear-gradient(135deg, #00ED64 0%, #00C853 100%); color: #000; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
                      View in Admin Console →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #0a0a0a; border-radius: 0 0 16px 16px; border: 1px solid #333; border-top: none;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-size: 12px; color: #666;">
                    This alert was sent by NetPad's monitoring system.
                    <br>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://netpad.io'}/admin/alerts/rules" style="color: #888; text-decoration: underline;">
                      Manage alert rules
                    </a>
                  </td>
                  <td align="right" style="font-size: 12px; color: #666;">
                    © ${new Date().getFullYear()} NetPad
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Generate plain text email content
 */
function generateAlertEmailText(params: {
  rule: AlertRule;
  metricValue: number;
  triggeredAt: Date;
}): string {
  const { rule, metricValue, triggeredAt } = params;
  const threshold = rule.condition.value;
  const metricUnit = getMetricUnit(rule.metric);
  const metricDisplayName = getMetricDisplayName(rule.metric);

  return `
🚨 NETPAD ALERT: ${rule.name}

${rule.description || ''}

METRIC: ${metricDisplayName}
CURRENT VALUE: ${metricValue}${metricUnit}
THRESHOLD: ${threshold}${metricUnit}
CONDITION: ${rule.condition.operator} ${threshold}${metricUnit}
TRIGGERED AT: ${triggeredAt.toLocaleString()}

View in Admin Console: ${process.env.NEXT_PUBLIC_APP_URL || 'https://netpad.io'}/admin/alerts

---
Rule ID: ${rule.ruleId}
This alert was sent by NetPad's monitoring system.
  `.trim();
}

/**
 * Send alert email
 */
export async function sendAlertEmail(params: {
  recipients: string[];
  rule: AlertRule;
  metricValue: number;
}): Promise<void> {
  const { recipients, rule, metricValue } = params;
  const triggeredAt = new Date();

  const transporter = getTransporter();
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from: `"NetPad Alerts" <${fromEmail}>`,
    to: recipients.join(', '),
    subject: `🚨 Alert: ${rule.name} - ${getMetricDisplayName(rule.metric)} threshold exceeded`,
    text: generateAlertEmailText({ rule, metricValue, triggeredAt }),
    html: generateAlertEmailHTML({ rule, metricValue, triggeredAt }),
  });
}

/**
 * Send webhook alert with retry
 */
export async function sendWebhookAlert(params: {
  url: string;
  headers?: Record<string, string>;
  rule: AlertRule;
  metricValue: number;
  maxRetries?: number;
}): Promise<void> {
  const { url, headers = {}, rule, metricValue, maxRetries = 3 } = params;

  const payload = {
    type: 'alert',
    timestamp: new Date().toISOString(),
    alert: {
      ruleId: rule.ruleId,
      ruleName: rule.name,
      description: rule.description,
      metric: rule.metric,
      condition: rule.condition,
      threshold: rule.condition.value,
      currentValue: metricValue,
    },
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NetPad-Alert': 'true',
          ...headers,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return;
      }

      lastError = new Error(`Webhook returned ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
    }

    // Exponential backoff
    if (attempt < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  throw lastError || new Error('Failed to send webhook after retries');
}
