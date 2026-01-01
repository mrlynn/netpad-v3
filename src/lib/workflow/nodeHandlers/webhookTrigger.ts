/**
 * Webhook Trigger Node Handler
 *
 * Handles workflows triggered by incoming webhooks.
 * The actual webhook endpoint is managed by the API route,
 * this handler processes the incoming webhook data.
 *
 * Config:
 *   - webhookPath: Custom path suffix for the webhook URL (optional)
 *   - secret: Secret key for webhook signature verification (optional)
 *   - responseMode: 'immediate' | 'on_complete' - when to respond
 *   - responseCode: HTTP status code to return (default 200)
 *   - responseBody: Custom response body (optional)
 *
 * Input: Webhook payload from API route
 * Output: { method, headers, query, body, path, timestamp, verified }
 */

import { registerHandler } from './registry';
import {
  ExtendedNodeContext,
  NodeHandler,
  HandlerMetadata,
  successResult,
} from './types';

const metadata: HandlerMetadata = {
  type: 'webhook-trigger',
  name: 'Webhook Trigger',
  description: 'Starts workflow when a webhook is received',
  version: '1.0.0',
};

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Processing webhook trigger', {
    nodeId: context.nodeId,
    triggerType: context.trigger.type,
  });

  const { trigger, resolvedConfig } = context;

  // Validate this is a webhook trigger
  if (trigger.type !== 'webhook') {
    await context.log('warn', `Unexpected trigger type: ${trigger.type}`, {
      expected: 'webhook',
      received: trigger.type,
    });
  }

  const payload = trigger.payload || {};

  // Extract webhook data from payload
  const method = (payload.method as string) || 'POST';
  const headers = (payload.headers as Record<string, string>) || {};
  const query = (payload.query as Record<string, unknown>) || {};
  const body = payload.body || {};
  const path = (payload.path as string) || '';
  const rawBody = payload.rawBody as string | undefined;

  // Verify webhook signature if secret is configured
  const secret = resolvedConfig.secret as string | undefined;
  let verified = true;
  let signatureError: string | undefined;

  if (secret && rawBody) {
    const signature = headers['x-webhook-signature'] ||
                     headers['x-hub-signature-256'] ||
                     headers['x-signature'];

    if (signature) {
      // Verify HMAC signature
      verified = await verifySignature(rawBody, signature, secret);
      if (!verified) {
        signatureError = 'Invalid webhook signature';
        await context.log('warn', 'Webhook signature verification failed', {
          signatureHeader: Object.keys(headers).find(h => h.toLowerCase().includes('signature')),
        });
      }
    } else {
      // Secret configured but no signature provided
      verified = false;
      signatureError = 'Missing webhook signature';
      await context.log('warn', 'Webhook signature expected but not provided');
    }
  }

  const outputData = {
    method,
    headers,
    query,
    body,
    path,
    timestamp: new Date().toISOString(),
    verified,
    signatureError,
    // Include source info for auditing
    source: {
      ip: payload.sourceIp as string | undefined,
      userAgent: payload.userAgent as string | undefined,
    },
    // Pass through full payload for advanced use cases
    _rawPayload: payload,
  };

  await context.log('info', 'Webhook trigger processed successfully', {
    method,
    path,
    verified,
    bodyKeys: typeof body === 'object' && body ? Object.keys(body) : [],
    queryKeys: Object.keys(query),
  });

  return successResult(outputData, {
    durationMs: Date.now() - startTime,
    bytesProcessed: rawBody?.length || JSON.stringify(body).length,
  });
};

/**
 * Verify HMAC signature
 */
async function verifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Import crypto for Node.js environment
    const crypto = await import('crypto');

    // Handle different signature formats
    let algorithm = 'sha256';
    let providedSignature = signature;

    // GitHub style: sha256=xxxx
    if (signature.startsWith('sha256=')) {
      algorithm = 'sha256';
      providedSignature = signature.substring(7);
    } else if (signature.startsWith('sha1=')) {
      algorithm = 'sha1';
      providedSignature = signature.substring(5);
    }

    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(payload, 'utf8');
    const expectedSignature = hmac.digest('hex');

    // Timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(providedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
