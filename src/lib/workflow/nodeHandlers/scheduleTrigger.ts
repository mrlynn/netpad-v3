/**
 * Schedule Trigger Node Handler
 *
 * Handles workflows triggered by scheduled/cron jobs.
 * The actual scheduling is managed by an external cron job,
 * this handler processes the scheduled trigger execution.
 *
 * Config:
 *   - schedule: Cron expression (e.g., '0 9 * * 1-5' for weekdays at 9am)
 *   - timezone: Timezone for schedule (default: UTC)
 *   - payload: Static payload to pass to workflow (optional)
 *
 * Input: Trigger payload from cron job
 * Output: { scheduledAt, executedAt, timezone, cronExpression, payload }
 */

import { registerHandler } from './registry';
import {
  ExtendedNodeContext,
  NodeHandler,
  HandlerMetadata,
  successResult,
} from './types';

const metadata: HandlerMetadata = {
  type: 'schedule-trigger',
  name: 'Schedule Trigger',
  description: 'Starts workflow on a schedule (cron)',
  version: '1.0.0',
};

/**
 * Parse cron expression to human-readable description
 */
function describeCronExpression(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length < 5) return cron;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Simple common patterns
  if (minute === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Every hour';
  }
  if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Every minute';
  }
  if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Every day at midnight';
  }
  if (minute === '0' && hour === '9' && dayOfMonth === '*' && month === '*' && dayOfWeek === '1-5') {
    return 'Weekdays at 9:00 AM';
  }
  if (dayOfWeek === '0' || dayOfWeek === '7') {
    return `Every Sunday at ${hour}:${minute.padStart(2, '0')}`;
  }
  if (dayOfWeek === '1') {
    return `Every Monday at ${hour}:${minute.padStart(2, '0')}`;
  }

  return cron;
}

/**
 * Calculate next scheduled run from cron expression
 * Simple implementation - for production, use a proper cron library
 */
function getNextScheduledRun(cron: string, timezone: string): Date {
  // For now, just return a placeholder
  // In production, use a library like 'cron-parser' or 'node-cron'
  const now = new Date();
  return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
}

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Processing schedule trigger', {
    nodeId: context.nodeId,
    triggerType: context.trigger.type,
  });

  const { trigger, resolvedConfig } = context;

  // Validate this is a schedule trigger
  if (trigger.type !== 'schedule') {
    await context.log('warn', `Unexpected trigger type: ${trigger.type}`, {
      expected: 'schedule',
      received: trigger.type,
    });
  }

  const payload = trigger.payload || {};

  // Extract configuration
  const schedule = (resolvedConfig.schedule as string) || payload.schedule as string || '* * * * *';
  const timezone = (resolvedConfig.timezone as string) || payload.timezone as string || 'UTC';
  const staticPayload = (resolvedConfig.payload as Record<string, unknown>) || {};

  // Get execution metadata from trigger
  const scheduledAt = (payload.scheduledAt as string) || new Date().toISOString();
  const executedAt = new Date().toISOString();
  const iteration = (payload.iteration as number) || 1;

  const scheduleDescription = describeCronExpression(schedule);
  const nextRun = getNextScheduledRun(schedule, timezone);

  await context.log('info', `Schedule: ${scheduleDescription}`, {
    cronExpression: schedule,
    timezone,
    iteration,
  });

  const outputData = {
    // Schedule information
    schedule: {
      cronExpression: schedule,
      timezone,
      description: scheduleDescription,
    },
    // Timing
    scheduledAt,
    executedAt,
    nextScheduledAt: nextRun.toISOString(),
    // Execution metadata
    execution: {
      iteration,
      isFirstRun: iteration === 1,
    },
    // Pass through any payload data
    payload: {
      ...staticPayload,
      ...payload,
    },
    // Computed values
    dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: timezone }),
    hour: new Date().toLocaleTimeString('en-US', { hour: '2-digit', hour12: false, timeZone: timezone }),
    date: new Date().toLocaleDateString('en-US', { timeZone: timezone }),
  };

  await context.log('info', 'Schedule trigger processed successfully', {
    scheduleDescription,
    iteration,
    nextRun: nextRun.toISOString(),
  });

  return successResult(outputData, {
    durationMs: Date.now() - startTime,
  });
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
