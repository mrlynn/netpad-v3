/**
 * Tests for Reactions Validation
 */
import {
  validateCreateReaction,
  validateUpdateReaction,
  validateExecuteReaction,
} from '@/lib/reactions/validation';

describe('validateCreateReaction', () => {
  const valid = { name: 'Test', workflowId: 'wf_123' };

  it('accepts valid minimal body', () => {
    const result = validateCreateReaction(valid);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects null body', () => {
    expect(validateCreateReaction(null).valid).toBe(false);
  });

  it('rejects non-object body', () => {
    expect(validateCreateReaction('string').valid).toBe(false);
  });

  it('requires name', () => {
    const result = validateCreateReaction({ workflowId: 'wf_123' });
    expect(result.errors.some(e => e.includes('name'))).toBe(true);
  });

  it('requires workflowId', () => {
    const result = validateCreateReaction({ name: 'Test' });
    expect(result.errors.some(e => e.includes('workflowId'))).toBe(true);
  });

  it('rejects name over 100 chars', () => {
    const result = validateCreateReaction({ ...valid, name: 'x'.repeat(101) });
    expect(result.errors.some(e => e.includes('100 characters'))).toBe(true);
  });

  it('rejects whitespace-only name', () => {
    const result = validateCreateReaction({ ...valid, name: '   ' });
    expect(result.errors.some(e => e.includes('empty'))).toBe(true);
  });

  // Trigger validation
  it('rejects non-object trigger', () => {
    const result = validateCreateReaction({ ...valid, trigger: 'bad' });
    expect(result.errors.some(e => e.includes('trigger must be an object'))).toBe(true);
  });

  it('accepts valid trigger', () => {
    const result = validateCreateReaction({
      ...valid,
      trigger: { fields: ['field1'], event: 'change', debounceMs: 500 },
    });
    expect(result.valid).toBe(true);
  });

  it('rejects non-array trigger.fields', () => {
    const result = validateCreateReaction({ ...valid, trigger: { fields: 'bad' } });
    expect(result.errors.some(e => e.includes('trigger.fields must be an array'))).toBe(true);
  });

  it('rejects non-string items in trigger.fields', () => {
    const result = validateCreateReaction({ ...valid, trigger: { fields: [1, 2] } });
    expect(result.errors.some(e => e.includes('strings'))).toBe(true);
  });

  it('rejects invalid trigger.event', () => {
    const result = validateCreateReaction({ ...valid, trigger: { event: 'invalid' } });
    expect(result.errors.some(e => e.includes('trigger.event'))).toBe(true);
  });

  it('accepts all valid trigger events', () => {
    for (const event of ['change', 'blur', 'focus', 'validate', 'clear']) {
      const result = validateCreateReaction({ ...valid, trigger: { event } });
      expect(result.valid).toBe(true);
    }
  });

  it('rejects debounceMs out of range', () => {
    expect(validateCreateReaction({ ...valid, trigger: { debounceMs: -1 } }).valid).toBe(false);
    expect(validateCreateReaction({ ...valid, trigger: { debounceMs: 31000 } }).valid).toBe(false);
    expect(validateCreateReaction({ ...valid, trigger: { debounceMs: 1.5 } }).valid).toBe(false);
  });

  it('rejects invalid trigger.condition', () => {
    const result = validateCreateReaction({ ...valid, trigger: { condition: {} } });
    expect(result.errors.some(e => e.includes('condition.expression'))).toBe(true);
  });

  it('accepts valid trigger.condition', () => {
    const result = validateCreateReaction({
      ...valid,
      trigger: { condition: { expression: 'field1 > 0' } },
    });
    expect(result.valid).toBe(true);
  });

  // Execution validation
  it('rejects invalid execution.mode', () => {
    const result = validateCreateReaction({ ...valid, execution: { mode: 'invalid' } });
    expect(result.errors.some(e => e.includes('execution.mode'))).toBe(true);
  });

  it('accepts valid execution modes', () => {
    for (const mode of ['sync', 'async', 'auto']) {
      expect(validateCreateReaction({ ...valid, execution: { mode } }).valid).toBe(true);
    }
  });

  it('rejects execution.timeoutMs out of range', () => {
    expect(validateCreateReaction({ ...valid, execution: { timeoutMs: 500 } }).valid).toBe(false);
    expect(validateCreateReaction({ ...valid, execution: { timeoutMs: 31000 } }).valid).toBe(false);
  });

  // Feedback validation
  it('rejects invalid feedback.loadingStyle', () => {
    const result = validateCreateReaction({ ...valid, feedback: { loadingStyle: 'bad' } });
    expect(result.valid).toBe(false);
  });

  it('accepts valid feedback.loadingStyle', () => {
    for (const style of ['field', 'overlay', 'subtle']) {
      expect(validateCreateReaction({ ...valid, feedback: { loadingStyle: style } }).valid).toBe(true);
    }
  });

  it('rejects invalid feedback.errorStyle', () => {
    expect(validateCreateReaction({ ...valid, feedback: { errorStyle: 'bad' } }).valid).toBe(false);
  });

  it('rejects negative feedback durations', () => {
    expect(validateCreateReaction({ ...valid, feedback: { successDuration: -1 } }).valid).toBe(false);
    expect(validateCreateReaction({ ...valid, feedback: { highlightDuration: -1 } }).valid).toBe(false);
  });

  // Enabled validation
  it('rejects non-boolean enabled', () => {
    expect(validateCreateReaction({ ...valid, enabled: 'yes' }).valid).toBe(false);
  });

  it('accepts boolean enabled', () => {
    expect(validateCreateReaction({ ...valid, enabled: true }).valid).toBe(true);
    expect(validateCreateReaction({ ...valid, enabled: false }).valid).toBe(true);
  });
});

