/**
 * Field Event Trigger Node Handler
 *
 * Starts a workflow when a form field event occurs (change, blur, etc.).
 * This is the entry point node for Form Reactions.
 *
 * Input: trigger.payload from form reaction execution
 * Output: { triggerField, triggerEvent, fieldValue, formData, formId, reactionId }
 */

import { registerHandler } from './registry';
import {
  ExtendedNodeContext,
  NodeHandler,
  HandlerMetadata,
  successResult,
} from './types';

const metadata: HandlerMetadata = {
  type: 'field-event-trigger',
  name: 'Field Event Trigger',
  description: 'Starts workflow when a form field event occurs (change, blur, etc.)',
  version: '1.0.0',
};

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Processing field event trigger', {
    nodeId: context.nodeId,
    triggerType: context.trigger.type,
  });

  const { trigger } = context;
  const payload = trigger.payload || {};

  // Validate this is a field event trigger
  if (trigger.type !== 'field_event') {
    await context.log('warn', `Unexpected trigger type: ${trigger.type}`, {
      expected: 'field_event',
      received: trigger.type,
    });
  }

  // Extract reaction context from trigger payload
  const triggerField = payload.triggerField || '';
  const triggerEvent = payload.triggerEvent || 'change';
  const fieldValue = payload.fieldValue;
  const formData = payload.formData || {};
  const formId = payload.formId || '';
  const reactionId = payload.reactionId || '';

  // Validate we have the necessary data
  if (!triggerField) {
    await context.log('warn', 'Field event trigger received without triggerField', {
      payload,
    });
  }

  if (!formData || Object.keys(formData).length === 0) {
    await context.log('warn', 'Field event trigger received empty formData', {
      payload,
    });
  }

  const outputData = {
    // Core trigger info
    triggerField,
    triggerEvent,
    fieldValue,

    // Form context
    formData,
    formId,
    reactionId,

    // Convenience: expose the trigger field value at the top level
    // so downstream nodes can reference it easily
    value: fieldValue,

    // Include full payload for advanced use cases
    _rawPayload: payload,
  };

  await context.log('info', 'Field event trigger processed successfully', {
    formId,
    reactionId,
    triggerField,
    triggerEvent,
    fieldCount: Object.keys(formData).length,
  });

  return successResult(outputData, {
    durationMs: Date.now() - startTime,
  });
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
