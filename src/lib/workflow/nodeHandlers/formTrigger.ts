/**
 * Form Trigger Node Handler
 *
 * Extracts form submission data from the trigger payload.
 * This is typically the first node in a workflow triggered by form submission.
 *
 * Input: trigger.payload from form submission
 * Output: { data, formId, formName, submissionId, submittedAt }
 */

import { registerHandler } from './registry';
import {
  ExtendedNodeContext,
  NodeHandler,
  HandlerMetadata,
  successResult,
} from './types';

const metadata: HandlerMetadata = {
  type: 'form-trigger',
  name: 'Form Trigger',
  description: 'Starts workflow when a form is submitted',
  version: '1.0.0',
};

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Processing form trigger', {
    nodeId: context.nodeId,
    triggerType: context.trigger.type,
  });

  const { trigger, resolvedConfig } = context;

  // Validate this is a form submission trigger
  if (trigger.type !== 'form_submission') {
    await context.log('warn', `Unexpected trigger type: ${trigger.type}`, {
      expected: 'form_submission',
      received: trigger.type,
    });
  }

  const payload = trigger.payload || {};

  // Extract form submission data
  const formData = payload.data || {};
  const formId = resolvedConfig.formId || payload.formId || '';
  const formName = payload.formName || '';
  const submissionId = payload.submissionId || '';
  const submittedAt = payload.submittedAt || new Date().toISOString();

  // Validate we have data to work with
  if (!formData || Object.keys(formData).length === 0) {
    await context.log('warn', 'Form trigger received empty data', { payload });
  }

  const outputData = {
    data: formData,
    formId,
    formName,
    submissionId,
    submittedAt,
    // Include full payload for advanced use cases
    _rawPayload: payload,
  };

  await context.log('info', 'Form trigger processed successfully', {
    formId,
    formName,
    submissionId,
    fieldCount: Object.keys(formData).length,
  });

  return successResult(outputData, {
    durationMs: Date.now() - startTime,
  });
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
