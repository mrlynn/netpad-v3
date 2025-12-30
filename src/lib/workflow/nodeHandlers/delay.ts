/**
 * Delay Node Handler
 *
 * Pauses workflow execution for a specified duration.
 * Useful for rate limiting, waiting for external processes, or scheduling.
 *
 * Config:
 * - duration: number - Duration to wait in milliseconds
 * - unit: 'ms' | 'seconds' | 'minutes' | 'hours' - Time unit (optional, defaults to 'ms')
 */

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
  type: 'delay',
  name: 'Delay',
  description: 'Pause workflow execution for a specified duration',
  version: '1.0.0',
};

interface DelayConfig {
  duration: number;
  unit?: 'ms' | 'seconds' | 'minutes' | 'hours';
}

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();
  const config = context.resolvedConfig as unknown as DelayConfig;

  // Validate duration
  if (config.duration === undefined || config.duration === null) {
    return failureResult(
      NodeErrorCodes.INVALID_CONFIG,
      'duration is required',
      false
    );
  }

  const duration = Number(config.duration);
  if (isNaN(duration) || duration < 0) {
    return failureResult(
      NodeErrorCodes.INVALID_CONFIG,
      `Invalid duration: ${config.duration}`,
      false
    );
  }

  // Convert to milliseconds based on unit
  let delayMs = duration;
  const unit = config.unit || 'ms';

  switch (unit) {
    case 'seconds':
      delayMs = duration * 1000;
      break;
    case 'minutes':
      delayMs = duration * 60 * 1000;
      break;
    case 'hours':
      delayMs = duration * 60 * 60 * 1000;
      break;
    case 'ms':
    default:
      delayMs = duration;
      break;
  }

  // Cap maximum delay to prevent abuse (10 minutes max)
  const maxDelayMs = 10 * 60 * 1000;
  if (delayMs > maxDelayMs) {
    await context.log('warn', `Delay capped at maximum (${maxDelayMs}ms)`, {
      requested: delayMs,
      capped: maxDelayMs,
    });
    delayMs = maxDelayMs;
  }

  await context.log('info', `Starting delay for ${delayMs}ms`, {
    duration: config.duration,
    unit,
    delayMs,
  });

  // Perform the delay
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  const actualDuration = Date.now() - startTime;

  await context.log('info', 'Delay completed', {
    requestedMs: delayMs,
    actualMs: actualDuration,
  });

  // Pass through any inputs to output
  return successResult(
    {
      delayed: true,
      requestedMs: delayMs,
      actualMs: actualDuration,
      ...context.inputs,
    },
    {
      durationMs: actualDuration,
    }
  );
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
