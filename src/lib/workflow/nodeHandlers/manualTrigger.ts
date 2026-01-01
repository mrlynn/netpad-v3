/**
 * Manual Trigger Node Handler
 *
 * Handles workflows triggered manually by users via the API or UI.
 * Passes through any payload data provided in the trigger.
 *
 * Input: trigger.payload from manual execution
 * Output: { data, triggeredBy, triggeredAt }
 */

import { registerHandler } from './registry';
import {
  ExtendedNodeContext,
  NodeHandler,
  HandlerMetadata,
  successResult,
} from './types';

const metadata: HandlerMetadata = {
  type: 'manual-trigger',
  name: 'Manual Trigger',
  description: 'Starts workflow when manually triggered by a user',
  version: '1.0.0',
};

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Processing manual trigger', {
    nodeId: context.nodeId,
    triggerType: context.trigger.type,
  });

  const { trigger } = context;

  // Validate this is a manual trigger
  if (trigger.type !== 'manual') {
    await context.log('warn', `Unexpected trigger type: ${trigger.type}`, {
      expected: 'manual',
      received: trigger.type,
    });
  }

  const payload = trigger.payload || {};

  // Extract trigger metadata from payload (source info may be passed in payload)
  const source = (payload._source as Record<string, unknown>) || {};
  const triggeredBy = (source.userId as string) || 'unknown';
  const triggeredAt = new Date().toISOString();

  // Remove internal _source from data output
  const { _source, ...data } = payload;

  const outputData = {
    data,
    triggeredBy,
    triggeredAt,
    // Include source info for auditing if available
    source: {
      ip: source.ip as string | undefined,
      userAgent: source.userAgent as string | undefined,
      userId: source.userId as string | undefined,
    },
  };

  await context.log('info', 'Manual trigger processed successfully', {
    triggeredBy,
    payloadKeys: Object.keys(payload),
  });

  return successResult(outputData, {
    durationMs: Date.now() - startTime,
  });
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
