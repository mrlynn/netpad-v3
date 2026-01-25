/**
 * Validation utilities for Form Reactions
 *
 * Validates request bodies for reaction CRUD and execution endpoints.
 */

import type { FieldEvent } from '@/types/reactions';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Valid field events
 */
const VALID_FIELD_EVENTS: FieldEvent[] = ['change', 'blur', 'focus', 'validate', 'clear'];

/**
 * Validate request body for creating a new reaction.
 */
export function validateCreateReaction(body: unknown): ValidationResult {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be an object'] };
  }

  const data = body as Record<string, unknown>;

  // name is required
  if (!data.name || typeof data.name !== 'string') {
    errors.push('name is required and must be a string');
  } else if (data.name.length > 100) {
    errors.push('name must be 100 characters or less');
  } else if (data.name.trim().length === 0) {
    errors.push('name cannot be empty');
  }

  // workflowId is required
  if (!data.workflowId || typeof data.workflowId !== 'string') {
    errors.push('workflowId is required and must be a string');
  }

  // Validate trigger config if provided
  if (data.trigger !== undefined) {
    if (typeof data.trigger !== 'object' || data.trigger === null) {
      errors.push('trigger must be an object');
    } else {
      const trigger = data.trigger as Record<string, unknown>;

      // Validate fields array
      if (trigger.fields !== undefined) {
        if (!Array.isArray(trigger.fields)) {
          errors.push('trigger.fields must be an array');
        } else if (!trigger.fields.every((f) => typeof f === 'string')) {
          errors.push('trigger.fields must contain only strings');
        }
      }

      // Validate event
      if (trigger.event !== undefined) {
        if (
          typeof trigger.event !== 'string' ||
          !VALID_FIELD_EVENTS.includes(trigger.event as FieldEvent)
        ) {
          errors.push(`trigger.event must be one of: ${VALID_FIELD_EVENTS.join(', ')}`);
        }
      }

      // Validate debounceMs
      if (trigger.debounceMs !== undefined) {
        const ms = trigger.debounceMs;
        if (typeof ms !== 'number' || ms < 0 || ms > 30000 || !Number.isInteger(ms)) {
          errors.push('trigger.debounceMs must be an integer between 0 and 30000');
        }
      }

      // Validate condition
      if (trigger.condition !== undefined) {
        if (typeof trigger.condition !== 'object' || trigger.condition === null) {
          errors.push('trigger.condition must be an object');
        } else {
          const condition = trigger.condition as Record<string, unknown>;
          if (!condition.expression || typeof condition.expression !== 'string') {
            errors.push('trigger.condition.expression must be a non-empty string');
          }
        }
      }
    }
  }

  // Validate execution config if provided
  if (data.execution !== undefined) {
    if (typeof data.execution !== 'object' || data.execution === null) {
      errors.push('execution must be an object');
    } else {
      const execution = data.execution as Record<string, unknown>;

      // Validate mode
      if (execution.mode !== undefined) {
        if (!['sync', 'async', 'auto'].includes(execution.mode as string)) {
          errors.push('execution.mode must be one of: sync, async, auto');
        }
      }

      // Validate timeoutMs
      if (execution.timeoutMs !== undefined) {
        const ms = execution.timeoutMs;
        if (typeof ms !== 'number' || ms < 1000 || ms > 30000 || !Number.isInteger(ms)) {
          errors.push('execution.timeoutMs must be an integer between 1000 and 30000');
        }
      }
    }
  }

  // Validate feedback config if provided
  if (data.feedback !== undefined) {
    if (typeof data.feedback !== 'object' || data.feedback === null) {
      errors.push('feedback must be an object');
    } else {
      const feedback = data.feedback as Record<string, unknown>;

      // Validate loadingStyle
      if (
        feedback.loadingStyle !== undefined &&
        !['field', 'overlay', 'subtle'].includes(feedback.loadingStyle as string)
      ) {
        errors.push('feedback.loadingStyle must be one of: field, overlay, subtle');
      }

      // Validate errorStyle
      if (
        feedback.errorStyle !== undefined &&
        !['toast', 'inline', 'modal'].includes(feedback.errorStyle as string)
      ) {
        errors.push('feedback.errorStyle must be one of: toast, inline, modal');
      }

      // Validate durations
      if (feedback.successDuration !== undefined) {
        if (typeof feedback.successDuration !== 'number' || feedback.successDuration < 0) {
          errors.push('feedback.successDuration must be a non-negative number');
        }
      }

      if (feedback.highlightDuration !== undefined) {
        if (typeof feedback.highlightDuration !== 'number' || feedback.highlightDuration < 0) {
          errors.push('feedback.highlightDuration must be a non-negative number');
        }
      }
    }
  }

  // Validate enabled if provided
  if (data.enabled !== undefined && typeof data.enabled !== 'boolean') {
    errors.push('enabled must be a boolean');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate request body for updating a reaction.
 * Same validation as create, but all fields are optional.
 */
export function validateUpdateReaction(body: unknown): ValidationResult {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be an object'] };
  }

  const data = body as Record<string, unknown>;

  // At least one field should be provided for update
  const updateableFields = [
    'name',
    'description',
    'workflowId',
    'trigger',
    'execution',
    'feedback',
    'enabled',
  ];
  const hasUpdateField = updateableFields.some((field) => field in data);

  if (!hasUpdateField) {
    errors.push('At least one field must be provided for update');
  }

  // name validation (if provided)
  if (data.name !== undefined) {
    if (typeof data.name !== 'string') {
      errors.push('name must be a string');
    } else if (data.name.length > 100) {
      errors.push('name must be 100 characters or less');
    } else if (data.name.trim().length === 0) {
      errors.push('name cannot be empty');
    }
  }

  // workflowId validation (if provided)
  if (data.workflowId !== undefined && typeof data.workflowId !== 'string') {
    errors.push('workflowId must be a string');
  }

  // Reuse the same validation logic for trigger, execution, feedback
  // by calling validateCreateReaction and filtering relevant errors
  const createResult = validateCreateReaction({
    name: 'placeholder',
    workflowId: 'placeholder',
    ...data,
  });

  // Add errors that aren't about missing required fields
  for (const error of createResult.errors) {
    if (
      !error.includes('is required') &&
      !error.includes('cannot be empty') &&
      error !== 'name must be 100 characters or less'
    ) {
      if (!errors.includes(error)) {
        errors.push(error);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate request body for executing a reaction.
 */
export function validateExecuteReaction(body: unknown): ValidationResult {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be an object'] };
  }

  const data = body as Record<string, unknown>;

  // reactionId is required
  if (!data.reactionId || typeof data.reactionId !== 'string') {
    errors.push('reactionId is required and must be a string');
  }

  // triggerField is required
  if (!data.triggerField || typeof data.triggerField !== 'string') {
    errors.push('triggerField is required and must be a string');
  }

  // triggerEvent is required and must be valid
  if (!data.triggerEvent || typeof data.triggerEvent !== 'string') {
    errors.push('triggerEvent is required and must be a string');
  } else if (!VALID_FIELD_EVENTS.includes(data.triggerEvent as FieldEvent)) {
    errors.push(`triggerEvent must be one of: ${VALID_FIELD_EVENTS.join(', ')}`);
  }

  // formData is required and must be an object
  if (data.formData === undefined || data.formData === null) {
    errors.push('formData is required');
  } else if (typeof data.formData !== 'object' || Array.isArray(data.formData)) {
    errors.push('formData must be an object');
  }

  // Validate executionMode if provided
  if (data.executionMode !== undefined) {
    if (!['sync', 'async'].includes(data.executionMode as string)) {
      errors.push('executionMode must be one of: sync, async');
    }
  }

  // Validate payload size (1MB limit)
  try {
    const bodySize = JSON.stringify(data).length;
    if (bodySize > 1_000_000) {
      errors.push('Request payload exceeds 1MB limit');
    }
  } catch {
    errors.push('Request body contains non-serializable data');
  }

  return { valid: errors.length === 0, errors };
}