describe('validateUpdateReaction', () => {
  it('accepts valid update with single field', () => {
    expect(validateUpdateReaction({ name: 'Updated' }).valid).toBe(true);
  });

  it('rejects empty update', () => {
    const result = validateUpdateReaction({});
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('At least one field'))).toBe(true);
  });

  it('rejects non-object body', () => {
    expect(validateUpdateReaction(null).valid).toBe(false);
    expect(validateUpdateReaction('string').valid).toBe(false);
  });

  it('allows all fields to be optional', () => {
    expect(validateUpdateReaction({ enabled: false }).valid).toBe(true);
    expect(validateUpdateReaction({ workflowId: 'wf_new' }).valid).toBe(true);
    expect(validateUpdateReaction({ description: 'desc' }).valid).toBe(true);
  });

  it('validates name if provided', () => {
    expect(validateUpdateReaction({ name: '' }).valid).toBe(false);
  });

  it('validates trigger if provided', () => {
    expect(validateUpdateReaction({ trigger: { event: 'invalid' } }).valid).toBe(false);
  });
});

describe('validateExecuteReaction', () => {
  const valid = {
    reactionId: 'r_123',
    triggerField: 'field1',
    triggerEvent: 'change',
    formData: { field1: 'value' },
  };

  it('accepts valid execution body', () => {
    const result = validateExecuteReaction(valid);
    expect(result.valid).toBe(true);
  });

  it('rejects null body', () => {
    expect(validateExecuteReaction(null).valid).toBe(false);
  });

  it('requires reactionId', () => {
    const { reactionId, ...rest } = valid;
    expect(validateExecuteReaction(rest).errors.some(e => e.includes('reactionId'))).toBe(true);
  });

  it('requires triggerField', () => {
    const { triggerField, ...rest } = valid;
    expect(validateExecuteReaction(rest).errors.some(e => e.includes('triggerField'))).toBe(true);
  });

  it('requires triggerEvent', () => {
    const { triggerEvent, ...rest } = valid;
    expect(validateExecuteReaction(rest).errors.some(e => e.includes('triggerEvent'))).toBe(true);
  });

  it('validates triggerEvent values', () => {
    expect(validateExecuteReaction({ ...valid, triggerEvent: 'invalid' }).valid).toBe(false);
  });

  it('requires formData', () => {
    const { formData, ...rest } = valid;
    expect(validateExecuteReaction(rest).errors.some(e => e.includes('formData'))).toBe(true);
  });

  it('rejects array formData', () => {
    expect(validateExecuteReaction({ ...valid, formData: [1, 2] }).valid).toBe(false);
  });

  it('validates executionMode if provided', () => {
    expect(validateExecuteReaction({ ...valid, executionMode: 'sync' }).valid).toBe(true);
    expect(validateExecuteReaction({ ...valid, executionMode: 'async' }).valid).toBe(true);
    expect(validateExecuteReaction({ ...valid, executionMode: 'bad' }).valid).toBe(false);
  });
});
